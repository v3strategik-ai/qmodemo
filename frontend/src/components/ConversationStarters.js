import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { BarChart3, Target, Zap, FileText, Users, TrendingUp, Lightbulb, Settings } from 'lucide-react';

const ConversationStarters = ({ onStarterClick, userConfig, className = "" }) => {
  // Get starters based on user's industry and role
  const getStartersForIndustry = (industry) => {
    const baseStarters = [
      {
        icon: "📊",
        text: "Analyze my Q4 sales performance and identify key trends",
        category: "analytics",
        icon_component: <BarChart3 className="w-4 h-4" />,
        color: "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20"
      },
      {
        icon: "🎯", 
        text: "Create a lead qualification framework for my sales team",
        category: "sales",
        icon_component: <Target className="w-4 h-4" />,
        color: "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20"
      },
      {
        icon: "⚡",
        text: "Help me automate our customer onboarding process",
        category: "automation", 
        icon_component: <Zap className="w-4 h-4" />,
        color: "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20"
      },
      {
        icon: "📈",
        text: "Build a monthly business review template with KPIs",
        category: "reporting",
        icon_component: <FileText className="w-4 h-4" />,
        color: "bg-green-500/10 border-green-500/20 hover:bg-green-500/20"
      }
    ];

    const industrySpecific = {
      'Technology': [
        {
          icon: "💻",
          text: "Analyze our product usage metrics and user engagement",
          category: "product",
          icon_component: <TrendingUp className="w-4 h-4" />,
          color: "bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20"
        },
        {
          icon: "🚀",
          text: "Create a go-to-market strategy for our new feature",
          category: "strategy",
          icon_component: <Lightbulb className="w-4 h-4" />,
          color: "bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20"
        }
      ],
      'Consulting': [
        {
          icon: "🏢",
          text: "Design a client success framework and engagement model",
          category: "client_success",
          icon_component: <Users className="w-4 h-4" />,
          color: "bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20"
        },
        {
          icon: "📋",
          text: "Create a project profitability analysis template",
          category: "profitability",
          icon_component: <BarChart3 className="w-4 h-4" />,
          color: "bg-teal-500/10 border-teal-500/20 hover:bg-teal-500/20"
        }
      ],
      'Retail': [
        {
          icon: "📦",
          text: "Optimize our inventory management and turnover rates",
          category: "inventory",
          icon_component: <Settings className="w-4 h-4" />,
          color: "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20"
        },
        {
          icon: "🛒",
          text: "Analyze customer purchase patterns and lifecycle value",
          category: "customer_analytics",
          icon_component: <Users className="w-4 h-4" />,
          color: "bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20"
        }
      ],
      'Finance': [
        {
          icon: "💰",
          text: "Create a risk assessment framework for investments",
          category: "risk_management",
          icon_component: <Target className="w-4 h-4" />,
          color: "bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20"
        },
        {
          icon: "📊",
          text: "Build automated financial reporting dashboards",
          category: "financial_reporting",
          icon_component: <BarChart3 className="w-4 h-4" />,
          color: "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20"
        }
      ],
      'Healthcare': [
        {
          icon: "🏥",
          text: "Improve patient engagement and satisfaction metrics",
          category: "patient_experience",
          icon_component: <Users className="w-4 h-4" />,
          color: "bg-red-500/10 border-red-500/20 hover:bg-red-500/20"
        },
        {
          icon: "📋",
          text: "Create compliance tracking and reporting workflows",
          category: "compliance",
          icon_component: <FileText className="w-4 h-4" />,
          color: "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20"
        }
      ]
    };

    const industryStarters = industrySpecific[industry] || [];
    return [...baseStarters, ...industryStarters];
  };

  const starters = getStartersForIndustry(userConfig?.industry || 'General');
  
  // Show 4 starters initially, with option to see more
  const [showAll, setShowAll] = React.useState(false);
  const displayedStarters = showAll ? starters : starters.slice(0, 4);

  const handleStarterClick = (starter) => {
    if (onStarterClick) {
      onStarterClick(starter.text);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-white">Quick Start Conversations</h4>
          <p className="text-sm text-gray-400">
            {userConfig?.industry ? `${userConfig.industry}-focused` : 'Popular'} business intelligence topics
          </p>
        </div>
        {userConfig?.company_name && (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            {userConfig.company_name}
          </Badge>
        )}
      </div>

      {/* Conversation Starters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {displayedStarters.map((starter, index) => (
          <Button
            key={index}
            variant="outline"
            className={`${starter.color} text-left p-4 h-auto justify-start border transition-all duration-200 hover:scale-[1.02]`}
            onClick={() => handleStarterClick(starter)}
          >
            <div className="flex items-start gap-3 w-full">
              <div className="text-lg flex-shrink-0 mt-0.5">
                {starter.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white leading-tight">
                  {starter.text}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {starter.icon_component}
                  <span className="text-xs text-gray-400 capitalize">
                    {starter.category.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </Button>
        ))}
      </div>

      {/* Show More/Less Button */}
      {starters.length > 4 && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-gray-400 hover:text-white"
          >
            {showAll ? 'Show Less' : `Show ${starters.length - 4} More`}
          </Button>
        </div>
      )}

      {/* Usage Tip */}
      <div className="glass p-3 rounded-lg border border-blue-500/20">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-300 font-medium">Pro Tip</p>
            <p className="text-xs text-gray-400 mt-1">
              These starters are personalized based on your {userConfig?.industry || 'business'} profile. 
              The AI will provide more relevant insights using your company's context.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationStarters;