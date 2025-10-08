import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Brain, Bot, Zap, Star, MessageSquare, Settings, Play, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdvancedAIManager = ({ currentUser }) => {
  const [availableModels, setAvailableModels] = useState({});
  const [aiAgents, setAiAgents] = useState([]);
  const [agentTemplates, setAgentTemplates] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [loading, setLoading] = useState(false);

  // New AI Agent form
  const [newAgentData, setNewAgentData] = useState({
    name: '',
    description: '',
    system_prompt: '',
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 1000
  });

  useEffect(() => {
    if (currentUser) {
      loadAvailableModels();
      loadUserAIAgents();
      loadAgentTemplates();
    }
  }, [currentUser]);

  const loadAvailableModels = async () => {
    try {
      const response = await axios.get(`${API}/ai/models/available`);
      setAvailableModels(response.data.models);
      setSelectedProvider(response.data.default_provider);
      setSelectedModel(response.data.default_model);
    } catch (error) {
      console.error('Failed to load models:', error);
      toast.error('Failed to load AI models');
    }
  };

  const loadUserAIAgents = async () => {
    try {
      const response = await axios.get(`${API}/ai/agents/${currentUser.id}`);
      setAiAgents(response.data.agents);
    } catch (error) {
      console.error('Failed to load AI agents:', error);
    }
  };

  const loadAgentTemplates = async () => {
    try {
      const response = await axios.get(`${API}/ai/agents/templates`);
      setAgentTemplates(response.data.templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleMultiLLMChat = async () => {
    if (!chatMessage.trim()) return;

    try {
      setLoading(true);
      const response = await axios.post(`${API}/ai/chat/multi-llm`, {
        message: chatMessage,
        user_id: currentUser.id,
        provider: selectedProvider,
        model: selectedModel
      });

      setChatResponse(response.data.response);
      setChatMessage('');
    } catch (error) {
      console.error('Multi-LLM chat error:', error);
      toast.error('Failed to get AI response');
    } finally {
      setLoading(false);
    }
  };

  const createAIAgent = async () => {
    try {
      const agentData = {
        ...newAgentData,
        user_id: currentUser.id
      };

      await axios.post(`${API}/ai/agents/create`, agentData);
      
      toast.success('AI Agent created successfully!');
      loadUserAIAgents();
      
      // Reset form
      setNewAgentData({
        name: '',
        description: '',
        system_prompt: '',
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 1000
      });
    } catch (error) {
      console.error('Create agent error:', error);
      toast.error('Failed to create AI agent');
    }
  };

  const createAgentFromTemplate = async (template) => {
    try {
      await axios.post(`${API}/ai/agents/from-template`, {
        user_id: currentUser.id,
        template_name: template.name,
        agent_name: template.name
      });

      toast.success(`${template.name} agent created successfully!`);
      loadUserAIAgents();
    } catch (error) {
      console.error('Create from template error:', error);
      toast.error('Failed to create agent from template');
    }
  };

  const chatWithAgent = async (agent, message) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/ai/agents/${agent.id}/chat`, {
        message: message,
        user_id: currentUser.id
      });

      return response.data.response;
    } catch (error) {
      console.error('Chat with agent error:', error);
      toast.error('Failed to chat with agent');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const ModelSelector = ({ provider, model, onProviderChange, onModelChange }) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm text-gray-400 mb-2 block">Provider</label>
        <Select value={provider} onValueChange={onProviderChange}>
          <SelectTrigger className="glass neon-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass border-gray-700">
            {Object.keys(availableModels).map((providerName) => (
              <SelectItem key={providerName} value={providerName}>
                <div className="flex items-center gap-2 capitalize">
                  <Brain className="w-4 h-4" />
                  {providerName}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm text-gray-400 mb-2 block">Model</label>
        <Select value={model} onValueChange={onModelChange}>
          <SelectTrigger className="glass neon-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass border-gray-700">
            {(availableModels[provider] || []).map((modelName) => (
              <SelectItem key={modelName} value={modelName}>
                {modelName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (!currentUser) {
    return (
      <Card className="glass p-8 text-center">
        <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">Please log in to access AI management features</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Brain className="w-8 h-8 text-blue-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Advanced AI Integration</h2>
          <p className="text-gray-400">Multi-LLM support and custom AI agents</p>
        </div>
      </div>

      <Tabs defaultValue="multi-llm" className="space-y-6">
        <TabsList className="grid grid-cols-3 glass neon-border">
          <TabsTrigger value="multi-llm">Multi-LLM Chat</TabsTrigger>
          <TabsTrigger value="agents">AI Agents</TabsTrigger>
          <TabsTrigger value="templates">Agent Templates</TabsTrigger>
        </TabsList>

        {/* Multi-LLM Chat Tab */}
        <TabsContent value="multi-llm">
          <Card className="glass p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Multi-Provider AI Chat</h3>
            
            <div className="space-y-4">
              <ModelSelector
                provider={selectedProvider}
                model={selectedModel}
                onProviderChange={(provider) => {
                  setSelectedProvider(provider);
                  if (availableModels[provider]?.length > 0) {
                    setSelectedModel(availableModels[provider][0]);
                  }
                }}
                onModelChange={setSelectedModel}
              />

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Message</label>
                <Textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Ask anything..."
                  className="glass neon-border"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleMultiLLMChat}
                disabled={loading || !chatMessage.trim()}
                className="tech-button w-full"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                ) : (
                  <MessageSquare className="w-4 h-4 mr-2" />
                )}
                Send to {selectedProvider} {selectedModel}
              </Button>

              {chatResponse && (
                <div className="mt-4 p-4 bg-black/20 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-blue-400" />
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                      {selectedProvider} • {selectedModel}
                    </Badge>
                  </div>
                  <p className="text-gray-300">{chatResponse}</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* AI Agents Tab */}
        <TabsContent value="agents">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create New Agent */}
            <Card className="glass p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Create Custom Agent</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Agent Name</label>
                  <Input
                    value={newAgentData.name}
                    onChange={(e) => setNewAgentData({...newAgentData, name: e.target.value})}
                    placeholder="My Custom Agent"
                    className="glass neon-border"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Description</label>
                  <Input
                    value={newAgentData.description}
                    onChange={(e) => setNewAgentData({...newAgentData, description: e.target.value})}
                    placeholder="What does this agent do?"
                    className="glass neon-border"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">System Prompt</label>
                  <Textarea
                    value={newAgentData.system_prompt}
                    onChange={(e) => setNewAgentData({...newAgentData, system_prompt: e.target.value})}
                    placeholder="You are a helpful assistant that..."
                    className="glass neon-border"
                    rows={3}
                  />
                </div>

                <ModelSelector
                  provider={newAgentData.provider}
                  model={newAgentData.model}
                  onProviderChange={(provider) => setNewAgentData({...newAgentData, provider})}
                  onModelChange={(model) => setNewAgentData({...newAgentData, model})}
                />

                <Button
                  onClick={createAIAgent}
                  disabled={!newAgentData.name || !newAgentData.system_prompt}
                  className="tech-button w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Agent
                </Button>
              </div>
            </Card>

            {/* User's AI Agents */}
            <Card className="glass p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Your AI Agents</h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {aiAgents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No AI agents created yet</p>
                  </div>
                ) : (
                  aiAgents.map((agent) => (
                    <div key={agent.id} className="p-4 bg-black/20 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-green-400" />
                          <span className="font-medium text-white">{agent.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {agent.provider} • {agent.model}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{agent.description}</p>
                      
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Chat
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="glass">
                            <DialogHeader>
                              <DialogTitle>Chat with {agent.name}</DialogTitle>
                            </DialogHeader>
                            <AgentChatDialog agent={agent} onSendMessage={chatWithAgent} />
                          </DialogContent>
                        </Dialog>
                        
                        {agent.usage_stats?.total_conversations > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {agent.usage_stats.total_conversations} chats
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Agent Templates Tab */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentTemplates.map((template) => (
              <Card key={template.id} className="glass p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <h4 className="font-semibold text-white">{template.name}</h4>
                </div>
                
                <p className="text-sm text-gray-400 mb-4">{template.description}</p>
                
                <div className="space-y-2 mb-4">
                  <Badge variant="outline" className="text-xs">
                    {template.category}
                  </Badge>
                  <div className="text-xs text-gray-500">
                    {template.recommended_provider} • {template.recommended_model}
                  </div>
                </div>
                
                <Button
                  onClick={() => createAgentFromTemplate(template)}
                  size="sm"
                  className="w-full tech-button"
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Create Agent
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Agent Chat Dialog Component
const AgentChatDialog = ({ agent, onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;

    setLoading(true);
    const result = await onSendMessage(agent, message);
    if (result) {
      setResponse(result);
    }
    setMessage('');
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Chat with ${agent.name}...`}
          className="glass neon-border"
          rows={3}
        />
      </div>
      
      <Button
        onClick={handleSend}
        disabled={loading || !message.trim()}
        className="tech-button w-full"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
        ) : (
          <Play className="w-4 h-4 mr-2" />
        )}
        Send Message
      </Button>

      {response && (
        <div className="p-4 bg-black/20 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-white">{agent.name}</span>
          </div>
          <p className="text-gray-300">{response}</p>
        </div>
      )}
    </div>
  );
};

export default AdvancedAIManager;