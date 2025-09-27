import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Users, 
  Plus, 
  Mail, 
  Settings, 
  Crown,
  Shield, 
  User,
  Clock,
  Activity,
  MessageSquare,
  BarChart3,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Calendar,
  Trash2,
  Edit3,
  Copy,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TeamCollaboration = ({ currentUser }) => {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [sharedConversations, setSharedConversations] = useState([]);
  const [teamActivities, setTeamActivities] = useState([]);
  const [teamAnalytics, setTeamAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [sharedConversationTitle, setSharedConversationTitle] = useState('');

  const roles = [
    { value: 'employee', label: 'Employee', icon: User, description: 'Basic team member access' },
    { value: 'manager', label: 'Manager', icon: Users, description: 'Can manage team conversations and view analytics' },
    { value: 'admin', label: 'Admin', icon: Shield, description: 'Full team management except ownership transfer' },
    { value: 'owner', label: 'Owner', icon: Crown, description: 'Complete control over team and settings' }
  ];

  useEffect(() => {
    if (currentUser) {
      loadUserTeams();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamData();
    }
  }, [selectedTeam]);

  const loadUserTeams = async () => {
    try {
      const response = await axios.get(`${API}/teams/user/${currentUser.id}`);
      setTeams(response.data);
      
      // Select first team if available
      if (response.data.length > 0 && !selectedTeam) {
        setSelectedTeam(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const loadTeamData = async () => {
    if (!selectedTeam) return;
    
    try {
      // Load team members
      const membersResponse = await axios.get(`${API}/teams/${selectedTeam.id}/members`);
      setTeamMembers(membersResponse.data);
      
      // Load shared conversations
      const conversationsResponse = await axios.get(`${API}/teams/${selectedTeam.id}/shared-conversations?user_id=${currentUser.id}`);
      setSharedConversations(conversationsResponse.data);
      
      // Load team activities
      const activitiesResponse = await axios.get(`${API}/teams/${selectedTeam.id}/activities?user_id=${currentUser.id}&limit=20`);
      setTeamActivities(activitiesResponse.data);
      
      // Load team analytics
      const analyticsResponse = await axios.get(`${API}/teams/${selectedTeam.id}/analytics?user_id=${currentUser.id}`);
      setTeamAnalytics(analyticsResponse.data);
      
    } catch (error) {
      console.error('Failed to load team data:', error);
      // Handle permission errors gracefully
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view this team data');
      }
    }
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API}/teams/create`, {
        name: newTeamName,
        description: newTeamDescription,
        owner_id: currentUser.id
      });

      setTeams(prev => [response.data, ...prev]);
      setSelectedTeam(response.data);
      setNewTeamName('');
      setNewTeamDescription('');
      
      toast.success(`Team "${response.data.name}" created successfully!`);
    } catch (error) {
      console.error('Failed to create team:', error);
      toast.error('Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const inviteTeamMember = async () => {
    if (!inviteEmail.trim() || !selectedTeam) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API}/teams/invite`, {
        team_id: selectedTeam.id,
        email: inviteEmail,
        role: inviteRole,
        inviter_id: currentUser.id
      });

      setInviteEmail('');
      setInviteRole('employee');
      
      toast.success(`Invitation sent to ${inviteEmail}!`);
      loadTeamData(); // Refresh activities
    } catch (error) {
      console.error('Failed to invite member:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to invite members');
      } else if (error.response?.status === 409) {
        toast.error('User is already invited or is a team member');
      } else {
        toast.error('Failed to send invitation');
      }
    } finally {
      setLoading(false);
    }
  };

  const createSharedConversation = async () => {
    if (!sharedConversationTitle.trim() || !selectedTeam) {
      toast.error('Please enter a conversation title');
      return;
    }

    try {
      setLoading(true);
      
      // Create a new session first (similar to how individual sessions work)
      const sessionResponse = await axios.post(`${API}/sessions/new?user_id=${currentUser.id}`);
      
      // Then create shared conversation linked to that session
      await axios.post(`${API}/teams/shared-conversations/create`, {
        team_id: selectedTeam.id,
        session_id: sessionResponse.data.id,
        title: sharedConversationTitle,
        creator_id: currentUser.id,
        is_public: true
      });

      setSharedConversationTitle('');
      loadTeamData(); // Refresh conversations and activities
      
      toast.success(`Shared conversation "${sharedConversationTitle}" created!`);
    } catch (error) {
      console.error('Failed to create shared conversation:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to create shared conversations');
      } else {
        toast.error('Failed to create shared conversation');
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    const roleData = roles.find(r => r.value === role);
    return roleData ? roleData.icon : User;
  };

  const getRoleBadge = (role) => {
    const colors = {
      owner: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      admin: 'bg-red-500/20 text-red-400 border-red-500/30',
      manager: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      employee: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    
    const RoleIcon = getRoleIcon(role);
    
    return (
      <Badge className={colors[role] || colors.employee}>
        <RoleIcon className="w-3 h-3 mr-1" />
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Team Collaboration</h2>
          <p className="text-gray-400 mt-1">
            {selectedTeam ? `Managing ${selectedTeam.name}` : 'Manage your team workspaces'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {teams.length > 1 && (
            <Select value={selectedTeam?.id || ''} onValueChange={(teamId) => {
              const team = teams.find(t => t.id === teamId);
              setSelectedTeam(team);
            }}>
              <SelectTrigger className="w-64 glass neon-border">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent className="glass">
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {team.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="tech-button">
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent className="glass">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Team Name</label>
                  <Input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Enter team name"
                    className="glass neon-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <Textarea
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    placeholder="Optional team description"
                    className="glass neon-border"
                    rows={3}
                  />
                </div>
                <Button onClick={createTeam} className="w-full tech-button" disabled={loading}>
                  <Users className="w-4 h-4 mr-2" />
                  Create Team
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* No Teams State */}
      {teams.length === 0 && (
        <Card className="holographic p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold text-white mb-2">Welcome to Team Collaboration</h3>
          <p className="text-gray-400 mb-6">
            Create your first team workspace to start collaborating with your colleagues on AI-powered business insights.
          </p>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="tech-button">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Team
              </Button>
            </DialogTrigger>
            <DialogContent className="glass">
              <DialogHeader>
                <DialogTitle className="text-white">Create Your First Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Team Name</label>
                  <Input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g., Marketing Team, Sales Department"
                    className="glass neon-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <Textarea
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    placeholder="What does your team work on?"
                    className="glass neon-border"
                    rows={3}
                  />
                </div>
                <Button onClick={createTeam} className="w-full tech-button" disabled={loading}>
                  <Users className="w-4 h-4 mr-2" />
                  Create Team
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </Card>
      )}

      {/* Team Content */}
      {selectedTeam && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="glass neon-border">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members ({teamMembers.length})
            </TabsTrigger>
            <TabsTrigger value="conversations" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Shared Conversations ({sharedConversations.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Team Stats */}
              <div className="lg:col-span-2 space-y-6">
                {/* Analytics Cards */}
                {teamAnalytics && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="holographic p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Team Members</p>
                          <p className="text-2xl font-bold text-white">{teamAnalytics.members_count}</p>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="holographic p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Shared Conversations</p>
                          <p className="text-2xl font-bold text-white">{teamAnalytics.shared_conversations_count}</p>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="holographic p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Recent Activity</p>
                          <p className="text-2xl font-bold text-white">{teamAnalytics.recent_activities_count}</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Role Distribution */}
                {teamAnalytics?.role_breakdown && (
                  <Card className="holographic p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Team Role Distribution</h3>
                    <div className="space-y-3">
                      {Object.entries(teamAnalytics.role_breakdown).map(([role, count]) => (
                        <div key={role} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getRoleIcon(role) && React.createElement(getRoleIcon(role), { className: "w-4 h-4 text-gray-400" })}
                            <span className="text-gray-300 capitalize">{role}</span>
                          </div>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            {count} member{count !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {/* Team Info Sidebar */}
              <div className="space-y-6">
                <Card className="holographic p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Team Information</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-400">Team Name</p>
                      <p className="text-white font-medium">{selectedTeam.name}</p>
                    </div>
                    {selectedTeam.description && (
                      <div>
                        <p className="text-sm text-gray-400">Description</p>
                        <p className="text-gray-300 text-sm">{selectedTeam.description}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-400">Created</p>
                      <p className="text-gray-300 text-sm">
                        {new Date(selectedTeam.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Your Role</p>
                      {teamMembers.find(m => m.user_id === currentUser.id) && 
                        getRoleBadge(teamMembers.find(m => m.user_id === currentUser.id).role)
                      }
                    </div>
                  </div>
                </Card>

                {/* Quick Actions */}
                <Card className="holographic p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full glass neon-border">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Invite Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="glass">
                        <DialogHeader>
                          <DialogTitle className="text-white">Invite Team Member</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                            <Input
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="colleague@company.com"
                              className="glass neon-border"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                            <Select value={inviteRole} onValueChange={setInviteRole}>
                              <SelectTrigger className="glass neon-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="glass">
                                {roles.filter(role => role.value !== 'owner').map(role => (
                                  <SelectItem key={role.value} value={role.value}>
                                    <div className="flex items-center gap-2">
                                      <role.icon className="w-4 h-4" />
                                      <div>
                                        <p className="font-medium">{role.label}</p>
                                        <p className="text-xs text-gray-400">{role.description}</p>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={inviteTeamMember} className="w-full tech-button" disabled={loading}>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Invitation
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full glass neon-border">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          New Shared Chat
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="glass">
                        <DialogHeader>
                          <DialogTitle className="text-white">Create Shared Conversation</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Conversation Title</label>
                            <Input
                              value={sharedConversationTitle}
                              onChange={(e) => setSharedConversationTitle(e.target.value)}
                              placeholder="e.g., Q4 Strategy Planning"
                              className="glass neon-border"
                            />
                          </div>
                          <Button onClick={createSharedConversation} className="w-full tech-button" disabled={loading}>
                            <Share2 className="w-4 h-4 mr-2" />
                            Create Shared Conversation
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {teamMembers.map((member) => (
                <Card key={member.id} className="holographic p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Member #{member.user_id.slice(-6)}</p>
                        <p className="text-sm text-gray-400">
                          Joined {formatTimeAgo(member.joined_at)}
                        </p>
                      </div>
                    </div>
                    {getRoleBadge(member.role)}
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Status:</span>
                      <Badge className={member.status === 'active' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                        : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}>
                        {member.status}
                      </Badge>
                    </div>
                    
                    {member.last_active && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Last Active:</span>
                        <span className="text-gray-300">{formatTimeAgo(member.last_active)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Permissions Preview */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-400 mb-2">Key Permissions:</p>
                    <div className="flex flex-wrap gap-1">
                      {member.permissions?.can_invite_members && (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                          Can Invite
                        </Badge>
                      )}
                      {member.permissions?.can_manage_integrations && (
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                          Manage Integrations
                        </Badge>
                      )}
                      {member.permissions?.can_view_analytics && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                          View Analytics
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              
              {/* Invite New Member Card */}
              <Dialog>
                <DialogTrigger asChild>
                  <Card className="holographic p-6 border-dashed border-white/30 hover:border-white/50 cursor-pointer transition-colors">
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <UserPlus className="w-12 h-12 text-gray-500 mb-4" />
                      <p className="font-medium text-gray-400 mb-2">Invite New Member</p>
                      <p className="text-sm text-gray-500">Add someone to your team</p>
                    </div>
                  </Card>
                </DialogTrigger>
                <DialogContent className="glass">
                  <DialogHeader>
                    <DialogTitle className="text-white">Invite Team Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className="glass neon-border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger className="glass neon-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass">
                          {roles.filter(role => role.value !== 'owner').map(role => (
                            <SelectItem key={role.value} value={role.value}>
                              <div className="flex items-center gap-2">
                                <role.icon className="w-4 h-4" />
                                <div>
                                  <p className="font-medium">{role.label}</p>
                                  <p className="text-xs text-gray-400">{role.description}</p>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={inviteTeamMember} className="w-full tech-button" disabled={loading}>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invitation
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          {/* Shared Conversations Tab */}
          <TabsContent value="conversations" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sharedConversations.map((conversation) => (
                <Card key={conversation.id} className="holographic p-6 hover:scale-105 transition-transform cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white mb-2">{conversation.title}</h3>
                      <p className="text-sm text-gray-400 mb-4">
                        Created {formatTimeAgo(conversation.created_at)}
                      </p>
                    </div>
                    {conversation.is_public ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Public
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                        Private
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Users className="w-4 h-4" />
                      {conversation.participants.length} participant{conversation.participants.length !== 1 ? 's' : ''}
                    </div>
                    
                    <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Join Chat
                    </Button>
                  </div>
                </Card>
              ))}
              
              {/* Create New Conversation Card */}
              <Dialog>
                <DialogTrigger asChild>
                  <Card className="holographic p-6 border-dashed border-white/30 hover:border-white/50 cursor-pointer transition-colors">
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageSquare className="w-12 h-12 text-gray-500 mb-4" />
                      <p className="font-medium text-gray-400 mb-2">Start New Conversation</p>
                      <p className="text-sm text-gray-500">Create a shared AI conversation</p>
                    </div>
                  </Card>
                </DialogTrigger>
                <DialogContent className="glass">
                  <DialogHeader>
                    <DialogTitle className="text-white">Create Shared Conversation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Conversation Title</label>
                      <Input
                        value={sharedConversationTitle}
                        onChange={(e) => setSharedConversationTitle(e.target.value)}
                        placeholder="e.g., Q4 Strategy Planning"
                        className="glass neon-border"
                      />
                    </div>
                    <Button onClick={createSharedConversation} className="w-full tech-button" disabled={loading}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Create Shared Conversation
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-6">
            <Card className="holographic p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Team Activity Feed</h3>
              
              {teamActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-400">No team activity yet</p>
                  <p className="text-sm text-gray-500 mt-1">Team activities will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 glass rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <Activity className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(activity.created_at)}
                          </span>
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                            {activity.activity_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default TeamCollaboration;