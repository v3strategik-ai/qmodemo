import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowRight, Bot, Zap, Shield, Globe, Brain, Sparkles, Rocket, Target, Users, Settings } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const features = [
    {
      icon: <Bot className="w-8 h-8" />,
      title: "AI Super Agent",
      description: "Ultra-intelligent assistant that acts as your personal Regional Manager and CEO in your pocket"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Workflow Automation",
      description: "Automate complex business processes with intelligent agents that learn and adapt"
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: "Advanced Analytics",
      description: "Get deep insights with AI-powered business intelligence and predictive analytics"
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Universal Integration",
      description: "Seamlessly connects with any existing CRM, ERP, or business platform via API"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Enterprise Security",
      description: "Bank-level security with automatic backups and anomaly detection"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Modular Design",
      description: "Choose from lightweight widgets to full enterprise solutions"
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Effects */}
      <div className="circuit-bg" />
      <div className="bg-grid" />
      
      {/* Hero Section */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-6xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <img 
                src="https://customer-assets.emergentagent.com/job_e5160009-8512-41e3-9e15-ca5ce341c758/artifacts/m183zmfa_Photoroom_20250910_212153.PNG"
                alt="modQ Logo"
                className="w-32 h-32 object-contain pulse-glow"
              />
            </div>
          </div>

          {/* Main Title */}
          <h1 className="text-6xl md:text-8xl font-bold mb-6">
            <span className="text-gradient">mod</span>
            <span className="glow-text text-white">Q</span>
          </h1>
          
          <p className="text-2xl md:text-3xl mb-4 text-gray-300 font-light">
            Modular Quantum Business Intelligence
          </p>
          
          <p className="text-lg md:text-xl mb-8 text-gray-400 max-w-3xl mx-auto leading-relaxed">
            The next-generation AI platform that transforms every employee into a rockstar. 
            From lightweight personal assistants to enterprise-level business intelligence ecosystems.
          </p>

          {/* Badge */}
          <div className="flex justify-center mb-8">
            <Badge className="px-6 py-2 text-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
              <Sparkles className="w-4 h-4 mr-2" />
              Next-Level AI/ML & NLP
            </Badge>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <Button 
              size="lg"
              className="tech-button text-lg px-8 py-4 interactive"
              onClick={() => navigate('/widget-demo')}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <Rocket className="w-5 h-5 mr-2" />
              Try Lightweight Widget Demo
              <ArrowRight className={`w-5 h-5 ml-2 transition-transform ${isHovered ? 'translate-x-1' : ''}`} />
            </Button>
            
            <Button 
              size="lg"
              variant="outline"
              className="glass neon-border text-lg px-8 py-4 interactive hover:bg-white/10"
              onClick={() => navigate('/dashboard')}
            >
              <Users className="w-5 h-5 mr-2" />
              Enterprise Dashboard
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="holographic p-6 interactive data-flow"
              >
                <div className="text-center">
                  <div className="text-blue-400 mb-4 flex justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <p className="text-gray-400 mb-4">
              Unlike other companies, we continue working with you as on-call consultants
            </p>
            <p className="text-sm text-gray-500 font-mono">
              Intelligent agents that actually act as employees • Next-gen AI/ML • White-label enterprise versions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;