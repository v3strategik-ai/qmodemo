import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './ui/table';
import { ArrowLeft, Shield, Users, MessageSquare, Settings, Database, Activity, Eye, Trash2, Download } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPortal = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Auth state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  // Data state
  const [users, setUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    totalMessages: 0,
    activeConfigs: 0,
    knowledgeItems: 0
  });

  const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'modQ2024!'
  };

  useEffect(() => {
    // Check if already authenticated
    const adminAuth = localStorage.getItem('modq_admin_auth');
    if (adminAuth === 'authenticated') {
      setIsAuthenticated(true);
      loadDashboardData();
    }
  }, []);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminUsername === ADMIN_CREDENTIALS.username && adminPassword === ADMIN_CREDENTIALS.password) {
      setIsAuthenticated(true);
      localStorage.setItem('modq_admin_auth', 'authenticated');
      toast.success('Admin login successful!');
      loadDashboardData();
    } else {
      toast.error('Invalid admin credentials');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('modq_admin_auth');
    setAdminUsername('');
    setAdminPassword('');
    navigate('/');
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load users
      const usersResponse = await axios.get(`${API}/auth/users`);
      setUsers(usersResponse.data);
      
      // Load system stats
      setSystemStats({
        totalUsers: usersResponse.data.length,
        totalMessages: 0, // We'll load this separately
        activeConfigs: 0,
        knowledgeItems: 0
      });
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadChatMessages = async () => {
    try {
      // Since we don't have a global chat endpoint, we'll load from individual users
      const allMessages = [];
      for (const user of users) {
        try {
          const response = await axios.get(`${API}/chat/history/${user.id}`);
          allMessages.push(...response.data.map(msg => ({ ...msg, username: user.username })));
        } catch (error) {
          // User might not have any messages
          console.log(`No messages for user ${user.username}`);
        }
      }
      setChatMessages(allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      toast.error('Failed to load chat messages');
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        // We'll need to implement this endpoint
        toast.success('User deletion functionality not yet implemented');
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  const exportData = () => {
    const data = {
      users,
      chatMessages,
      systemStats,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modq-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully!');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="circuit-bg" />
        <div className="bg-grid" />
        
        <Card className="glass p-8 w-full max-w-md relative z-10">
          <div className="text-center mb-6">
            <Shield className="w-16 h-16 mx-auto mb-4 text-blue-400" />
            <h2 className="text-2xl font-bold text-gradient">Admin Portal</h2>
            <p className="text-gray-400 mt-2">modQ Administration Access</p>
          </div>
          
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Admin Username</label>
              <Input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="Enter admin username"
                className="glass neon-border"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Admin Password</label>
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                className="glass neon-border"
                required
              />
            </div>
            
            <Button type="submit" className="w-full tech-button" disabled={loading}>
              <Shield className="w-4 h-4 mr-2" />
              Access Admin Portal
            </Button>
          </form>
          
          <div className="mt-6 p-4 glass rounded-lg">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Demo Credentials:</h3>
            <p className="text-xs text-gray-400">Username: <span className="text-blue-400 font-mono">admin</span></p>
            <p className="text-xs text-gray-400">Password: <span className="text-blue-400 font-mono">modQ2024!</span></p>
          </div>
          
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Landing
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gradient">Admin Portal</h1>
              <p className="text-gray-400">modQ System Administration</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <Activity className="w-3 h-3 mr-1" />
              System Online
            </Badge>
            <Button onClick={handleLogout} variant="outline" className="glass neon-border">
              Logout
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 glass neon-border">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat Messages
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                System
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="holographic p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Total Users</p>
                      <p className="text-3xl font-bold text-white">{systemStats.totalUsers}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-400" />
                  </div>
                </Card>
                
                <Card className="holographic p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Chat Messages</p>
                      <p className="text-3xl font-bold text-white">{chatMessages.length}</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-purple-400" />
                  </div>
                </Card>
                
                <Card className="holographic p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Active Configs</p>
                      <p className="text-3xl font-bold text-white">{systemStats.activeConfigs}</p>
                    </div>
                    <Settings className="w-8 h-8 text-green-400" />
                  </div>
                </Card>
                
                <Card className="holographic p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Knowledge Items</p>
                      <p className="text-3xl font-bold text-white">{systemStats.knowledgeItems}</p>
                    </div>
                    <Database className="w-8 h-8 text-orange-400" />
                  </div>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="holographic p-6">
                  <h3 className="text-xl font-semibold mb-4 text-white">Recent Users</h3>
                  <div className="space-y-3">
                    {users.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{user.username}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                        <Badge className={`${user.role === 'admin' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                          {user.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
                
                <Card className="holographic p-6">
                  <h3 className="text-xl font-semibold mb-4 text-white">System Actions</h3>
                  <div className="space-y-3">
                    <Button onClick={exportData} className="w-full glass neon-border hover:bg-white/10">
                      <Download className="w-4 h-4 mr-2" />
                      Export System Data
                    </Button>
                    <Button onClick={loadChatMessages} className="w-full glass neon-border hover:bg-white/10">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Load All Chat Messages
                    </Button>
                    <Button onClick={loadDashboardData} className="w-full glass neon-border hover:bg-white/10">
                      <Activity className="w-4 h-4 mr-2" />
                      Refresh Dashboard
                    </Button>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-6">
              <Card className="holographic">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">User Management</h3>
                    <Button onClick={loadDashboardData} variant="outline" className="glass neon-border">
                      Refresh Users
                    </Button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium text-white">{user.username}</TableCell>
                            <TableCell className="text-gray-300">{user.email}</TableCell>
                            <TableCell>
                              <Badge className={`${user.role === 'admin' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-400">
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="glass neon-border">
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="glass neon-border text-red-400 hover:text-red-300"
                                  onClick={() => deleteUser(user.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages" className="mt-6">
              <Card className="holographic">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">Chat Messages</h3>
                    <Button onClick={loadChatMessages} variant="outline" className="glass neon-border">
                      Load Messages
                    </Button>
                  </div>
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {chatMessages.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">
                        Click "Load Messages" to view all chat conversations
                      </p>
                    ) : (
                      chatMessages.map((message) => (
                        <div key={message.id} className="glass p-4 rounded-lg neon-border">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              {message.username}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {new Date(message.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="bg-blue-500/10 p-2 rounded text-sm">
                              <strong className="text-blue-400">User:</strong> {message.message}
                            </div>
                            <div className="bg-purple-500/10 p-2 rounded text-sm">
                              <strong className="text-purple-400">AI:</strong> {message.response}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* System Tab */}
            <TabsContent value="system" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="holographic p-6">
                  <h3 className="text-xl font-semibold mb-4 text-white">System Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Platform:</span>
                      <span className="text-white">modQ v1.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Environment:</span>
                      <span className="text-white">Production</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Database:</span>
                      <span className="text-white">MongoDB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">AI Integration:</span>
                      <span className="text-green-400">Emergent LLM Active</span>
                    </div>
                  </div>
                </Card>
                
                <Card className="holographic p-6">
                  <h3 className="text-xl font-semibold mb-4 text-white">Admin Actions</h3>
                  <div className="space-y-3">
                    <Button className="w-full glass neon-border hover:bg-white/10">
                      Clear System Cache
                    </Button>
                    <Button className="w-full glass neon-border hover:bg-white/10">
                      Update System Settings
                    </Button>
                    <Button className="w-full glass neon-border hover:bg-white/10">
                      Generate System Report
                    </Button>
                    <Button onClick={exportData} className="w-full tech-button">
                      <Download className="w-4 h-4 mr-2" />
                      Full System Export
                    </Button>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminPortal;