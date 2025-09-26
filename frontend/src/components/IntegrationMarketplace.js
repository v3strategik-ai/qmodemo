import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  Search, 
  Filter, 
  Zap, 
  MessageSquare, 
  DollarSign, 
  Mail, 
  Calendar, 
  FileText,
  Users,
  BarChart3,
  Settings,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Star,
  Download,
  Shield,
  Workflow
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const IntegrationMarketplace = ({ currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [integrations, setIntegrations] = useState([]);
  const [userIntegrations, setUserIntegrations] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);

  // Popular integrations data
  const availableIntegrations = [
    {
      id: 'slack',
      name: 'Slack',
      category: 'communication',
      description: 'Connect your team communication with AI-powered insights and automated responses.',
      icon: MessageSquare,
      color: 'bg-purple-500',
      features: ['Real-time notifications', 'AI message analysis', 'Automated responses', 'Channel integration'],
      pricing: 'Free',
      popularity: 5,
      setupComplexity: 'Easy',
      status: 'available',
      provider: 'Slack Technologies',
      website: 'https://slack.com',
      documentation: 'https://api.slack.com',
      benefits: [
        'Instant team notifications for important insights',
        'AI-powered message categorization',
        'Automated workflow triggers from Slack messages',
        'Seamless team collaboration integration'
      ]
    },
    {
      id: 'salesforce',
      name: 'Salesforce',
      category: 'crm',
      description: 'Sync customer data and leverage AI insights for better sales performance.',
      icon: Users,
      color: 'bg-blue-500',
      features: ['CRM data sync', 'Lead scoring', 'Sales analytics', 'Pipeline automation'],
      pricing: 'Premium',
      popularity: 5,
      setupComplexity: 'Medium',
      status: 'available',
      provider: 'Salesforce Inc.',
      website: 'https://salesforce.com',
      documentation: 'https://developer.salesforce.com',
      benefits: [
        'Unified customer view across platforms',
        'AI-enhanced lead scoring and prioritization',
        'Automated follow-up scheduling',
        'Real-time sales performance insights'
      ]
    },
    {
      id: 'google-workspace',
      name: 'Google Workspace',
      category: 'productivity',
      description: 'Integrate with Gmail, Drive, Calendar, and other Google services.',
      icon: Mail,
      color: 'bg-green-500',
      features: ['Gmail integration', 'Calendar sync', 'Drive access', 'Meet scheduling'],
      pricing: 'Free',
      popularity: 4,
      setupComplexity: 'Easy',
      status: 'available',
      provider: 'Google LLC',
      website: 'https://workspace.google.com',
      documentation: 'https://developers.google.com/workspace',
      benefits: [
        'Automated email categorization and responses',
        'Smart calendar scheduling with AI insights',
        'Document analysis and summarization',
        'Integrated video meeting setup'
      ]
    },
    {
      id: 'microsoft-365',
      name: 'Microsoft 365',
      category: 'productivity',
      description: 'Connect with Outlook, Teams, OneDrive, and Office applications.',
      icon: FileText,
      color: 'bg-indigo-500',
      features: ['Outlook sync', 'Teams integration', 'OneDrive access', 'Office automation'],
      pricing: 'Free',
      popularity: 4,
      setupComplexity: 'Easy',
      status: 'available',
      provider: 'Microsoft Corporation',
      website: 'https://microsoft.com/microsoft-365',
      documentation: 'https://docs.microsoft.com/graph',
      benefits: [
        'Seamless Outlook email management',
        'Teams meeting integration and insights',
        'Document collaboration enhancement',
        'Automated Office workflow optimization'
      ]
    },
    {
      id: 'stripe',
      name: 'Stripe',
      category: 'payments',
      description: 'Payment processing with AI-powered fraud detection and revenue insights.',
      icon: DollarSign,
      color: 'bg-emerald-500',
      features: ['Payment processing', 'Fraud detection', 'Revenue analytics', 'Subscription management'],
      pricing: 'Per transaction',
      popularity: 5,
      setupComplexity: 'Medium',
      status: 'available',
      provider: 'Stripe Inc.',
      website: 'https://stripe.com',
      documentation: 'https://stripe.com/docs/api',
      benefits: [
        'AI-powered fraud prevention',
        'Real-time revenue insights and forecasting',
        'Automated subscription management',
        'Advanced payment analytics and reporting'
      ]
    },
    {
      id: 'zapier',
      name: 'Zapier',
      category: 'automation',
      description: 'Connect modQ with 5000+ apps through automated workflows.',
      icon: Zap,
      color: 'bg-orange-500',
      features: ['Workflow automation', '5000+ app connections', 'Trigger-based actions', 'Custom integrations'],
      pricing: 'Freemium',
      popularity: 4,
      setupComplexity: 'Easy',
      status: 'available',
      provider: 'Zapier Inc.',
      website: 'https://zapier.com',
      documentation: 'https://zapier.com/developer',
      benefits: [
        'Connect to thousands of business apps',
        'Automated workflow creation with AI insights',
        'Trigger-based actions for efficiency',
        'Custom integration possibilities'
      ]
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      category: 'crm',
      description: 'Marketing, sales, and service CRM with AI-enhanced lead nurturing.',
      icon: BarChart3,
      color: 'bg-red-500',
      features: ['Marketing automation', 'Lead nurturing', 'Contact management', 'Pipeline tracking'],
      pricing: 'Freemium',
      popularity: 4,
      setupComplexity: 'Medium',
      status: 'available',
      provider: 'HubSpot Inc.',
      website: 'https://hubspot.com',
      documentation: 'https://developers.hubspot.com',
      benefits: [
        'Automated lead nurturing campaigns',
        'AI-powered content personalization',
        'Comprehensive customer journey tracking',
        'Integrated marketing and sales insights'
      ]
    },
    {
      id: 'calendar',
      name: 'Calendar Integration',
      category: 'productivity',
      description: 'Universal calendar integration with smart scheduling and meeting insights.',
      icon: Calendar,
      color: 'bg-cyan-500',
      features: ['Multi-calendar sync', 'Smart scheduling', 'Meeting insights', 'Availability management'],
      pricing: 'Free',
      popularity: 3,
      setupComplexity: 'Easy',
      status: 'available',
      provider: 'modQ',
      website: '#',
      documentation: '#',
      benefits: [
        'Unified view of all calendars',
        'AI-powered meeting scheduling optimization',
        'Automatic conflict resolution',
        'Meeting preparation insights'
      ]
    }
  ];

  const categories = [
    { id: 'all', name: 'All Integrations', count: availableIntegrations.length },
    { id: 'communication', name: 'Communication', count: availableIntegrations.filter(i => i.category === 'communication').length },
    { id: 'crm', name: 'CRM & Sales', count: availableIntegrations.filter(i => i.category === 'crm').length },
    { id: 'productivity', name: 'Productivity', count: availableIntegrations.filter(i => i.category === 'productivity').length },
    { id: 'payments', name: 'Payments', count: availableIntegrations.filter(i => i.category === 'payments').length },
    { id: 'automation', name: 'Automation', count: availableIntegrations.filter(i => i.category === 'automation').length },
  ];

  useEffect(() => {
    loadIntegrations();
    loadUserIntegrations();
  }, []);

  const loadIntegrations = () => {
    setIntegrations(availableIntegrations);
  };

  const loadUserIntegrations = async () => {
    try {
      const response = await axios.get(`${API}/integrations/user/${currentUser?.id}`);
      const userIntegrationsMap = {};
      response.data.forEach(integration => {
        userIntegrationsMap[integration.integration_id] = integration;
      });
      setUserIntegrations(userIntegrationsMap);
    } catch (error) {
      console.error('Failed to load user integrations:', error);
      // Set empty object if API fails (expected during initial development)
      setUserIntegrations({});
    }
  };

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (integrationId) => {
    const userIntegration = userIntegrations[integrationId];
    
    if (!userIntegration) {
      return (
        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
          <AlertCircle className="w-3 h-3 mr-1" />
          Not Connected
        </Badge>
      );
    }

    switch (userIntegration.status) {
      case 'connected':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case 'connecting':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Connecting...
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Connection Error
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unknown Status
          </Badge>
        );
    }
  };

  const handleConnect = async (integration) => {
    try {
      setLoading(true);
      
      // Simulate connection process
      toast.success(`Initiating connection to ${integration.name}...`);
      
      // In a real implementation, this would redirect to OAuth or show setup form
      const response = await axios.post(`${API}/integrations/connect`, {
        user_id: currentUser.id,
        integration_id: integration.id,
        integration_name: integration.name
      });
      
      // Update local state
      setUserIntegrations(prev => ({
        ...prev,
        [integration.id]: {
          integration_id: integration.id,
          status: 'connecting'
        }
      }));
      
      // Simulate connection completion after 2 seconds
      setTimeout(() => {
        setUserIntegrations(prev => ({
          ...prev,
          [integration.id]: {
            integration_id: integration.id,
            status: 'connected',
            connected_at: new Date().toISOString()
          }
        }));
        toast.success(`Successfully connected to ${integration.name}!`);
      }, 2000);
      
    } catch (error) {
      console.error('Connection failed:', error);
      toast.error(`Failed to connect to ${integration.name}`);
      
      setUserIntegrations(prev => ({
        ...prev,
        [integration.id]: {
          integration_id: integration.id,
          status: 'error'
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (integration) => {
    try {
      setLoading(true);
      
      await axios.delete(`${API}/integrations/disconnect`, {
        data: {
          user_id: currentUser.id,
          integration_id: integration.id
        }
      });
      
      // Update local state
      const newIntegrations = { ...userIntegrations };
      delete newIntegrations[integration.id];
      setUserIntegrations(newIntegrations);
      
      toast.success(`Disconnected from ${integration.name}`);
      
    } catch (error) {
      console.error('Disconnection failed:', error);
      toast.error(`Failed to disconnect from ${integration.name}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (count) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${i < count ? 'text-yellow-400 fill-current' : 'text-gray-500'}`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Integration Marketplace</h2>
          <p className="text-gray-400 mt-1">Connect modQ with your favorite business tools</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <Workflow className="w-3 h-3 mr-1" />
            {Object.keys(userIntegrations).length} Connected
          </Badge>
          <Button variant="outline" className="glass neon-border">
            <Settings className="w-4 h-4 mr-2" />
            Manage All
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search integrations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 glass neon-border"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Filter:</span>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="glass neon-border">
          {categories.map(category => (
            <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
              {category.name}
              <Badge className="bg-white/10 text-white text-xs">
                {category.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Integrations Grid */}
        <TabsContent value={selectedCategory} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((integration) => {
              const IconComponent = integration.icon;
              const isConnected = userIntegrations[integration.id]?.status === 'connected';
              
              return (
                <Card key={integration.id} className="holographic p-6 hover:scale-105 transition-transform">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${integration.color} flex items-center justify-center`}>
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{integration.name}</h3>
                          <p className="text-xs text-gray-400">{integration.provider}</p>
                        </div>
                      </div>
                      
                      {getStatusBadge(integration.id)}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-300 line-clamp-2">
                      {integration.description}
                    </p>

                    {/* Features */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {integration.features.slice(0, 2).map((feature, index) => (
                          <Badge key={index} className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {integration.features.length > 2 && (
                          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">
                            +{integration.features.length - 2} more
                          </Badge>
                        )}
                      </div>

                      {/* Popularity and Pricing */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {renderStars(integration.popularity)}
                          <span className="text-xs text-gray-400 ml-1">Popular</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {integration.pricing}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2">
                      {isConnected ? (
                        <Button
                          onClick={() => handleDisconnect(integration)}
                          variant="outline"
                          className="flex-1 glass neon-border text-red-400 border-red-500/30 hover:bg-red-500/20"
                          disabled={loading}
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleConnect(integration)}
                          className="flex-1 tech-button"
                          disabled={loading}
                        >
                          Connect
                        </Button>
                      )}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="glass neon-border"
                            onClick={() => setSelectedIntegration(integration)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        
                        <DialogContent className="glass max-w-2xl">
                          {selectedIntegration && (
                            <>
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-3 text-white">
                                  <div className={`w-8 h-8 rounded-lg ${selectedIntegration.color} flex items-center justify-center`}>
                                    <selectedIntegration.icon className="w-4 h-4 text-white" />
                                  </div>
                                  {selectedIntegration.name} Integration
                                </DialogTitle>
                              </DialogHeader>
                              
                              <div className="space-y-4 text-gray-300">
                                <p>{selectedIntegration.description}</p>
                                
                                <div>
                                  <h4 className="font-semibold text-white mb-2">Key Benefits</h4>
                                  <ul className="space-y-1">
                                    {selectedIntegration.benefits.map((benefit, index) => (
                                      <li key={index} className="flex items-start gap-2 text-sm">
                                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                        {benefit}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-semibold text-white mb-2">Features</h4>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedIntegration.features.map((feature, index) => (
                                        <Badge key={index} className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                          {feature}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-semibold text-white mb-2">Details</h4>
                                    <div className="space-y-1 text-sm">
                                      <div>Setup: {selectedIntegration.setupComplexity}</div>
                                      <div>Pricing: {selectedIntegration.pricing}</div>
                                      <div className="flex items-center gap-1">
                                        Popularity: {renderStars(selectedIntegration.popularity)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 pt-4">
                                  {userIntegrations[selectedIntegration.id]?.status === 'connected' ? (
                                    <Button
                                      onClick={() => handleDisconnect(selectedIntegration)}
                                      variant="outline"
                                      className="glass neon-border text-red-400 border-red-500/30 hover:bg-red-500/20"
                                      disabled={loading}
                                    >
                                      Disconnect Integration
                                    </Button>
                                  ) : (
                                    <Button
                                      onClick={() => handleConnect(selectedIntegration)}
                                      className="tech-button"
                                      disabled={loading}
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Connect Integration
                                    </Button>
                                  )}
                                  
                                  <Button variant="ghost" className="text-gray-400 hover:text-white">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Documentation
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {filteredIntegrations.length === 0 && (
            <div className="text-center py-12">
              <Workflow className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No integrations found</h3>
              <p className="text-gray-500">
                Try adjusting your search terms or category filter.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegrationMarketplace;