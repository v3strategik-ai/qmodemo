import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, Building, Users, BarChart3, Settings, Zap, Globe, Shield, Bot, Star, CheckCircle } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState('enterprise');

  const modules = [
    {
      id: 'crm',
      name: 'CRM Suite',
      description: 'Complete customer relationship management with lead tracking, opportunity management, and sales pipeline',
      features: ['Lead Management', 'Sales Pipeline', 'Contact Database', 'Activity Tracking'],
      status: 'available',
      icon: <Users className="w-6 h-6" />
    },
    {
      id: 'messaging',
      name: 'Communication Hub',
      description: 'Slack-like messaging with video calls, screen sharing, and team collaboration',
      features: ['Team Messaging', 'Video Calls', 'Screen Share', 'File Sharing'],
      status: 'coming-soon',
      icon: <Globe className="w-6 h-6" />
    },
    {
      id: 'analytics',
      name: 'AI Analytics',
      description: 'Advanced business intelligence with predictive analytics and automated insights',
      features: ['Predictive Analytics', 'Custom Dashboards', 'Automated Reports', 'KPI Tracking'],
      status: 'available',
      icon: <BarChart3 className="w-6 h-6" />
    },
    {
      id: 'documents',
      name: 'Document Center',
      description: 'Template library, file converter, and document management system',
      features: ['Template Library', 'File Converter', 'Version Control', 'Collaboration'],
      status: 'available',
      icon: <Settings className="w-6 h-6" />
    },
    {
      id: 'automation',
      name: 'Workflow Automation',
      description: 'AI-powered workflow automation with intelligent agents',
      features: ['Process Automation', 'AI Agents', 'Custom Workflows', 'Integration APIs'],
      status: 'available',
      icon: <Zap className="w-6 h-6" />
    },
    {
      id: 'security',
      name: 'Security Suite',
      description: 'Bank-level security with anomaly detection and self-healing agents',
      features: ['Anomaly Detection', 'Auto Backup', 'Security Monitoring', 'Compliance'],
      status: 'available',
      icon: <Shield className="w-6 h-6" />
    }
  ];

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$99',
      period: '/month',
      description: 'Perfect for small teams getting started',
      features: [
        'Up to 10 users',
        'Basic CRM functionality',
        'Email automation',
        'Standard support',
        '5GB storage'
      ],
      popular: false
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$299',
      period: '/month',
      description: 'For growing businesses that need more power',
      features: [
        'Up to 50 users',
        'Full CRM suite',
        'Advanced analytics',
        'Workflow automation',
        'Priority support',
        '50GB storage',
        'Custom integrations'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'Tailored solutions for large organizations',
      features: [
        'Unlimited users',
        'All modules included',
        'White-label options',
        'Dedicated support',
        'Unlimited storage',
        'Custom development',
        'On-premise deployment',
        'Advanced security'
      ],
      popular: false
    }
  ];

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
              <h1 className="text-3xl font-bold text-gradient">Enterprise Dashboard</h1>
              <p className="text-gray-400">Modular Quantum Business Intelligence Platform</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              <Building className="w-3 h-3 mr-1" />
              Enterprise Ready
            </Badge>
          </div>
        </div>

        <div className="max-w-7xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <img 
                src="https://customer-assets.emergentagent.com/job_e5160009-8512-41e3-9e15-ca5ce341c758/artifacts/m183zmfa_Photoroom_20250910_212153.PNG"
                alt="modQ Logo"
                className="w-24 h-24 object-contain pulse-glow"
              />
            </div>
            <h2 className="text-4xl font-bold mb-4 text-white">
              The Complete Business Intelligence Ecosystem
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Modular, customizable, and AI-powered. Build exactly what your enterprise needs 
              with our comprehensive suite of business intelligence modules.
            </p>
          </div>

          {/* Modules Grid */}
          <section>
            <h3 className="text-2xl font-bold mb-8 text-center text-white">Available Modules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((module) => (
                <Card key={module.id} className="holographic p-6 interactive">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-blue-400">
                      {module.icon}
                    </div>
                    <Badge className={`${
                      module.status === 'available' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}>
                      {module.status === 'available' ? 'Available' : 'Coming Soon'}
                    </Badge>
                  </div>
                  
                  <h4 className="text-xl font-semibold mb-3 text-white">
                    {module.name}
                  </h4>
                  
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                    {module.description}
                  </p>
                  
                  <div className="space-y-2">
                    {module.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Pricing Section */}
          <section>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-4 text-white">Choose Your Plan</h3>
              <p className="text-gray-400">Scalable solutions that grow with your business</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`holographic p-8 interactive cursor-pointer relative ${
                    plan.popular ? 'ring-2 ring-blue-500/50' : ''
                  } ${selectedPlan === plan.id ? 'neon-border' : ''}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 px-4 py-1">
                        <Star className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h4 className="text-2xl font-bold mb-2 text-white">{plan.name}</h4>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-gradient">{plan.price}</span>
                      <span className="text-gray-400">{plan.period}</span>
                    </div>
                    <p className="text-gray-300 mb-6">{plan.description}</p>
                    
                    <div className="space-y-3 mb-8">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      className={`w-full ${
                        selectedPlan === plan.id 
                          ? 'tech-button' 
                          : 'glass neon-border hover:bg-white/10'
                      }`}
                    >
                      {plan.id === 'enterprise' ? 'Contact Sales' : 'Get Started'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Features Highlight */}
          <section className="text-center">
            <h3 className="text-2xl font-bold mb-8 text-white">Why Choose modQ?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: <Bot className="w-8 h-8" />,
                  title: "AI-First Approach",
                  description: "Built from the ground up with AI and machine learning at its core"
                },
                {
                  icon: <Zap className="w-8 h-8" />,
                  title: "Modular Design",
                  description: "Choose only what you need. Scale up as your business grows"
                },
                {
                  icon: <Shield className="w-8 h-8" />,
                  title: "Enterprise Security",
                  description: "Bank-level security with anomaly detection and auto-healing"
                },
                {
                  icon: <Users className="w-8 h-8" />,
                  title: "Ongoing Support",
                  description: "We continue working with you as on-call consultants"
                }
              ].map((feature, index) => (
                <Card key={index} className="glass p-6 text-center">
                  <div className="text-blue-400 mb-4 flex justify-center">
                    {feature.icon}
                  </div>
                  <h4 className="font-semibold mb-2 text-white">{feature.title}</h4>
                  <p className="text-sm text-gray-300">{feature.description}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center py-12">
            <div className="max-w-3xl mx-auto">
              <h3 className="text-3xl font-bold mb-4 text-white">
                Ready to Transform Your Business?
              </h3>
              <p className="text-xl text-gray-300 mb-8">
                Experience the future of business intelligence with our lightweight widget demo, 
                or schedule a consultation for the full enterprise solution.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg"
                  className="tech-button text-lg px-8 py-4"
                  onClick={() => navigate('/widget-demo')}
                >
                  <Bot className="w-5 h-5 mr-2" />
                  Try Widget Demo
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="glass neon-border text-lg px-8 py-4 hover:bg-white/10"
                >
                  <Building className="w-5 h-5 mr-2" />
                  Schedule Consultation
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;