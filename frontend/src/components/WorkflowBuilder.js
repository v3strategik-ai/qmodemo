import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Workflow,
  Play,
  Pause,
  Square,
  Plus,
  Settings,
  Download,
  Upload,
  Copy,
  Trash2,
  Edit3,
  ZoomIn,
  ZoomOut,
  Save,
  Zap,
  GitBranch,
  Filter,
  Clock,
  Activity,
  CheckCircle,
  AlertCircle,
  XCircle,
  BarChart3,
  Eye,
  Layers,
  MousePointer,
  Brain,
  Database,
  Wifi,
  RotateCcw,
  Split,
  Bell,
  Code
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WorkflowBuilder = ({ currentUser }) => {
  const [workflows, setWorkflows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [workflowExecutions, setWorkflowExecutions] = useState([]);
  const [workflowMetrics, setWorkflowMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Canvas state
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // Form states
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const categories = [
    { value: 'general', label: 'General', description: 'Basic automation workflows' },
    { value: 'lead_qualification', label: 'Lead Qualification', description: 'Qualify and score leads automatically' },
    { value: 'email_automation', label: 'Email Automation', description: 'Automated email sequences and campaigns' },
    { value: 'task_management', label: 'Task Management', description: 'Task assignment and routing workflows' },
    { value: 'customer_support', label: 'Customer Support', description: 'Support ticket routing and responses' }
  ];

  const nodeTypes = [
    { 
      type: 'trigger', 
      name: 'Trigger', 
      icon: Zap, 
      color: 'bg-green-500', 
      description: 'Start workflow execution'
    },
    { 
      type: 'condition', 
      name: 'Condition', 
      icon: GitBranch, 
      color: 'bg-yellow-500', 
      description: 'Branch workflow based on conditions'
    },
    { 
      type: 'ai_response', 
      name: 'AI Response', 
      icon: Activity, 
      color: 'bg-purple-500', 
      description: 'Generate AI-powered responses'
    },
    { 
      type: 'action', 
      name: 'Action', 
      icon: Play, 
      color: 'bg-blue-500', 
      description: 'Execute specific actions'
    },
    { 
      type: 'integration', 
      name: 'Integration', 
      icon: Layers, 
      color: 'bg-orange-500', 
      description: 'Connect to external services'
    }
  ];

  useEffect(() => {
    if (currentUser) {
      loadWorkflows();
      loadTemplates();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedWorkflow) {
      loadWorkflowExecutions();
      loadWorkflowMetrics();
    }
  }, [selectedWorkflow]);

  const loadWorkflows = async () => {
    try {
      const response = await axios.get(`${API}/workflows/user/${currentUser.id}`);
      setWorkflows(response.data);
      
      if (response.data.length > 0 && !selectedWorkflow) {
        setSelectedWorkflow(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await axios.get(`${API}/workflow-templates`);
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadWorkflowExecutions = async () => {
    if (!selectedWorkflow) return;
    
    try {
      const response = await axios.get(`${API}/workflows/${selectedWorkflow.id}/executions?user_id=${currentUser.id}`);
      setWorkflowExecutions(response.data);
    } catch (error) {
      console.error('Failed to load workflow executions:', error);
    }
  };

  const loadWorkflowMetrics = async () => {
    if (!selectedWorkflow) return;
    
    try {
      const response = await axios.get(`${API}/workflows/${selectedWorkflow.id}/metrics?user_id=${currentUser.id}`);
      setWorkflowMetrics(response.data);
    } catch (error) {
      console.error('Failed to load workflow metrics:', error);
    }
  };

  const createWorkflow = async (useTemplate = false) => {
    if (!newWorkflowName.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }

    try {
      setLoading(true);
      
      const workflowData = {
        user_id: currentUser.id,
        name: newWorkflowName,
        description: newWorkflowDescription,
        category: selectedCategory,
        template_id: useTemplate ? selectedTemplate : undefined
      };

      const response = await axios.post(`${API}/workflows/create`, workflowData);
      
      setWorkflows(prev => [response.data, ...prev]);
      setSelectedWorkflow(response.data);
      setNewWorkflowName('');
      setNewWorkflowDescription('');
      setSelectedTemplate('');
      
      toast.success('Workflow created successfully!');
    } catch (error) {
      console.error('Failed to create workflow:', error);
      toast.error('Failed to create workflow');
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkflow = async (workflowId) => {
    try {
      await axios.delete(`${API}/workflows/${workflowId}?user_id=${currentUser.id}`);
      
      setWorkflows(prev => prev.filter(w => w.id !== workflowId));
      
      if (selectedWorkflow?.id === workflowId) {
        const remainingWorkflows = workflows.filter(w => w.id !== workflowId);
        setSelectedWorkflow(remainingWorkflows.length > 0 ? remainingWorkflows[0] : null);
      }
      
      toast.success('Workflow deleted successfully');
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      toast.error('Failed to delete workflow');
    }
  };

  const executeWorkflow = async () => {
    if (!selectedWorkflow) return;

    try {
      setLoading(true);
      
      await axios.post(`${API}/workflows/execute`, {
        workflow_id: selectedWorkflow.id,
        user_id: currentUser.id,
        trigger_data: { source: 'manual_execution' }
      });
      
      toast.success('Workflow executed successfully!');
      loadWorkflowExecutions();
      loadWorkflowMetrics();
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      toast.error('Failed to execute workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleCanvasMouseDown = (event) => {
    if (event.target === canvasRef.current) {
      setIsDragging(true);
      setDragStart({
        x: event.clientX - canvasOffset.x,
        y: event.clientY - canvasOffset.y
      });
    }
  };

  const handleCanvasMouseMove = useCallback((event) => {
    if (isDragging) {
      setCanvasOffset({
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const zoomIn = () => setCanvasScale(prev => Math.min(prev * 1.2, 3));
  const zoomOut = () => setCanvasScale(prev => Math.max(prev / 1.2, 0.3));
  const resetZoom = () => {
    setCanvasScale(1);
    setCanvasOffset({ x: 0, y: 0 });
  };

  const renderNode = (node) => {
    const nodeType = nodeTypes.find(nt => nt.type === node.type);
    const IconComponent = nodeType?.icon || Activity;
    
    return (
      <div
        key={node.id}
        className={`absolute w-32 h-20 ${nodeType?.color || 'bg-gray-500'} rounded-lg p-2 cursor-pointer transform transition-transform hover:scale-105 ${
          selectedNode?.id === node.id ? 'ring-2 ring-white' : ''
        }`}
        style={{
          left: node.position?.x || 0,
          top: node.position?.y || 0,
          transform: `scale(${canvasScale})`
        }}
        onClick={() => setSelectedNode(node)}
      >
        <div className="flex items-center gap-2 text-white">
          <IconComponent className="w-4 h-4" />
          <span className="text-xs font-medium truncate">{node.name}</span>
        </div>
        <p className="text-xs text-white/80 mt-1 line-clamp-2">{node.description}</p>
      </div>
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Workflow Builder</h2>
          <p className="text-gray-400 mt-1">
            {selectedWorkflow ? `Editing: ${selectedWorkflow.name}` : 'Create and manage automation workflows'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {selectedWorkflow && (
            <div className="flex items-center gap-2">
              <Button onClick={executeWorkflow} disabled={loading} className="tech-button">
                <Play className="w-4 h-4 mr-2" />
                {loading ? 'Running...' : 'Execute'}
              </Button>
              
              <Button variant="outline" className="glass neon-border">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          )}
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="tech-button">
                <Plus className="w-4 h-4 mr-2" />
                New Workflow
              </Button>
            </DialogTrigger>
            
            <DialogContent className="glass max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Workflow</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <Tabs defaultValue="scratch">
                  <TabsList className="glass neon-border">
                    <TabsTrigger value="scratch">From Scratch</TabsTrigger>
                    <TabsTrigger value="template">From Template</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="scratch" className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Workflow Name</label>
                      <Input
                        value={newWorkflowName}
                        onChange={(e) => setNewWorkflowName(e.target.value)}
                        placeholder="Enter workflow name"
                        className="glass neon-border"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                      <Textarea
                        value={newWorkflowDescription}
                        onChange={(e) => setNewWorkflowDescription(e.target.value)}
                        placeholder="Describe what this workflow does"
                        className="glass neon-border"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="glass neon-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass">
                          {categories.map(category => (
                            <SelectItem key={category.value} value={category.value}>
                              <div>
                                <p className="font-medium">{category.label}</p>
                                <p className="text-xs text-gray-400">{category.description}</p>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button onClick={() => createWorkflow(false)} className="w-full tech-button" disabled={loading}>
                      <Workflow className="w-4 h-4 mr-2" />
                      Create Workflow
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="template" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                      {templates.map((template) => (
                        <Card 
                          key={template.id} 
                          className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                            selectedTemplate === template.id ? 'ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() => setSelectedTemplate(template.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-white">{template.name}</h4>
                              <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                              
                              <div className="flex items-center gap-2 mt-3">
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                  {template.category.replace('_', ' ')}
                                </Badge>
                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                                  {template.complexity}
                                </Badge>
                                <span className="text-xs text-gray-500">{template.estimated_time}</span>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-sm text-gray-400">{template.usage_count} uses</div>
                              <div className="text-sm text-yellow-400">★ {template.rating}</div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Workflow Name</label>
                        <Input
                          value={newWorkflowName}
                          onChange={(e) => setNewWorkflowName(e.target.value)}
                          placeholder="Enter workflow name"
                          className="glass neon-border"
                        />
                      </div>
                      
                      <Button 
                        onClick={() => createWorkflow(true)} 
                        className="w-full tech-button" 
                        disabled={loading || !selectedTemplate}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Create from Template
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="design" className="w-full">
        <TabsList className="glass neon-border">
          <TabsTrigger value="design" className="flex items-center gap-2">
            <Workflow className="w-4 h-4" />
            Design
          </TabsTrigger>
          <TabsTrigger value="executions" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Executions
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Design Tab - Workflow Canvas */}
        <TabsContent value="design" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Workflow Canvas */}
            <div className="lg:col-span-3">
              <Card className="holographic h-[600px] relative overflow-hidden">
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                  <Select 
                    value={selectedWorkflow?.id || ''} 
                    onValueChange={(workflowId) => {
                      const workflow = workflows.find(w => w.id === workflowId);
                      setSelectedWorkflow(workflow);
                    }}
                  >
                    <SelectTrigger className="w-64 glass neon-border">
                      <SelectValue placeholder="Select workflow" />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      {workflows.map(workflow => (
                        <SelectItem key={workflow.id} value={workflow.id}>
                          <div className="flex items-center gap-2">
                            <Workflow className="w-4 h-4" />
                            {workflow.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedWorkflow && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteWorkflow(selectedWorkflow.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={zoomOut}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-white">{Math.round(canvasScale * 100)}%</span>
                  <Button variant="ghost" size="sm" onClick={zoomIn}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={resetZoom}>
                    <MousePointer className="w-4 h-4" />
                  </Button>
                </div>

                {/* Canvas */}
                <div
                  ref={canvasRef}
                  className="w-full h-full bg-gray-900/50 relative cursor-move"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)',
                    backgroundSize: '20px 20px',
                    transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`
                  }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                >
                  {selectedWorkflow ? (
                    <>
                      {/* Render Nodes */}
                      {selectedWorkflow.nodes?.map(renderNode)}
                      
                      {/* Render Connections */}
                      {selectedWorkflow.connections?.map((connection) => {
                        const sourceNode = selectedWorkflow.nodes?.find(n => n.id === connection.source_node_id);
                        const targetNode = selectedWorkflow.nodes?.find(n => n.id === connection.target_node_id);
                        
                        if (!sourceNode || !targetNode) return null;
                        
                        const startX = (sourceNode.position?.x || 0) + 128;
                        const startY = (sourceNode.position?.y || 0) + 40;
                        const endX = targetNode.position?.x || 0;
                        const endY = (targetNode.position?.y || 0) + 40;
                        
                        return (
                          <svg
                            key={connection.id}
                            className="absolute inset-0 pointer-events-none"
                            style={{ zIndex: 1 }}
                          >
                            <path
                              d={`M ${startX} ${startY} Q ${startX + 50} ${startY} ${endX - 50} ${endY} T ${endX} ${endY}`}
                              stroke="rgba(59, 130, 246, 0.6)"
                              strokeWidth="2"
                              fill="none"
                              className="animate-pulse"
                            />
                          </svg>
                        );
                      })}
                      
                      {selectedWorkflow.nodes?.length === 0 && (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center text-gray-400">
                            <Workflow className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Start Building Your Workflow</p>
                            <p className="text-sm mt-1">Drag nodes from the sidebar to create your automation</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-400">
                        <Workflow className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">Select or Create a Workflow</p>
                        <p className="text-sm mt-1">Choose a workflow to start designing</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Node Palette & Properties */}
            <div className="space-y-6">
              {/* Node Palette */}
              <Card className="holographic p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Node Types</h3>
                <div className="space-y-2">
                  {nodeTypes.map((nodeType) => (
                    <div
                      key={nodeType.type}
                      className={`${nodeType.color} rounded-lg p-3 cursor-grab hover:scale-105 transition-transform`}
                      draggable
                    >
                      <div className="flex items-center gap-2 text-white">
                        <nodeType.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{nodeType.name}</span>
                      </div>
                      <p className="text-xs text-white/80 mt-1">{nodeType.description}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Node Properties */}
              {selectedNode && (
                <Card className="holographic p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Node Properties</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                      <Input
                        value={selectedNode.name}
                        className="glass neon-border"
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                      <Textarea
                        value={selectedNode.description || ''}
                        className="glass neon-border"
                        rows={3}
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const nodeType = nodeTypes.find(nt => nt.type === selectedNode.type);
                          return nodeType ? (
                            <>
                              <div className={`w-6 h-6 ${nodeType.color} rounded flex items-center justify-center`}>
                                <nodeType.icon className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-white">{nodeType.name}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">Unknown</span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="mt-6">
          <Card className="holographic p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Execution History</h3>
              {selectedWorkflow && (
                <Button onClick={executeWorkflow} disabled={loading} className="tech-button">
                  <Play className="w-4 h-4 mr-2" />
                  Run Workflow
                </Button>
              )}
            </div>
            
            {workflowExecutions.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                <h4 className="text-lg font-semibold text-white mb-2">No Executions Yet</h4>
                <p className="text-gray-400 mb-6">Execute your workflow to see execution history</p>
                {selectedWorkflow && (
                  <Button onClick={executeWorkflow} className="tech-button">
                    <Play className="w-4 h-4 mr-2" />
                    Execute Now
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {workflowExecutions.map((execution) => (
                  <div key={execution.id} className="glass p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(execution.status)}
                        <div>
                          <p className="text-white font-medium">Execution #{execution.id.slice(-6)}</p>
                          <p className="text-sm text-gray-400">
                            Started {new Date(execution.started_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge 
                          className={
                            execution.status === 'completed' 
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : execution.status === 'failed'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          }
                        >
                          {execution.status}
                        </Badge>
                        {execution.execution_time_ms && (
                          <p className="text-sm text-gray-400 mt-1">
                            {execution.execution_time_ms}ms
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {execution.error_message && (
                      <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded">
                        <p className="text-red-400 text-sm">{execution.error_message}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          {workflowMetrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="holographic p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Executions</p>
                    <p className="text-2xl font-bold text-white">{workflowMetrics.total_executions}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="holographic p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Success Rate</p>
                    <p className="text-2xl font-bold text-white">{workflowMetrics.success_rate.toFixed(1)}%</p>
                  </div>
                </div>
              </Card>
              
              <Card className="holographic p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Avg. Duration</p>
                    <p className="text-2xl font-bold text-white">{Math.round(workflowMetrics.average_execution_time_ms)}ms</p>
                  </div>
                </div>
              </Card>
              
              <Card className="holographic p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Last 24h</p>
                    <p className="text-2xl font-bold text-white">{workflowMetrics.last_24h_executions}</p>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="holographic p-12 text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <h3 className="text-xl font-semibold text-white mb-2">No Analytics Available</h3>
              <p className="text-gray-400">Execute workflows to see performance analytics</p>
            </Card>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="holographic p-6 hover:scale-105 transition-transform">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-white mb-2">{template.name}</h3>
                    <p className="text-sm text-gray-400 line-clamp-3">{template.description}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                      {template.category.replace('_', ' ')}
                    </Badge>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                      {template.complexity}
                    </Badge>
                    {template.industry && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        {template.industry}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{template.estimated_time}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{template.usage_count} uses</span>
                      <span className="text-yellow-400">★ {template.rating}</span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full tech-button"
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setNewWorkflowName(`${template.name} Copy`);
                      createWorkflow(true);
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Use Template
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkflowBuilder;