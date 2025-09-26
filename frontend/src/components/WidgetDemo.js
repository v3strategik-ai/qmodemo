import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { ArrowLeft, Bot, Send, Settings, Upload, Zap, Brain, MessageSquare, FileText, Sparkles, BarChart3, Target, Mic, Volume2, Users } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import OnboardingTour from './OnboardingTour';
import AIResponseRating from './AIResponseRating';
import ConversationStarters from './ConversationStarters';
import VisualAnalyticsDashboard from './VisualAnalyticsDashboard';
import FileUploadZone from './FileUploadZone';
import SmartInsightsPanel from './SmartInsightsPanel';
import ProgressTracker from './ProgressTracker';
import ExportCapabilities from './ExportCapabilities';
import AchievementSystem from './AchievementSystem';
import VoiceInterface from './VoiceInterface';
import useWebSocket from '../hooks/useWebSocket';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WidgetDemo = () => {
  const navigate = useNavigate();
  const { currentUser, register } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Auth state
  const [authMode, setAuthMode] = useState('register');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [currentStreamingId, setCurrentStreamingId] = useState(null);
  const messagesEndRef = useRef(null);
  const voiceInterfaceRef = useRef(null);
  
  // Session and personality state
  const [conversationSessions, setConversationSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [aiPersonalities, setAiPersonalities] = useState({});
  const [selectedPersonality, setSelectedPersonality] = useState('Professional Assistant');
  
  // Config state  
  const [config, setConfig] = useState({
    company_name: '',
    industry: '',
    ai_personality: 'Professional Assistant',
    workflow_automations: [],
    voice_settings: {
      enabled: false,
      voice: 'alloy',
      speech_speed: 1.0,
      auto_play_responses: true
    },
    streaming_enabled: true
  });
  
  // Knowledge base state
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [newKbTitle, setNewKbTitle] = useState('');
  const [newKbContent, setNewKbContent] = useState('');

  // WebSocket connection
  const {
    isConnected: wsConnected,
    isConnecting: wsConnecting,
    sessionId: wsSessionId,
    sendChatMessage,
    sendVoiceTranscription,
    requestTTS,
    addEventListener: addWSListener,
    removeEventListener: removeWSListener
  } = useWebSocket(currentUser?.id);

  useEffect(() => {
    if (currentUser) {
      setIsLoggedIn(true);
      loadChatHistory();
      loadConfig();
      loadKnowledgeBase();
      loadConversationSessions();
      loadAIPersonalities();
      
      // Check if user should see onboarding
      const tourCompleted = localStorage.getItem(`modq_tour_completed_${currentUser.id}`);
      if (!tourCompleted) {
        setShowOnboarding(true);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // WebSocket event listeners
  useEffect(() => {
    if (currentUser && wsConnected) {
      // Handle session establishment
      const handleSessionEstablished = (data) => {
        console.log('Session established:', data);
        setCurrentSessionId(data.session_id);
      };

      // Handle typing indicators
      const handleTypingStart = () => {
        setIsTyping(true);
        setStreamingMessage('');
      };

      // Handle response streaming
      const handleResponseStart = (data) => {
        console.log('Response started for:', data.message);
        setIsTyping(true);
        setStreamingMessage('');
        setCurrentStreamingId(Date.now().toString());
        
        // Add user message to display immediately
        const userMessage = {
          id: Date.now().toString(),
          user_id: currentUser.id,
          session_id: data.session_id || wsSessionId,
          message: data.message,
          response: '',
          timestamp: new Date().toISOString(),
          ai_personality: selectedPersonality,
          is_streaming: true
        };
        
        setMessages(prev => [...prev, userMessage]);
      };

      // Handle response chunks
      const handleResponseChunk = (data) => {
        setStreamingMessage(prev => prev + data.chunk);
      };

      // Handle response completion
      const handleResponseComplete = () => {
        setIsTyping(false);
      };

      // Handle message completion with full response
      const handleMessageComplete = (data) => {
        setMessages(prev => prev.map(msg => 
          msg.id === (currentStreamingId || msg.id) ? {
            ...msg,
            id: data.message_id,
            response: data.full_response,
            is_streaming: false
          } : msg
        ));
        setStreamingMessage('');
        setCurrentStreamingId(null);
        
        // Auto-play TTS if enabled
        if (config.voice_settings?.enabled && config.voice_settings?.auto_play_responses) {
          if (requestTTS) {
            requestTTS(data.full_response, config.voice_settings.voice, config.voice_settings.speech_speed);
          }
        }
      };

      // Handle voice transcription results
      const handleTranscriptionResult = (data) => {
        console.log('Transcription result:', data.text);
        setCurrentMessage(data.text);
        toast.success(`Transcribed: "${data.text}"`);
      };

      // Handle TTS results
      const handleTTSResult = (data) => {
        console.log('TTS result received');
        if (voiceInterfaceRef.current && voiceInterfaceRef.current.playAudioFromBase64) {
          voiceInterfaceRef.current.playAudioFromBase64(data.audio_data);
        }
      };

      // Handle errors
      const handleError = (data) => {
        console.error('WebSocket error:', data);
        toast.error(data.message || 'An error occurred');
        setIsTyping(false);
      };

      const handleTranscriptionError = (data) => {
        console.error('Transcription error:', data);
        toast.error(data.message || 'Failed to transcribe audio');
      };

      const handleTTSError = (data) => {
        console.error('TTS error:', data);
        toast.error(data.message || 'Failed to generate speech');
      };

      // Add event listeners
      addWSListener('session_established', handleSessionEstablished);
      addWSListener('typing_start', handleTypingStart);
      addWSListener('response_start', handleResponseStart);
      addWSListener('response_chunk', handleResponseChunk);
      addWSListener('response_complete', handleResponseComplete);
      addWSListener('message_complete', handleMessageComplete);
      addWSListener('transcription_result', handleTranscriptionResult);
      addWSListener('transcription_error', handleTranscriptionError);
      addWSListener('tts_result', handleTTSResult);
      addWSListener('tts_error', handleTTSError);
      addWSListener('error', handleError);

      // Cleanup listeners on unmount
      return () => {
        removeWSListener('session_established', handleSessionEstablished);
        removeWSListener('typing_start', handleTypingStart);
        removeWSListener('response_start', handleResponseStart);
        removeWSListener('response_chunk', handleResponseChunk);
        removeWSListener('response_complete', handleResponseComplete);
        removeWSListener('message_complete', handleMessageComplete);
        removeWSListener('transcription_result', handleTranscriptionResult);
        removeWSListener('transcription_error', handleTranscriptionError);
        removeWSListener('tts_result', handleTTSResult);
        removeWSListener('tts_error', handleTTSError);
        removeWSListener('error', handleError);
      };
    }
  }, [currentUser, wsConnected, wsSessionId, selectedPersonality, config.voice_settings, currentStreamingId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversationSessions = async () => {
    try {
      const response = await axios.get(`${API}/sessions/${currentUser.id}`);
      setConversationSessions(response.data);
    } catch (error) {
      console.error('Failed to load conversation sessions:', error);
    }
  };

  const loadAIPersonalities = async () => {
    try {
      const response = await axios.get(`${API}/personalities`);
      setAiPersonalities(response.data.personalities);
    } catch (error) {
      console.error('Failed to load AI personalities:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      console.log('Attempting registration with:', { username, email });
      await register(username, email, 'employee');
      setIsLoggedIn(true);
      console.log('Registration successful');
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await axios.get(`${API}/chat/history/${currentUser.id}`);
      setMessages(response.data.reverse());
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await axios.get(`${API}/widget/config/${currentUser.id}`);
      setConfig(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        // Config doesn't exist yet, that's fine - use defaults
        console.log('No config found, using defaults');
      } else {
        console.error('Failed to load config:', error);
      }
    }
  };

  const loadKnowledgeBase = async () => {
    try {
      const response = await axios.get(`${API}/knowledge-base/${currentUser.id}`);
      setKnowledgeItems(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        // No knowledge base items yet, that's fine
        console.log('No knowledge base items found');
      } else {
        console.error('Failed to load knowledge base:', error);
      }
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim() || isTyping) return;

    const messageText = currentMessage.trim();
    setCurrentMessage('');

    // Use WebSocket for streaming if connected, otherwise fallback to REST API
    if (wsConnected && config.streaming_enabled) {
      // Send via WebSocket for streaming response
      sendChatMessage(messageText, selectedPersonality);
    } else {
      // Fallback to traditional REST API
      await sendMessageREST(messageText);
    }
  };

  const sendMessageREST = async (messageText) => {
    const userMessage = {
      id: Date.now().toString(),
      user_id: currentUser.id,
      session_id: currentSessionId,
      message: messageText,
      response: '',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await axios.post(`${API}/chat`, {
        user_id: currentUser.id,
        message: messageText,
        session_id: currentSessionId
      });

      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? response.data : msg
      ));

      // Auto-play TTS if enabled
      if (config.voice_settings?.enabled && config.voice_settings?.auto_play_responses && requestTTS) {
        requestTTS(response.data.response, config.voice_settings.voice, config.voice_settings.speech_speed);
      }
    } catch (error) {
      toast.error('Failed to get AI response');
      console.error('Chat error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  // Voice interface handlers
  const handleVoiceTranscription = async (transcriptionData) => {
    try {
      if (wsConnected) {
        // Send via WebSocket
        sendVoiceTranscription(transcriptionData.audio_data, transcriptionData.duration, true);
      } else {
        // Fallback to REST API
        const formData = new FormData();
        const audioBlob = new Blob([
          Uint8Array.from(atob(transcriptionData.audio_data), c => c.charCodeAt(0))
        ], { type: 'audio/webm' });
        
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('user_id', currentUser.id);

        const response = await axios.post(`${API}/voice/transcribe`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setCurrentMessage(response.data.transcript);
        toast.success(`Transcribed: "${response.data.transcript}"`);
      }
    } catch (error) {
      console.error('Voice transcription error:', error);
      toast.error('Failed to transcribe voice input');
    }
  };

  const handleTTSRequest = async (ttsData) => {
    try {
      if (wsConnected) {
        // Send via WebSocket
        requestTTS(ttsData.text, ttsData.voice, ttsData.speed);
      } else {
        // Fallback to REST API
        const response = await axios.post(`${API}/voice/synthesize`, {
          user_id: currentUser.id,
          text: ttsData.text,
          voice: ttsData.voice,
          speed: ttsData.speed
        }, {
          responseType: 'blob'
        });

        const audioUrl = URL.createObjectURL(response.data);
        const audio = new Audio(audioUrl);
        audio.play();
        audio.onended = () => URL.revokeObjectURL(audioUrl);
      }
    } catch (error) {
      console.error('TTS error:', error);
      toast.error('Failed to generate speech');
    }
  };

  const handleVoiceSettingsChange = (newSettings) => {
    const updatedConfig = {
      ...config,
      voice_settings: newSettings
    };
    setConfig(updatedConfig);
    
    // Save to backend
    saveConfig(updatedConfig);
  };

  const saveConfig = async (configToSave = config) => {
    try {
      setLoading(true);
      await axios.post(`${API}/widget/config`, {
        user_id: currentUser.id,
        ...configToSave
      });
      toast.success('Configuration saved successfully!');
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const addKnowledgeItem = async (e) => {
    e.preventDefault();
    if (!newKbTitle.trim() || !newKbContent.trim()) return;

    try {
      const response = await axios.post(`${API}/knowledge-base`, {
        user_id: currentUser.id,
        title: newKbTitle,
        content: newKbContent,
        file_type: 'text'
      });

      setKnowledgeItems(prev => [response.data, ...prev]);
      setNewKbTitle('');
      setNewKbContent('');
      toast.success('Knowledge item added!');
    } catch (error) {
      toast.error('Failed to add knowledge item');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="circuit-bg" />
        <div className="bg-grid" />
        
        <Card className="glass p-8 w-full max-w-md relative z-10">
          <div className="text-center mb-6">
            <img 
              src="https://customer-assets.emergentagent.com/job_e5160009-8512-41e3-9e15-ca5ce341c758/artifacts/m183zmfa_Photoroom_20250910_212153.PNG"
              alt="modQ Logo"
              className="w-16 h-16 mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold text-gradient">Widget Demo Access</h2>
            <p className="text-gray-400 mt-2">Enter your details to try the lightweight widget</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="glass neon-border"
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass neon-border"
              />
            </div>
            <Button type="submit" className="w-full tech-button" disabled={loading}>
              <Bot className="w-4 h-4 mr-2" />
              Start Widget Demo
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Landing
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="circuit-bg" />
      <div className="bg-grid" />
      
      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gradient">modQ Widget Demo</h1>
              <p className="text-gray-400">Super Intelligent Personal Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Active
            </Badge>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-400">
                Welcome, <span className="text-white font-medium">{currentUser?.username}</span>
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Clear localStorage and reload to allow different login
                  localStorage.clear();
                  window.location.href = '/';
                }}
                className="text-xs glass neon-border hover:bg-white/10"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7 glass neon-border">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                AI Chat
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="progress" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Progress
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Config
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Knowledge
              </TabsTrigger>
              <TabsTrigger value="achievements" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Achievements
              </TabsTrigger>
            </TabsList>

                {/* Chat Tab */}
            <TabsContent value="chat" className="mt-6">
              <Card className="holographic h-[600px] flex flex-col ai-chat-container">
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">modQ AI Assistant</h3>
                      <p className="text-xs text-gray-400">Your intelligent business companion</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="space-y-6">
                      <div className="text-center text-gray-400 py-4">
                        <Bot className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                        <p className="text-lg font-medium">Welcome to your AI Business Assistant</p>
                        <p className="text-sm mt-2">Get started with a conversation below, or try one of these popular topics</p>
                      </div>
                      
                      <ConversationStarters 
                        userConfig={config}
                        onStarterClick={(message) => {
                          setCurrentMessage(message);
                          // Auto-submit the message
                          setTimeout(() => {
                            const event = { preventDefault: () => {} };
                            sendMessage(event);
                          }, 100);
                        }}
                      />
                    </div>
                  )}
                  
                  {messages.map((message) => (
                    <div key={message.id} className="space-y-3 chat-message">
                      <div className="flex justify-end">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-lg max-w-xs">
                          {message.message}
                        </div>
                      </div>
                      {message.response && (
                        <div className="flex justify-start">
                          <div className="glass p-3 rounded-lg max-w-xs space-y-3">
                            <p className="text-gray-200">{message.response}</p>
                            <AIResponseRating 
                              messageId={message.id} 
                              onRate={(messageId, rating, feedback) => {
                                console.log('Message rated:', messageId, rating, feedback);
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="glass p-3 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
                  <div className="flex gap-2">
                    <Input
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      placeholder="Ask your AI assistant anything..."
                      className="flex-1 glass neon-border"
                      disabled={isTyping}
                    />
                    <Button type="submit" className="tech-button" disabled={isTyping || !currentMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </Card>
            </TabsContent>

            {/* Smart Insights Tab */}
            <TabsContent value="insights" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <SmartInsightsPanel 
                    userConfig={config}
                    chatMessages={messages}
                  />
                </div>
                <div>
                  <Card className="holographic p-6">
                    <h3 className="text-lg font-semibold mb-4 text-white">Export & Share</h3>
                    <ExportCapabilities 
                      userConfig={config}
                      chatMessages={messages}
                      knowledgeItems={knowledgeItems}
                      insights={[]} // This would come from SmartInsightsPanel in production
                    />
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="mt-6">
              <VisualAnalyticsDashboard userConfig={config} />
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="mt-6">
              <ProgressTracker 
                userConfig={config}
                chatMessages={messages}
                knowledgeItems={knowledgeItems}
              />
            </TabsContent>

            {/* Configuration Tab */}
            <TabsContent value="config" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="holographic p-6">
                  <h3 className="text-xl font-semibold mb-4 text-white">Basic Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
                      <Input
                        value={config.company_name}
                        onChange={(e) => setConfig({...config, company_name: e.target.value})}
                        placeholder="Your Company Name"
                        className="glass neon-border"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Industry</label>
                      <Select value={config.industry} onValueChange={(value) => setConfig({...config, industry: value})}>
                        <SelectTrigger className="glass neon-border">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent className="glass">
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="consulting">Consulting</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">AI Personality</label>
                      <Select value={config.ai_personality} onValueChange={(value) => setConfig({...config, ai_personality: value})}>
                        <SelectTrigger className="glass neon-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass">
                          <SelectItem value="Professional Assistant">Professional Assistant</SelectItem>
                          <SelectItem value="Strategic Advisor">Strategic Advisor</SelectItem>
                          <SelectItem value="Creative Partner">Creative Partner</SelectItem>
                          <SelectItem value="Data Analyst">Data Analyst</SelectItem>
                          <SelectItem value="Regional Manager">Regional Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button onClick={saveConfig} className="w-full tech-button" disabled={loading}>
                      <Settings className="w-4 h-4 mr-2" />
                      Save Configuration
                    </Button>
                  </div>
                </Card>
                
                <Card className="holographic p-6">
                  <h3 className="text-xl font-semibold mb-4 text-white">Integration Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-300">CRM Integration</p>
                        <p className="text-sm text-gray-400">Connect to existing CRM systems</p>
                      </div>
                      <Switch />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-300">Email Automation</p>
                        <p className="text-sm text-gray-400">Automate email workflows</p>
                      </div>
                      <Switch />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-300">Analytics Tracking</p>
                        <p className="text-sm text-gray-400">Track performance metrics</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-300">AI Learning</p>
                        <p className="text-sm text-gray-400">Continuous learning from interactions</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Knowledge Base Tab */}
            <TabsContent value="knowledge" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="holographic p-6">
                  <h3 className="text-xl font-semibold mb-4 text-white">Upload Documents</h3>
                  <FileUploadZone 
                    userId={currentUser?.id}
                    onUploadComplete={(uploadedItem) => {
                      // Refresh knowledge base list
                      loadKnowledgeBase();
                      toast.success('Document processed and added to knowledge base!');
                    }}
                  />
                </Card>
                
                <Card className="holographic p-6">
                  <h3 className="text-xl font-semibold mb-4 text-white">Add Knowledge Manually</h3>
                  <form onSubmit={addKnowledgeItem} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                      <Input
                        value={newKbTitle}
                        onChange={(e) => setNewKbTitle(e.target.value)}
                        placeholder="Knowledge item title"
                        className="glass neon-border"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
                      <Textarea
                        value={newKbContent}
                        onChange={(e) => setNewKbContent(e.target.value)}
                        placeholder="Add your company knowledge, processes, or information..."
                        className="glass neon-border h-32"
                      />
                    </div>
                    
                    <Button type="submit" className="w-full tech-button">
                      <Upload className="w-4 h-4 mr-2" />
                      Add to Knowledge Base
                    </Button>
                  </form>
                </Card>
              </div>
              
              {/* Knowledge Base Items List */}
              <Card className="holographic p-6 mt-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Knowledge Base Items</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {knowledgeItems.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">
                      No knowledge items yet. Upload documents or add information manually to help your AI assistant learn about your business.
                    </p>
                  ) : (
                    knowledgeItems.map((item) => (
                      <div key={item.id} className="glass p-4 rounded-lg neon-border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-white mb-1 flex items-center gap-2">
                              {item.file_type !== 'text' && (
                                <FileText className="w-4 h-4 text-blue-400" />
                              )}
                              {item.title}
                            </h4>
                            <p className="text-sm text-gray-300 line-clamp-3 mb-2">{item.content}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>Added {new Date(item.created_at).toLocaleDateString()}</span>
                              {item.file_type !== 'text' && (
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                  {item.file_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* Achievements Tab */}
            <TabsContent value="achievements" className="mt-6">
              <AchievementSystem 
                userConfig={config}
                chatMessages={messages}
                knowledgeItems={knowledgeItems}
                progressStats={{
                  currentStreak: 3, // This would come from ProgressTracker in production
                  totalConversations: messages.length
                }}
              />
            </TabsContent>

            {/* Legacy Automations Tab - keeping for backward compatibility */}
            <TabsContent value="automations" className="mt-6">
              <Card className="holographic p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Workflow Automations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { title: 'Lead Qualification', description: 'Automatically qualify incoming leads based on criteria', active: false },
                    { title: 'Email Follow-ups', description: 'Send personalized follow-up emails automatically', active: true },
                    { title: 'Report Generation', description: 'Generate weekly performance reports', active: true },
                    { title: 'Task Assignment', description: 'Intelligently assign tasks to team members', active: false },
                    { title: 'Meeting Scheduling', description: 'Automatically schedule meetings based on availability', active: true },
                    { title: 'Data Backup', description: 'Automated daily data backups', active: true }
                  ].map((automation, index) => (
                    <div key={index} className="glass p-4 rounded-lg neon-border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{automation.title}</h4>
                        <Switch defaultChecked={automation.active} />
                      </div>
                      <p className="text-sm text-gray-300">{automation.description}</p>
                      <Badge className={`mt-2 ${automation.active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                        {automation.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Onboarding Tour */}
      {showOnboarding && (
        <OnboardingTour 
          user={currentUser}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
};

export default WidgetDemo;