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
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Brain, 
  FileSpreadsheet, 
  Calendar, 
  Plus, 
  Settings, 
  Play, 
  Pause, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  Zap,
  Filter,
  Share2,
  Star,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const AdvancedAnalyticsDashboard = ({ currentUser }) => {
  const [dashboards, setDashboards] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [reportTemplates, setReportTemplates] = useState([]);
  const [predictiveModels, setPredictiveModels] = useState([]);
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [createType, setCreateType] = useState('dashboard');
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    type: 'pdf',
    category: 'general',
    calculation: '',
    target_value: 0,
    unit: '',
    model_type: 'classification',
    algorithm: 'random_forest',
    features: []
  });

  const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    if (currentUser) {
      loadAnalyticsData();
    }
  }, [currentUser]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Load overview
      const overviewResponse = await axios.get(`${API}/api/analytics/overview/${currentUser.id}`);
      setAnalyticsOverview(overviewResponse.data);
      
      // Load dashboards
      const dashboardsResponse = await axios.get(`${API}/api/analytics/dashboards/user/${currentUser.id}`);
      setDashboards(dashboardsResponse.data);
      
      // Load KPIs
      const kpisResponse = await axios.get(`${API}/api/analytics/kpis/user/${currentUser.id}`);
      setKpis(kpisResponse.data);
      
      // Load report templates
      const templatesResponse = await axios.get(`${API}/api/analytics/reports/templates/user/${currentUser.id}`);
      setReportTemplates(templatesResponse.data);
      
      // Load predictive models
      const modelsResponse = await axios.get(`${API}/api/analytics/models/user/${currentUser.id}`);
      setPredictiveModels(modelsResponse.data);
      
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async () => {
    try {
      let endpoint, data;
      
      switch (createType) {
        case 'dashboard':
          endpoint = '/analytics/dashboards/create';
          data = {
            name: newItem.name,
            description: newItem.description,
            user_id: currentUser.id,
            layout: {},
            widgets: [],
            filters: {}
          };
          break;
          
        case 'kpi':
          endpoint = '/analytics/kpis/create';
          data = {
            name: newItem.name,
            description: newItem.description,
            calculation: newItem.calculation,
            target_value: newItem.target_value,
            unit: newItem.unit,
            category: newItem.category,
            frequency: 'daily',
            threshold_config: {},
            user_id: currentUser.id
          };
          break;
          
        case 'report':
          endpoint = '/analytics/reports/templates/create';
          data = {
            name: newItem.name,
            description: newItem.description,
            type: newItem.type,
            template_data: {},
            parameters: [],
            recipients: [],
            user_id: currentUser.id
          };
          break;
          
        case 'model':
          endpoint = '/analytics/models/create';
          data = {
            name: newItem.name,
            description: newItem.description,
            model_type: newItem.model_type,
            algorithm: newItem.algorithm,
            features: newItem.features,
            user_id: currentUser.id
          };
          break;
          
        default:
          throw new Error('Invalid create type');
      }
      
      await axios.post(`${API}/api${endpoint}`, data);
      
      toast.success(`${createType.charAt(0).toUpperCase() + createType.slice(1)} created successfully!`);
      setCreateDialog(false);
      resetCreateForm();
      loadAnalyticsData();
      
    } catch (error) {
      console.error(`Failed to create ${createType}:`, error);
      toast.error(`Failed to create ${createType}`);
    }
  };

  const handleCalculateKPI = async (kpiId) => {
    try {
      const response = await axios.get(
        `${API}/api/analytics/kpis/${kpiId}/calculate?user_id=${currentUser.id}&time_range=7d`
      );
      
      const result = response.data;
      toast.success(`${result.kpi_name}: ${result.current_value} ${result.unit || ''}`);
      
    } catch (error) {
      console.error('Failed to calculate KPI:', error);
      toast.error('Failed to calculate KPI');
    }
  };

  const handleGenerateReport = async (templateId) => {
    try {
      const response = await axios.post(
        `${API}/api/analytics/reports/generate/${templateId}?user_id=${currentUser.id}`,
        { parameters: {} }
      );
      
      const result = response.data;
      toast.success(`Report "${result.template_name}" generated successfully!`);
      
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error('Failed to generate report');
    }
  };

  const handleMakePrediction = async (modelId) => {
    try {
      const sampleData = {
        age: 35,
        income: 75000,
        previous_purchases: 5,
        engagement_score: 0.8
      };
      
      const response = await axios.post(
        `${API}/api/analytics/models/${modelId}/predict?user_id=${currentUser.id}`,
        sampleData
      );
      
      const result = response.data;
      toast.success(`Prediction: ${result.prediction} (${Math.round(result.confidence * 100)}% confidence)`);
      
    } catch (error) {
      console.error('Failed to make prediction:', error);
      toast.error('Failed to make prediction');
    }
  };

  const resetCreateForm = () => {
    setNewItem({
      name: '',
      description: '',
      type: 'pdf',
      category: 'general',
      calculation: '',
      target_value: 0,
      unit: '',
      model_type: 'classification',
      algorithm: 'random_forest',
      features: []
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertTriangle;
      default: return Activity;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-400">Loading Advanced Analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Advanced Analytics</h2>
          <p className="text-gray-400">Create dashboards, KPIs, reports, and predictive models</p>
        </div>
        
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[600px] glass neon-border max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Create Analytics Asset</DialogTitle>
              <DialogDescription className="text-gray-400">
                Create a new dashboard, KPI, report template, or predictive model
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Type</label>
                <Select value={createType} onValueChange={setCreateType}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="kpi">KPI</SelectItem>
                    <SelectItem value="report">Report Template</SelectItem>
                    <SelectItem value="model">Predictive Model</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Name</label>
                  <Input
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    placeholder={`${createType.charAt(0).toUpperCase() + createType.slice(1)} name`}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                
                {createType === 'report' && (
                  <div>
                    <label className="text-sm font-medium text-gray-300">Format</label>
                    <Select value={newItem.type} onValueChange={(value) => setNewItem({...newItem, type: value})}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="powerpoint">PowerPoint</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {createType === 'kpi' && (
                  <div>
                    <label className="text-sm font-medium text-gray-300">Category</label>
                    <Select value={newItem.category} onValueChange={(value) => setNewItem({...newItem, category: value})}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300">Description</label>
                <Textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  placeholder="Describe the purpose and functionality..."
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              
              {createType === 'kpi' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Target Value</label>
                    <Input
                      type="number"
                      value={newItem.target_value}
                      onChange={(e) => setNewItem({...newItem, target_value: parseFloat(e.target.value) || 0})}
                      placeholder="100"
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300">Unit</label>
                    <Input
                      value={newItem.unit}
                      onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                      placeholder="%, $, units"
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
              )}
              
              {createType === 'kpi' && (
                <div>
                  <label className="text-sm font-medium text-gray-300">Calculation Logic</label>
                  <Textarea
                    value={newItem.calculation}
                    onChange={(e) => setNewItem({...newItem, calculation: e.target.value})}
                    placeholder="SELECT COUNT(*) FROM sales WHERE date >= CURRENT_DATE - INTERVAL '30 days'"
                    className="bg-gray-800 border-gray-600 text-white font-mono text-sm"
                  />
                </div>
              )}
              
              {createType === 'model' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Model Type</label>
                    <Select value={newItem.model_type} onValueChange={(value) => setNewItem({...newItem, model_type: value})}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classification">Classification</SelectItem>
                        <SelectItem value="regression">Regression</SelectItem>
                        <SelectItem value="clustering">Clustering</SelectItem>
                        <SelectItem value="forecasting">Forecasting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-300">Algorithm</label>
                    <Select value={newItem.algorithm} onValueChange={(value) => setNewItem({...newItem, algorithm: value})}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="random_forest">Random Forest</SelectItem>
                        <SelectItem value="linear_regression">Linear Regression</SelectItem>
                        <SelectItem value="neural_network">Neural Network</SelectItem>
                        <SelectItem value="svm">Support Vector Machine</SelectItem>
                        <SelectItem value="gradient_boosting">Gradient Boosting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
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
                onClick={handleCreateItem}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              >
                Create {createType.charAt(0).toUpperCase() + createType.slice(1)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 glass neon-border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="models">ML Models</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {analyticsOverview && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="glass neon-border">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-300">Dashboards</CardTitle>
                    <BarChart3 className="h-4 w-4 text-blue-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{analyticsOverview.summary.dashboards}</div>
                    <p className="text-xs text-gray-400">Active dashboards</p>
                  </CardContent>
                </Card>
                
                <Card className="glass neon-border">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-300">KPIs</CardTitle>
                    <Target className="h-4 w-4 text-green-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{analyticsOverview.summary.kpis}</div>
                    <p className="text-xs text-gray-400">Tracked metrics</p>
                  </CardContent>
                </Card>
                
                <Card className="glass neon-border">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-300">ML Models</CardTitle>
                    <Brain className="h-4 w-4 text-purple-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{analyticsOverview.summary.predictive_models}</div>
                    <p className="text-xs text-gray-400">
                      {analyticsOverview.quick_stats.production_models} in production
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="glass neon-border">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-300">Reports</CardTitle>
                    <FileSpreadsheet className="h-4 w-4 text-orange-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{analyticsOverview.summary.report_templates}</div>
                    <p className="text-xs text-gray-400">Automated templates</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="glass neon-border">
                <CardHeader>
                  <CardTitle className="text-white">Recent Dashboards</CardTitle>
                  <CardDescription className="text-gray-400">Your most recently updated dashboards</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsOverview.recent_dashboards.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No dashboards created yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analyticsOverview.recent_dashboards.map((dashboard) => (
                        <div key={dashboard.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <BarChart3 className="w-5 h-5 text-blue-400" />
                            <div>
                              <p className="font-medium text-white">{dashboard.name}</p>
                              <p className="text-sm text-gray-400">
                                Updated {new Date(dashboard.updated_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Eye className="w-3 h-3" />
                              <span>{dashboard.view_count}</span>
                            </div>
                            <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300">
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="dashboards" className="space-y-6">
          {dashboards.length === 0 ? (
            <Card className="glass neon-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Dashboards Yet</h3>
                <p className="text-gray-400 text-center mb-6">
                  Create your first analytics dashboard to visualize your data
                </p>
                <Button 
                  onClick={() => {
                    setCreateType('dashboard');
                    setCreateDialog(true);
                  }}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Dashboard
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboards.map((dashboard) => (
                <Card key={dashboard.id} className="glass neon-border hover:bg-gray-800/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                        {dashboard.is_favorite && <Star className="w-4 h-4 text-yellow-400" />}
                      </div>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                          <Settings className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                          <Share2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-white">{dashboard.name}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {dashboard.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span>{dashboard.view_count} views</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Refresh: {dashboard.refresh_interval}s</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="kpis" className="space-y-6">
          {kpis.length === 0 ? (
            <Card className="glass neon-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No KPIs Defined</h3>
                <p className="text-gray-400 text-center mb-6">
                  Create KPIs to track your key performance indicators
                </p>
                <Button 
                  onClick={() => {
                    setCreateType('kpi');
                    setCreateDialog(true);
                  }}
                  className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create KPI
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {kpis.map((kpi) => (
                <Card key={kpi.id} className="glass neon-border">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <Target className="w-5 h-5 text-green-400" />
                        <Badge variant="secondary" className="text-xs">
                          {kpi.category.toUpperCase()}
                        </Badge>
                      </div>
                      <Badge variant="outline" className={`text-xs ${kpi.is_active ? 'text-green-400' : 'text-gray-400'}`}>
                        {kpi.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <CardTitle className="text-white">{kpi.name}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {kpi.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Target:</span>
                        <span className="text-white ml-2">
                          {kpi.target_value} {kpi.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Frequency:</span>
                        <span className="text-white ml-2">{kpi.frequency}</span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Calculation Logic:</p>
                      <code className="text-xs text-gray-300 font-mono">
                        {kpi.calculation.substring(0, 100)}{kpi.calculation.length > 100 ? '...' : ''}
                      </code>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleCalculateKPI(kpi.id)}
                        className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                      >
                        <Activity className="w-3 h-3 mr-1" />
                        Calculate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {reportTemplates.length === 0 ? (
            <Card className="glass neon-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileSpreadsheet className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Report Templates</h3>
                <p className="text-gray-400 text-center mb-6">
                  Create automated report templates for regular reporting
                </p>
                <Button 
                  onClick={() => {
                    setCreateType('report');
                    setCreateDialog(true);
                  }}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Report Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reportTemplates.map((template) => (
                <Card key={template.id} className="glass neon-border">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <FileSpreadsheet className="w-5 h-5 text-orange-400" />
                        <Badge variant="secondary" className="text-xs">
                          {template.type.toUpperCase()}
                        </Badge>
                      </div>
                      <Badge variant="outline" className={`text-xs ${template.is_active ? 'text-green-400' : 'text-gray-400'}`}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <CardTitle className="text-white">{template.name}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {template.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>Generated: {template.generation_count} times</span>
                      <span>
                        Last: {template.last_generated ? 
                          new Date(template.last_generated).toLocaleDateString() : 
                          'Never'
                        }
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleGenerateReport(template.id)}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Generate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          {predictiveModels.length === 0 ? (
            <Card className="glass neon-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No ML Models</h3>
                <p className="text-gray-400 text-center mb-6">
                  Create predictive models for advanced analytics and forecasting
                </p>
                <Button 
                  onClick={() => {
                    setCreateType('model');
                    setCreateDialog(true);
                  }}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create ML Model
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {predictiveModels.map((model) => (
                <Card key={model.id} className="glass neon-border">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <Brain className="w-5 h-5 text-purple-400" />
                        <Badge variant="secondary" className="text-xs">
                          {model.model_type.toUpperCase()}
                        </Badge>
                      </div>
                      <Badge variant="outline" className={`text-xs ${model.is_production ? 'text-green-400' : 'text-yellow-400'}`}>
                        {model.is_production ? 'Production' : 'Training'}
                      </Badge>
                    </div>
                    <CardTitle className="text-white">{model.name}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {model.description || `${model.algorithm} model`}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Algorithm:</span>
                        <span className="text-white ml-2">{model.algorithm}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Features:</span>
                        <span className="text-white ml-2">{model.features.length}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <span className="text-gray-400">Training Size:</span>
                      <span className="text-white ml-2">{model.training_data_size} records</span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleMakePrediction(model.id)}
                        disabled={!model.is_production}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:opacity-50"
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Predict
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;