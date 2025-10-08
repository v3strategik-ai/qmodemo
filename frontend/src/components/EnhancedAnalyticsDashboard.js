import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  BarChart3, TrendingUp, Brain, Target, Zap, Eye, 
  Download, RefreshCw, Calendar, Filter, Plus,
  LineChart, PieChart, Activity, Lightbulb
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EnhancedAnalyticsDashboard = ({ currentUser }) => {
  const [reports, setReports] = useState([]);
  const [predictiveModels, setPredictiveModels] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState(null);

  // New report form
  const [newReport, setNewReport] = useState({
    name: '',
    description: '',
    report_type: 'dashboard',
    data_sources: [],
    filters: {}
  });

  // New predictive model form
  const [newModel, setNewModel] = useState({
    name: '',
    description: '',
    model_type: 'forecasting',
    target_metric: '',
    features: []
  });

  useEffect(() => {
    if (currentUser) {
      loadUserReports();
      loadPredictiveModels();
      loadAIInsights();
    }
  }, [currentUser]);

  const loadUserReports = async () => {
    try {
      const response = await axios.get(`${API}/analytics/reports/${currentUser.id}`);
      setReports(response.data.reports);
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  const loadPredictiveModels = async () => {
    try {
      const response = await axios.get(`${API}/analytics/predictive/models/${currentUser.id}`);
      setPredictiveModels(response.data.models);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const loadAIInsights = async () => {
    try {
      const response = await axios.get(`${API}/analytics/insights/${currentUser.id}`);
      setAiInsights(response.data.insights);
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  };

  const createReport = async () => {
    try {
      const reportData = {
        ...newReport,
        user_id: currentUser.id
      };

      await axios.post(`${API}/analytics/reports/create`, reportData);
      toast.success('Analytics report created successfully!');
      
      loadUserReports();
      setNewReport({
        name: '',
        description: '',
        report_type: 'dashboard',
        data_sources: [],
        filters: {}
      });
    } catch (error) {
      console.error('Create report error:', error);
      toast.error('Failed to create report');
    }
  };

  const generateReport = async (reportId) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/analytics/reports/${reportId}/generate`);
      setReportData(response.data);
      toast.success('Report generated successfully!');
    } catch (error) {
      console.error('Generate report error:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const createPredictiveModel = async () => {
    try {
      const modelData = {
        ...newModel,
        user_id: currentUser.id,
        training_data_source: 'user_activity',
        model_params: {
          algorithm: 'random_forest',
          cross_validation: true
        }
      };

      const response = await axios.post(`${API}/analytics/predictive/create-model`, modelData);
      toast.success(`Model created with ${(response.data.accuracy * 100).toFixed(1)}% accuracy!`);
      
      loadPredictiveModels();
      setNewModel({
        name: '',
        description: '',
        model_type: 'forecasting',
        target_metric: '',
        features: []
      });
    } catch (error) {
      console.error('Create model error:', error);
      toast.error('Failed to create predictive model');
    }
  };

  const generatePredictions = async (modelId) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/analytics/predictive/${modelId}/predict`, {
        input_data: {
          current_period: new Date().toISOString().slice(0, 7)
        }
      });
      
      toast.success('Predictions generated successfully!');
      console.log('Predictions:', response.data.predictions);
    } catch (error) {
      console.error('Generate predictions error:', error);
      toast.error('Failed to generate predictions');
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, trend, icon: Icon, color = "blue" }) => (
    <Card className="glass p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-${color}-500/20`}>
          <Icon className={`w-6 h-6 text-${color}-400`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            <TrendingUp className="w-4 h-4" />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-gray-400">{title}</div>
      </div>
    </Card>
  );

  const ChartVisualization = ({ data, type = "line" }) => {
    if (!data) return null;

    return (
      <Card className="glass p-6">
        <div className="flex items-center gap-2 mb-4">
          {type === "line" && <LineChart className="w-5 h-5 text-blue-400" />}
          {type === "pie" && <PieChart className="w-5 h-5 text-purple-400" />}
          {type === "bar" && <BarChart3 className="w-5 h-5 text-green-400" />}
          <h4 className="font-semibold text-white">{data.title}</h4>
        </div>
        
        <div className="space-y-3">
          {data.data?.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-gray-300">
                {item.date || item.category || item.source || `Item ${index + 1}`}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      type === "line" ? "bg-blue-500" :
                      type === "pie" ? "bg-purple-500" : "bg-green-500"
                    }`}
                    style={{ 
                      width: `${Math.min((item.users || item.value) / Math.max(...data.data.map(d => d.users || d.value)) * 100, 100)}%` 
                    }}
                  />
                </div>
                <span className="text-white text-sm w-12 text-right">
                  {item.users || item.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  if (!currentUser) {
    return (
      <Card className="glass p-8 text-center">
        <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">Please log in to access advanced analytics</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BarChart3 className="w-8 h-8 text-blue-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Enhanced Analytics & Reporting</h2>
            <p className="text-gray-400">Custom reports, predictive models, and AI insights</p>
          </div>
        </div>
        <Button
          onClick={() => {
            loadUserReports();
            loadPredictiveModels();
            loadAIInsights();
          }}
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-4 glass neon-border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Custom Reports</TabsTrigger>
          <TabsTrigger value="predictive">Predictive Models</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Reports"
                value={reports.length}
                icon={BarChart3}
                color="blue"
              />
              <MetricCard
                title="Predictive Models"
                value={predictiveModels.length}
                icon={Brain}
                color="purple"
              />
              <MetricCard
                title="AI Insights"
                value={aiInsights.length}
                icon={Lightbulb}
                color="yellow"
              />
              <MetricCard
                title="Success Rate"
                value="94.2%"
                trend={5.3}
                icon={Target}
                color="green"
              />
            </div>

            {/* Sample Data Visualization */}
            {reportData && reportData.report_data && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reportData.report_data.charts?.map((chart, index) => (
                  <ChartVisualization key={index} data={chart} type={chart.type} />
                ))}
              </div>
            )}

            {/* Recent AI Insights */}
            <Card className="glass p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent AI Insights</h3>
              <div className="space-y-3">
                {aiInsights.slice(0, 3).map((insight) => (
                  <div key={insight.id} className="p-4 bg-black/20 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">{insight.title}</h4>
                      <Badge 
                        variant="outline"
                        className={`text-xs ${
                          insight.priority === 'high' ? 'border-red-500 text-red-400' :
                          insight.priority === 'medium' ? 'border-yellow-500 text-yellow-400' :
                          'border-green-500 text-green-400'
                        }`}
                      >
                        {insight.priority} priority
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400">{insight.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="secondary" className="text-xs">
                        Impact: {insight.impact_score}/10
                      </Badge>
                      {insight.ai_generated && (
                        <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-300">
                          AI Generated
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Custom Reports Tab */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Report */}
            <Card className="glass p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Create Custom Report</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Report Name</label>
                  <Input
                    value={newReport.name}
                    onChange={(e) => setNewReport({...newReport, name: e.target.value})}
                    placeholder="Monthly Sales Report"
                    className="glass neon-border"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Description</label>
                  <Input
                    value={newReport.description}
                    onChange={(e) => setNewReport({...newReport, description: e.target.value})}
                    placeholder="Detailed analysis of monthly sales performance"
                    className="glass neon-border"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Report Type</label>
                  <Select 
                    value={newReport.report_type} 
                    onValueChange={(value) => setNewReport({...newReport, report_type: value})}
                  >
                    <SelectTrigger className="glass neon-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-gray-700">
                      <SelectItem value="dashboard">Dashboard</SelectItem>
                      <SelectItem value="chart">Chart</SelectItem>
                      <SelectItem value="table">Table</SelectItem>
                      <SelectItem value="export">Export</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={createReport}
                  disabled={!newReport.name || !newReport.report_type}
                  className="tech-button w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Report
                </Button>
              </div>
            </Card>

            {/* Reports List */}
            <Card className="glass p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Your Reports</h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {reports.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No reports created yet</p>
                  </div>
                ) : (
                  reports.map((report) => (
                    <div key={report.id} className="p-4 bg-black/20 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{report.name}</h4>
                        <Badge variant="outline" className="text-xs capitalize">
                          {report.report_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{report.description}</p>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => generateReport(report.id)}
                          disabled={loading}
                          size="sm"
                          className="tech-button"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Generate
                        </Button>
                        
                        {report.last_generated && (
                          <Badge variant="secondary" className="text-xs">
                            Last: {new Date(report.last_generated).toLocaleDateString()}
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

        {/* Predictive Models Tab */}
        <TabsContent value="predictive">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Model */}
            <Card className="glass p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Create Predictive Model</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Model Name</label>
                  <Input
                    value={newModel.name}
                    onChange={(e) => setNewModel({...newModel, name: e.target.value})}
                    placeholder="Sales Forecasting Model"
                    className="glass neon-border"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Model Type</label>
                  <Select 
                    value={newModel.model_type} 
                    onValueChange={(value) => setNewModel({...newModel, model_type: value})}
                  >
                    <SelectTrigger className="glass neon-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-gray-700">
                      <SelectItem value="forecasting">Forecasting</SelectItem>
                      <SelectItem value="classification">Classification</SelectItem>
                      <SelectItem value="clustering">Clustering</SelectItem>
                      <SelectItem value="regression">Regression</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Target Metric</label>
                  <Input
                    value={newModel.target_metric}
                    onChange={(e) => setNewModel({...newModel, target_metric: e.target.value})}
                    placeholder="monthly_revenue"
                    className="glass neon-border"
                  />
                </div>

                <Button
                  onClick={createPredictiveModel}
                  disabled={!newModel.name || !newModel.target_metric}
                  className="tech-button w-full"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Train Model
                </Button>
              </div>
            </Card>

            {/* Models List */}
            <Card className="glass p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Your Models</h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {predictiveModels.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No models created yet</p>
                  </div>
                ) : (
                  predictiveModels.map((model) => (
                    <div key={model.id} className="p-4 bg-black/20 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{model.name}</h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            model.status === 'ready' ? 'border-green-500 text-green-400' :
                            model.status === 'training' ? 'border-yellow-500 text-yellow-400' :
                            'border-red-500 text-red-400'
                          }`}
                        >
                          {model.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-400 capitalize">{model.model_type}</span>
                        {model.accuracy_score && (
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(model.accuracy_score * 100)}% accuracy
                          </Badge>
                        )}
                      </div>
                      
                      {model.status === 'ready' && (
                        <Button
                          onClick={() => generatePredictions(model.id)}
                          disabled={loading}
                          size="sm"
                          className="tech-button"
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          Predict
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights">
          <div className="grid grid-cols-1 gap-4">
            {aiInsights.map((insight) => (
              <Card key={insight.id} className="glass p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Lightbulb className="w-6 h-6 text-yellow-400" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">{insight.title}</h3>
                      <Badge 
                        variant="outline"
                        className={`text-xs mt-1 ${
                          insight.type === 'opportunity' ? 'border-green-500 text-green-400' :
                          insight.type === 'improvement' ? 'border-blue-500 text-blue-400' :
                          insight.type === 'insight' ? 'border-purple-500 text-purple-400' :
                          'border-yellow-500 text-yellow-400'
                        }`}
                      >
                        {insight.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant="outline"
                      className={`text-xs ${
                        insight.priority === 'high' ? 'border-red-500 text-red-400' :
                        insight.priority === 'medium' ? 'border-yellow-500 text-yellow-400' :
                        'border-green-500 text-green-400'
                      }`}
                    >
                      {insight.priority} priority
                    </Badge>
                    <div className="text-sm text-gray-400 mt-1">
                      Impact: {insight.impact_score}/10
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-300 mb-4">{insight.description}</p>
                
                {insight.full_analysis && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300">
                        <Eye className="w-3 h-3 mr-1" />
                        View Full Analysis
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{insight.title}</DialogTitle>
                      </DialogHeader>
                      <div className="text-gray-300 whitespace-pre-wrap">
                        {insight.full_analysis}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                
                {insight.ai_generated && (
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-300 text-xs mt-2">
                    Generated by AI
                  </Badge>
                )}
              </Card>
            ))}
            
            {aiInsights.length === 0 && (
              <Card className="glass p-8 text-center">
                <Lightbulb className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No AI insights available yet</p>
                <Button
                  onClick={loadAIInsights}
                  className="tech-button mt-4"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Insights
                </Button>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedAnalyticsDashboard;