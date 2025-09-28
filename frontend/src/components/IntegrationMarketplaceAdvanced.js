import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Search, 
  Plus, 
  Star, 
  Download, 
  Eye, 
  Code, 
  Package, 
  Zap, 
  Database, 
  Webhook, 
  FileText, 
  Bell, 
  BarChart3, 
  Brain,
  Filter,
  Heart,
  Share2,
  Settings,
  Play,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const IntegrationMarketplaceAdvanced = ({ currentUser }) => {
  const [integrations, setIntegrations] = useState([]);
  const [userIntegrations, setUserIntegrations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('marketplace');
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, review: '' });
  const [newIntegration, setNewIntegration] = useState({
    name: '',
    description: '',
    category: 'api',
    code: '',
    language: 'python',
    requirements: [],
    tags: [],
    endpoints: []
  });

  const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    if (currentUser) {
      loadMarketplaceData();
    }
  }, [currentUser, selectedCategory]);

  const loadMarketplaceData = async () => {
    try {
      setLoading(true);
      
      // Load categories
      const categoriesResponse = await axios.get(`${API}/api/integrations/marketplace/categories`);
      setCategories(categoriesResponse.data.categories);
      
      // Load marketplace integrations
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);
      
      const integrationsResponse = await axios.get(
        `${API}/api/integrations/marketplace?${params.toString()}`
      );
      setIntegrations(integrationsResponse.data);
      
      // Load user's installed integrations
      const userIntegrationsResponse = await axios.get(
        `${API}/api/integrations/user/${currentUser.id}/installed`
      );
      setUserIntegrations(userIntegrationsResponse.data);
      
    } catch (error) {
      console.error('Failed to load marketplace data:', error);
      toast.error('Failed to load marketplace data');
    } finally {
      setLoading(false);
    }
  };

  const handleInstallIntegration = async (integrationId) => {
    try {
      await axios.post(`${API}/api/integrations/marketplace/install`, {
        integration_id: integrationId,
        user_id: currentUser.id,
        configuration: {}
      });
      
      toast.success('Integration installed successfully!');
      loadMarketplaceData(); // Refresh data
      
    } catch (error) {
      console.error('Failed to install integration:', error);
      if (error.response?.status === 400) {
        toast.error('Integration already installed');
      } else {
        toast.error('Failed to install integration');
      }
    }
  };

  const handleCreateIntegration = async () => {
    try {
      const integrationData = {
        ...newIntegration,
        author_id: currentUser.id
      };
      
      await axios.post(`${API}/api/integrations/marketplace/create`, integrationData);
      
      toast.success('Integration created successfully!');
      setCreateDialog(false);
      resetCreateForm();
      loadMarketplaceData();
      
    } catch (error) {
      console.error('Failed to create integration:', error);
      toast.error('Failed to create integration');
    }
  };

  const handleSubmitReview = async () => {
    try {
      await axios.post(
        `${API}/api/integrations/marketplace/${selectedIntegration.id}/review`,
        {
          integration_id: selectedIntegration.id,
          user_id: currentUser.id,
          rating: reviewData.rating,
          review: reviewData.review
        }
      );
      
      toast.success('Review submitted successfully!');
      setReviewDialog(false);
      setReviewData({ rating: 5, review: '' });
      loadMarketplaceData();
      
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error('Failed to submit review');
    }
  };

  const resetCreateForm = () => {
    setNewIntegration({
      name: '',
      description: '',
      category: 'api',
      code: '',
      language: 'python',
      requirements: [],
      tags: [],
      endpoints: []
    });
  };

  const getCategoryIcon = (categoryId) => {
    const iconMap = {
      api: Zap,
      webhook: Webhook,
      database: Database,
      file_processing: FileText,
      notification: Bell,
      analytics: BarChart3,
      ai_ml: Brain,
      custom: Code
    };
    return iconMap[categoryId] || Package;
  };

  const isIntegrationInstalled = (integrationId) => {
    return userIntegrations.some(ui => ui.integration_id === integrationId && ui.is_active);
  };

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = !searchTerm || 
      integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-400">Loading Integration Marketplace...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Integration Marketplace</h2>
          <p className="text-gray-400">Discover, install, and create custom integrations</p>
        </div>
        
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Integration
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[600px] glass neon-border max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Integration</DialogTitle>
              <DialogDescription className="text-gray-400">
                Build a custom integration to share with the community
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Integration Name</label>
                  <Input
                    value={newIntegration.name}
                    onChange={(e) => setNewIntegration({...newIntegration, name: e.target.value})}
                    placeholder="e.g., Slack Notifications"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-300">Category</label>
                  <Select 
                    value={newIntegration.category} 
                    onValueChange={(value) => setNewIntegration({...newIntegration, category: value})}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300">Description</label>
                <Textarea
                  value={newIntegration.description}
                  onChange={(e) => setNewIntegration({...newIntegration, description: e.target.value})}
                  placeholder="Describe what your integration does..."
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300">Integration Code</label>
                <Textarea
                  value={newIntegration.code}
                  onChange={(e) => setNewIntegration({...newIntegration, code: e.target.value})}
                  placeholder="Enter your integration code here..."
                  className="bg-gray-800 border-gray-600 text-white font-mono text-sm min-h-[200px]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Language</label>
                  <Select 
                    value={newIntegration.language} 
                    onValueChange={(value) => setNewIntegration({...newIntegration, language: value})}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="sql">SQL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-300">Tags (comma-separated)</label>
                  <Input
                    value={newIntegration.tags.join(', ')}
                    onChange={(e) => setNewIntegration({
                      ...newIntegration, 
                      tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                    })}
                    placeholder="api, webhook, automation"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setCreateDialog(false);
                  resetCreateForm();
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateIntegration}
                className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
              >
                Create Integration
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search integrations..."
            className="pl-10 bg-gray-800 border-gray-600 text-white"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48 bg-gray-800 border-gray-600 text-white">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 glass neon-border">
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="installed">Installed ({userIntegrations.length})</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="space-y-6">
          {filteredIntegrations.length === 0 ? (
            <Card className="glass neon-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Integrations Found</h3>
                <p className="text-gray-400 text-center mb-6">
                  {searchTerm ? 'Try adjusting your search terms' : 'Be the first to create an integration!'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredIntegrations.map((integration) => {
                const IconComponent = getCategoryIcon(integration.category);
                const isInstalled = isIntegrationInstalled(integration.id);
                
                return (
                  <Card key={integration.id} className="glass neon-border hover:bg-gray-800/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <IconComponent className="w-5 h-5 text-blue-400" />
                          <Badge variant="secondary" className="text-xs">
                            {integration.category.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-1">
                          {integration.is_verified && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <CardTitle className="text-white">{integration.name}</CardTitle>
                      <CardDescription className="text-gray-400 line-clamp-2">
                        {integration.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-400" />
                            <span>{integration.rating || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Download className="w-3 h-3" />
                            <span>{integration.install_count}</span>
                          </div>
                        </div>
                        <div className="text-xs">
                          v{integration.version}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {integration.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {integration.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{integration.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedIntegration(integration);
                            setDetailsDialog(true);
                          }}
                          className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                        
                        {isInstalled ? (
                          <Button
                            size="sm"
                            disabled
                            className="flex-1 bg-green-500/20 text-green-400 border-green-500/30"
                          >
                            <Package className="w-3 h-3 mr-1" />
                            Installed
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleInstallIntegration(integration.id)}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Install
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="installed" className="space-y-6">
          {userIntegrations.length === 0 ? (
            <Card className="glass neon-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Integrations Installed</h3>
                <p className="text-gray-400 text-center mb-6">
                  Browse the marketplace to install your first integration
                </p>
                <Button 
                  onClick={() => setActiveTab('marketplace')}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  Browse Marketplace
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userIntegrations.map((userIntegration) => {
                // In a real app, you'd join this with integration details
                return (
                  <Card key={userIntegration.id} className="glass neon-border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Active
                        </Badge>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                            <Settings className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                            <Play className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-white">Integration {userIntegration.integration_id.slice(0, 8)}</CardTitle>
                      <CardDescription className="text-gray-400">
                        Installed {new Date(userIntegration.install_date).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>Usage: {userIntegration.usage_count} times</span>
                        <span>
                          Last used: {userIntegration.last_used ? 
                            new Date(userIntegration.last_used).toLocaleDateString() : 
                            'Never'
                          }
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => {
              const IconComponent = getCategoryIcon(category.id);
              const categoryCount = integrations.filter(i => i.category === category.id).length;
              
              return (
                <Card 
                  key={category.id} 
                  className="glass neon-border hover:bg-gray-800/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setActiveTab('marketplace');
                  }}
                >
                  <CardHeader className="text-center">
                    <IconComponent className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                    <CardTitle className="text-white">{category.name}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="text-center">
                    <Badge variant="secondary">
                      {categoryCount} integration{categoryCount !== 1 ? 's' : ''}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Integration Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="sm:max-w-[700px] glass neon-border max-h-[80vh] overflow-y-auto">
          {selectedIntegration && (
            <>
              <DialogHeader>
                <div className="flex items-center space-x-2">
                  {React.createElement(getCategoryIcon(selectedIntegration.category), {
                    className: "w-6 h-6 text-blue-400"
                  })}
                  <DialogTitle className="text-white">{selectedIntegration.name}</DialogTitle>
                </div>
                <DialogDescription className="text-gray-400">
                  {selectedIntegration.description}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-white">{selectedIntegration.rating || 0}</span>
                      <span className="text-gray-400">({selectedIntegration.review_count} reviews)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Download className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">{selectedIntegration.install_count} installs</span>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReviewDialog(true)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Write Review
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {selectedIntegration.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Integration Code Preview</h4>
                  <pre className="text-sm text-gray-300 overflow-x-auto">
                    <code>{selectedIntegration.code.substring(0, 500)}...</code>
                  </pre>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Version:</span>
                    <span className="text-white ml-2">{selectedIntegration.version}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Language:</span>
                    <span className="text-white ml-2">{selectedIntegration.language}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Author:</span>
                    <span className="text-white ml-2">{selectedIntegration.author}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Created:</span>
                    <span className="text-white ml-2">
                      {new Date(selectedIntegration.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setDetailsDialog(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Close
                </Button>
                {!isIntegrationInstalled(selectedIntegration.id) && (
                  <Button 
                    onClick={() => {
                      handleInstallIntegration(selectedIntegration.id);
                      setDetailsDialog(false);
                    }}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Install Integration
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="sm:max-w-[500px] glass neon-border">
          <DialogHeader>
            <DialogTitle className="text-white">Write a Review</DialogTitle>
            <DialogDescription className="text-gray-400">
              Share your experience with this integration
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300">Rating</label>
              <div className="flex space-x-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 cursor-pointer ${
                      star <= reviewData.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'
                    }`}
                    onClick={() => setReviewData({...reviewData, rating: star})}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300">Review (Optional)</label>
              <Textarea
                value={reviewData.review}
                onChange={(e) => setReviewData({...reviewData, review: e.target.value})}
                placeholder="Share your thoughts about this integration..."
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setReviewDialog(false);
                setReviewData({ rating: 5, review: '' });
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitReview}
              className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700"
            >
              Submit Review
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationMarketplaceAdvanced;