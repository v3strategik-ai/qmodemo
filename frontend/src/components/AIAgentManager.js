import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Slider } from './ui/slider';
import { Bot, Plus, Edit, Trash2, MessageSquare, Settings, Sparkles } from 'lucide-react';
import { toast } from '../hooks/use-toast';
import axios from 'axios';

const AIAgentManager = ({ currentUser }) => {
  const [agents, setAgents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [chatDialog, setChatDialog] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'custom_agent',
    provider: 'openai',
    model: 'gpt-4o',
    system_prompt: '',
    temperature: 0.7,
    max_tokens: 2000,
    capabilities: []
  });

  const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    if (currentUser) {
      loadAgents();
      loadTemplates();
    }
  }, [currentUser]);

  const loadAgents = async () => {
    try {
      const response = await axios.get(`${API}/api/ai-agents/user/${currentUser.id}`);
      setAgents(response.data);
    } catch (error) {
      console.error('Failed to load AI agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await axios.get(`${API}/api/ai-agents/templates`);
      setTemplates(response.data.templates);
    } catch (error) {
      console.error('Failed to load AI agent templates:', error);
    }
  };

  const handleCreateAgent = async () => {
    try {
      const agentData = {
        ...formData,
        user_id: currentUser.id
      };

      const response = await axios.post(`${API}/api/ai-agents/create`, agentData);
      setAgents([...agents, response.data]);
      setDialogOpen(false);
      resetForm();
      toast.success(`AI Agent "${formData.name}" created successfully!`);
    } catch (error) {
      console.error('Failed to create AI agent:', error);
      toast.error('Failed to create AI agent');
    }
  };

  const handleUpdateAgent = async () => {
    try {
      const response = await axios.put(
        `${API}/api/ai-agents/${selectedAgent.id}`,
        { ...formData, user_id: currentUser.id }
      );
      
      setAgents(agents.map(agent => 
        agent.id === selectedAgent.id ? response.data : agent
      ));
      setDialogOpen(false);
      setSelectedAgent(null);
      resetForm();
      toast.success('AI Agent updated successfully!');
    } catch (error) {
      console.error('Failed to update AI agent:', error);
      toast.error('Failed to update AI agent');
    }
  };

  const handleDeleteAgent = async (agentId) => {
    try {
      await axios.delete(`${API}/api/ai-agents/${agentId}?user_id=${currentUser.id}`);
      setAgents(agents.filter(agent => agent.id !== agentId));
      toast.success('AI Agent deleted successfully!');
    } catch (error) {
      console.error('Failed to delete AI agent:', error);
      toast.error('Failed to delete AI agent');
    }
  };

  const handleChatWithAgent = async (agent) => {
    if (!chatMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      const response = await axios.post(
        `${API}/api/ai-agents/${agent.id}/chat?user_id=${currentUser.id}&message=${encodeURIComponent(chatMessage)}`
      );
      
      setChatResponse(response.data);
      setChatMessage('');
      toast.success('Chat completed successfully!');
    } catch (error) {
      console.error('Failed to chat with AI agent:', error);
      toast.error('Failed to chat with AI agent');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'custom_agent',
      provider: 'openai',
      model: 'gpt-4o',
      system_prompt: '',
      temperature: 0.7,
      max_tokens: 2000,
      capabilities: []
    });
  };

  const openEditDialog = (agent) => {
    setSelectedAgent(agent);
    setFormData({
      name: agent.name,
      type: agent.type,
      provider: agent.provider,
      model: agent.model,
      system_prompt: agent.system_prompt,
      temperature: agent.temperature,
      max_tokens: agent.max_tokens,
      capabilities: agent.capabilities
    });
    setDialogOpen(true);
  };

  const applyTemplate = (template) => {
    setFormData({
      name: template.name,
      type: template.type,
      provider: 'openai',
      model: template.recommended_model,
      system_prompt: template.system_prompt,
      temperature: template.temperature,
      max_tokens: 2000,
      capabilities: template.capabilities
    });
  };

  const getAgentTypeColor = (type) => {
    const colors = {
      sales_agent: 'bg-green-500',
      support_agent: 'bg-blue-500',
      analytics_agent: 'bg-purple-500',
      marketing_agent: 'bg-orange-500',
      custom_agent: 'bg-gray-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-400">Loading AI Agents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">AI Agent Manager</h2>
          <p className="text-gray-400">Create and manage specialized AI agents for different tasks</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Create AI Agent
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[600px] glass neon-border">
            <DialogHeader>
              <DialogTitle className="text-white">
                {selectedAgent ? 'Edit AI Agent' : 'Create New AI Agent'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedAgent ? 'Update your AI agent configuration' : 'Create a specialized AI agent for specific tasks'}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="config" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="config">Configuration</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
              </TabsList>
              
              <TabsContent value="config" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Agent Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g., Sales Assistant Pro"
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300">Agent Type</label>
                      <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sales_agent">Sales Agent</SelectItem>
                          <SelectItem value="support_agent">Support Agent</SelectItem>
                          <SelectItem value="analytics_agent">Analytics Agent</SelectItem>
                          <SelectItem value="marketing_agent">Marketing Agent</SelectItem>
                          <SelectItem value="custom_agent">Custom Agent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-300">Provider</label>
                      <Select value={formData.provider} onValueChange={(value) => setFormData({...formData, provider: value})}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                          <SelectItem value="gemini">Google (Gemini)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-300">Model</label>
                    <Select value={formData.model} onValueChange={(value) => setFormData({...formData, model: value})}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.provider === 'openai' && (
                          <>
                            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                            <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                            <SelectItem value="gpt-5">GPT-5</SelectItem>
                          </>
                        )}
                        {formData.provider === 'anthropic' && (
                          <>
                            <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                            <SelectItem value="claude-4-sonnet-20250514">Claude 4 Sonnet</SelectItem>
                          </>
                        )}
                        {formData.provider === 'gemini' && (
                          <>
                            <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                            <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-300">System Prompt</label>
                    <Textarea
                      value={formData.system_prompt}
                      onChange={(e) => setFormData({...formData, system_prompt: e.target.value})}
                      placeholder="Define the AI agent's personality, role, and behavior..."
                      className="bg-gray-800 border-gray-600 text-white min-h-[100px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      Temperature: {formData.temperature}
                    </label>
                    <Slider
                      value={[formData.temperature]}
                      onValueChange={(value) => setFormData({...formData, temperature: value[0]})}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setDialogOpen(false);
                      setSelectedAgent(null);
                      resetForm();
                    }}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={selectedAgent ? handleUpdateAgent : handleCreateAgent}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    {selectedAgent ? 'Update Agent' : 'Create Agent'}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="templates" className="space-y-4">
                <div className="grid gap-3">
                  {templates.map((template) => (
                    <Card key={template.id} className="glass neon-border cursor-pointer hover:bg-gray-800/50"
                          onClick={() => applyTemplate(template)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-white">{template.name}</h4>
                            <p className="text-sm text-gray-400">{template.description}</p>
                          </div>
                          <Badge className={getAgentTypeColor(template.type)}>
                            {template.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Card key={agent.id} className="glass neon-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-blue-400" />
                  <Badge className={getAgentTypeColor(agent.type)}>
                    {agent.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedAgent(agent);
                      setChatDialog(true);
                      setChatResponse(null);
                    }}
                    className="text-green-400 hover:bg-green-500/20"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditDialog(agent)}
                    className="text-blue-400 hover:bg-blue-500/20"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteAgent(agent.id)}
                    className="text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardTitle className="text-white">{agent.name}</CardTitle>
              <CardDescription className="text-gray-400">
                {agent.provider} • {agent.model}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-300 line-clamp-3">
                  {agent.system_prompt}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Temperature: {agent.temperature}</span>
                  <span>Max tokens: {agent.max_tokens}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chat Dialog */}
      <Dialog open={chatDialog} onOpenChange={setChatDialog}>
        <DialogContent className="sm:max-w-[500px] glass neon-border">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Chat with {selectedAgent?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Test your AI agent with a message
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300">Your Message</label>
              <Textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type your message here..."
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            {chatResponse && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">AI Response</label>
                <div className="p-3 bg-gray-800 rounded-lg border border-gray-600">
                  <p className="text-white whitespace-pre-wrap">{chatResponse.response}</p>
                  <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                    <span>Response time: {chatResponse.response_time_ms}ms</span>
                    <span>{chatResponse.agent_type}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setChatDialog(false);
                  setChatMessage('');
                  setChatResponse(null);
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Close
              </Button>
              <Button 
                onClick={() => handleChatWithAgent(selectedAgent)}
                className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {agents.length === 0 && (
        <Card className="glass neon-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No AI Agents Yet</h3>
            <p className="text-gray-400 text-center mb-6">
              Create your first AI agent to get started with specialized AI assistance.
            </p>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create AI Agent
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIAgentManager;