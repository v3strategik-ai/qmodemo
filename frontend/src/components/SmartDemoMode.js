import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Play, Zap, Building, TrendingUp, Users, Briefcase, Heart } from 'lucide-react';
import { useAuth } from '../App';
import { toast } from 'sonner';

const SmartDemoMode = ({ onDemoLoaded, className = "" }) => {
  const [selectedDemo, setSelectedDemo] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const demoScenarios = [
    {
      id: 'techstart_sales',
      title: 'Sales Manager at TechStart Solutions',
      description: 'B2B SaaS company - Experience sales analytics, pipeline management, and growth strategies',
      icon: <TrendingUp className="w-5 h-5" />,
      company: 'TechStart Solutions',
      industry: 'Technology',
      role: 'Sales Manager',
      badge: 'SaaS Growth',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      mockUser: {
        id: 'demo-techstart-001',
        username: 'sarah_sales_manager',
        email: 'sarah@techstartsolutions.com',
        role: 'employee',
        company: 'TechStart Solutions'
      }
    },
    {
      id: 'consulting_strategist',
      title: 'Strategy Consultant at Growth Consulting',
      description: 'Management consulting - Explore client management, project frameworks, and business analysis',
      icon: <Briefcase className="w-5 h-5" />,
      company: 'Growth Consulting Group',
      industry: 'Consulting', 
      role: 'Senior Consultant',
      badge: 'Strategy Expert',
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      mockUser: {
        id: 'demo-consulting-001',
        username: 'mike_consultant',
        email: 'mike@growthconsultinggroup.com',
        role: 'employee',
        company: 'Growth Consulting Group'
      }
    },
    {
      id: 'ecommerce_owner',
      title: 'E-commerce Owner at InnovateCorp',
      description: 'Sustainable retail business - Test inventory management, customer analytics, and market insights',
      icon: <Building className="w-5 h-5" />,
      company: 'InnovateCorp',
      industry: 'Retail',
      role: 'Business Owner',
      badge: 'E-commerce Pro',
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      mockUser: {
        id: 'demo-ecommerce-001',
        username: 'alex_owner',
        email: 'alex@innovatecorp.com',
        role: 'employee',
        company: 'InnovateCorp'
      }
    },
    {
      id: 'fintech_analyst',
      title: 'Data Analyst at DataDrive Analytics',
      description: 'Financial technology - Dive into investment analysis, risk management, and data insights',
      icon: <TrendingUp className="w-5 h-5" />,
      company: 'DataDrive Analytics',
      industry: 'Finance',
      role: 'Senior Analyst',
      badge: 'FinTech Expert',
      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      mockUser: {
        id: 'demo-fintech-001',
        username: 'emma_analyst',
        email: 'emma@datadriveanalytics.com',
        role: 'employee',
        company: 'DataDrive Analytics'
      }
    },
    {
      id: 'healthcare_ops',
      title: 'Operations Manager at HealthTech Innovations',
      description: 'Digital health platform - Experience patient engagement, compliance, and operational efficiency',
      icon: <Heart className="w-5 h-5" />,
      company: 'HealthTech Innovations',
      industry: 'Healthcare',
      role: 'Operations Manager',
      badge: 'HealthTech Leader',
      color: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      mockUser: {
        id: 'demo-healthcare-001',
        username: 'david_ops_manager',
        email: 'david@healthtechinnovations.com',
        role: 'employee',
        company: 'HealthTech Innovations'
      }
    }
  ];

  const handleDemoSelect = async (demoId) => {
    const demo = demoScenarios.find(d => d.id === demoId);
    if (!demo) return;

    setLoading(true);
    try {
      // Simulate loading the demo user context
      await login(demo.mockUser);
      
      toast.success(`Welcome ${demo.role}! Demo scenario loaded successfully.`);
      
      if (onDemoLoaded) {
        onDemoLoaded(demo);
      }
      
    } catch (error) {
      console.error('Failed to load demo:', error);
      toast.error('Failed to load demo scenario');
    } finally {
      setLoading(false);
    }
  };

  const selectedDemoData = demoScenarios.find(d => d.id === selectedDemo);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Zap className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-bold text-white">Experience modQ Instantly</h3>
        </div>
        <p className="text-gray-400">
          Jump into a realistic business scenario with pre-loaded data and conversations
        </p>
      </div>

      {/* Demo Selection */}
      <div className="space-y-4">
        <Select value={selectedDemo} onValueChange={setSelectedDemo}>
          <SelectTrigger className="glass neon-border h-12">
            <SelectValue placeholder="Choose a business scenario to experience..." />
          </SelectTrigger>
          <SelectContent className="glass">
            {demoScenarios.map((demo) => (
              <SelectItem key={demo.id} value={demo.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="text-blue-400">
                    {demo.icon}
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white">{demo.title}</div>
                    <div className="text-xs text-gray-400">{demo.company} • {demo.industry}</div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Selected Demo Preview */}
        {selectedDemoData && (
          <Card className="holographic p-4 animate-in slide-in-from-top-2">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-blue-400">
                  {selectedDemoData.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-white">{selectedDemoData.title}</h4>
                  <p className="text-sm text-gray-400">{selectedDemoData.company}</p>
                </div>
              </div>
              <Badge className={selectedDemoData.color}>
                {selectedDemoData.badge}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-300 mb-4">
              {selectedDemoData.description}
            </p>
            
            {/* What's Included */}
            <div className="space-y-2 mb-4">
              <h5 className="text-sm font-medium text-gray-300">What's included:</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                  Pre-loaded company data
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                  Industry-specific knowledge base
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                  Sample AI conversations
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                  Role-based AI personality
                </div>
              </div>
            </div>
            
            <Button 
              onClick={() => handleDemoSelect(selectedDemo)}
              disabled={loading}
              className="w-full tech-button"
            >
              {loading ? (
                <>
                  <div className="loading-spinner mr-2" />
                  Loading Demo...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start {selectedDemoData.role} Experience
                </>
              )}
            </Button>
          </Card>
        )}
      </div>

      {/* Features Preview */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-700">
        <div className="text-center">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xs text-gray-400">Instant Setup</p>
        </div>
        <div className="text-center">
          <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xs text-gray-400">Real Scenarios</p>
        </div>
        <div className="text-center">
          <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-xs text-gray-400">Live Data</p>
        </div>
      </div>
    </div>
  );
};

export default SmartDemoMode;