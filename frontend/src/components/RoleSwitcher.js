import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { User, Crown, Users, Code, TrendingUp, Heart } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RoleSwitcher = ({ currentUser, onRoleChange }) => {
  const [availableRoles, setAvailableRoles] = useState([]);
  const [currentRole, setCurrentRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const roleIcons = {
    'CEO': Crown,
    'Manager': Users,
    'Employee': User,
    'Developer': Code,
    'Sales Rep': TrendingUp,
    'Customer Success': Heart
  };

  useEffect(() => {
    if (currentUser) {
      loadAvailableRoles();
      loadCurrentRole();
    }
  }, [currentUser]);

  const loadAvailableRoles = async () => {
    try {
      const response = await axios.get(`${API}/beta/roles/available`);
      setAvailableRoles(response.data.roles);
    } catch (error) {
      console.error('Failed to load available roles:', error);
    }
  };

  const loadCurrentRole = async () => {
    try {
      const response = await axios.get(`${API}/beta/roles/current/${currentUser.id}`);
      setCurrentRole(response.data);
    } catch (error) {
      console.error('Failed to load current role:', error);
    }
  };

  const handleRoleSwitch = async (roleName) => {
    try {
      setLoading(true);
      
      const response = await axios.post(`${API}/beta/roles/switch`, {
        user_id: currentUser.id,
        role_name: roleName
      });
      
      setCurrentRole(response.data.role);
      
      // Track role switch event
      await axios.post(`${API}/beta/analytics/track`, {
        user_id: currentUser.id,
        event_type: 'role_switched',
        feature_name: 'role_switcher',
        metadata: { 
          from_role: currentRole?.role_name,
          to_role: roleName 
        }
      });
      
      toast.success(`Switched to ${roleName} role`);
      
      // Notify parent component
      if (onRoleChange) {
        onRoleChange(response.data.role);
      }
      
      // Refresh page to apply role-specific UI changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Failed to switch role:', error);
      toast.error('Failed to switch role');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <Card className="glass p-4 role-switcher">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Try as Role</h3>
          <Badge variant="outline" className="text-xs">
            Beta Testing
          </Badge>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Current Role:</span>
          {currentRole && (
            <div className="flex items-center gap-2">
              {React.createElement(roleIcons[currentRole.role_name] || User, {
                className: "w-4 h-4 text-blue-400"
              })}
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                {currentRole.role_name}
              </Badge>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Switch to:</label>
          <Select onValueChange={handleRoleSwitch} disabled={loading}>
            <SelectTrigger className="glass neon-border">
              <SelectValue placeholder="Select a role to test..." />
            </SelectTrigger>
            <SelectContent className="glass border-gray-700">
              {availableRoles.map((role) => {
                const IconComponent = roleIcons[role.name] || User;
                return (
                  <SelectItem key={role.name} value={role.name}>
                    <div className="flex items-center gap-2">
                      <IconComponent className="w-4 h-4" />
                      <div>
                        <div className="font-medium">{role.name}</div>
                        <div className="text-xs text-gray-400">{role.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-xs text-gray-500 bg-black/20 p-2 rounded">
          💡 Each role shows different features and UI layouts. Switch roles to test how different users experience modQ.
        </div>
      </div>
    </Card>
  );
};

export default RoleSwitcher;