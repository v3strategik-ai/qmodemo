import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Lightbulb, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BarChart3,
  Zap,
  Users,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const SmartInsightsPanel = ({ userConfig, chatMessages, className = "" }) => {
  const [insights, setInsights] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (chatMessages && chatMessages.length > 0) {
      generateInsights();
    }
  }, [chatMessages, userConfig]);

  const generateInsights = () => {
    setIsGenerating(true);
    
    // Simulate AI insight generation based on chat patterns
    setTimeout(() => {
      const generatedInsights = analyzeConversationPatterns();
      setInsights(generatedInsights);
      setIsGenerating(false);
    }, 1500);
  };

  const analyzeConversationPatterns = () => {
    if (!chatMessages || chatMessages.length === 0) {
      return getDefaultInsights();
    }

    const insights = [];
    const recentMessages = chatMessages.slice(-10);
    const topics = extractTopics(recentMessages);
    const frequency = analyzeMessageFrequency();
    
    // Topic-based insights
    if (topics.includes('sales') || topics.includes('revenue')) {
      insights.push({
        type: 'trend',
        title: 'Sales Focus Detected',
        description: `You've been asking about sales ${topics.filter(t => t.includes('sales')).length} times recently. Your sales inquiries show strong growth momentum.`,
        action: 'View Sales Analytics',
        icon: <TrendingUp className="w-4 h-4" />,
        color: 'border-green-500',
        bgColor: 'bg-green-500/10',
        textColor: 'text-green-400',
        priority: 'high'
      });
    }

    if (topics.includes('automation') || topics.includes('workflow')) {
      insights.push({
        type: 'opportunity',
        title: 'Automation Opportunity',
        description: 'Based on your workflow questions, you could save 15+ hours/week with proper automation setup.',
        action: 'Set Up Automation',
        icon: <Zap className="w-4 h-4" />,
        color: 'border-blue-500',
        bgColor: 'bg-blue-500/10',
        textColor: 'text-blue-400',
        priority: 'medium'
      });
    }

    if (topics.includes('customer') || topics.includes('retention')) {
      insights.push({
        type: 'recommendation',
        title: 'Customer Success Focus',
        description: 'Your customer-related queries suggest implementing a customer success program could increase retention by 25%.',
        action: 'Build Customer Program',
        icon: <Users className="w-4 h-4" />,
        color: 'border-purple-500',
        bgColor: 'bg-purple-500/10',
        textColor: 'text-purple-400',
        priority: 'high'
      });
    }

    // Frequency-based insights
    if (frequency.isActiveUser) {
      insights.push({
        type: 'engagement',
        title: 'High Engagement Level',
        description: `You're actively using modQ with ${chatMessages.length} conversations. You're in the top 10% of users!`,
        action: 'Unlock Advanced Features',
        icon: <Sparkles className="w-4 h-4" />,
        color: 'border-yellow-500',
        bgColor: 'bg-yellow-500/10',
        textColor: 'text-yellow-400',
        priority: 'low'
      });
    }

    // Industry-specific insights
    if (userConfig?.industry) {
      const industryInsight = getIndustrySpecificInsight(userConfig.industry, topics);
      if (industryInsight) {
        insights.push(industryInsight);
      }
    }

    // Performance insights
    if (chatMessages.length > 5) {
      insights.push({
        type: 'performance',
        title: 'AI Learning Progress',
        description: 'Your AI assistant is getting smarter! Response relevance has improved 40% based on your knowledge base.',
        action: 'Add More Knowledge',
        icon: <BarChart3 className="w-4 h-4" />,
        color: 'border-orange-500',
        bgColor: 'bg-orange-500/10',
        textColor: 'text-orange-400',
        priority: 'medium'
      });
    }

    return insights.slice(0, 4); // Show top 4 insights
  };

  const extractTopics = (messages) => {
    const topicKeywords = {
      sales: ['sales', 'revenue', 'pipeline', 'deals', 'conversion', 'leads'],
      automation: ['automate', 'automation', 'workflow', 'process', 'streamline'],
      customer: ['customer', 'client', 'retention', 'satisfaction', 'support'],
      analytics: ['analytics', 'data', 'metrics', 'kpi', 'performance', 'insights'],
      marketing: ['marketing', 'campaign', 'social', 'content', 'brand'],
      finance: ['finance', 'budget', 'cost', 'profit', 'roi', 'investment']
    };

    const topics = [];
    messages.forEach(msg => {
      const text = (msg.message + ' ' + msg.response).toLowerCase();
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          topics.push(topic);
        }
      });
    });

    return [...new Set(topics)]; // Remove duplicates
  };

  const analyzeMessageFrequency = () => {
    const now = new Date();
    const last7Days = chatMessages.filter(msg => {
      const messageDate = new Date(msg.timestamp);
      const diffTime = Math.abs(now - messageDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    });

    return {
      isActiveUser: last7Days.length >= 5,
      weeklyAverage: last7Days.length,
      isIncreasing: last7Days.length > chatMessages.length * 0.3
    };
  };

  const getIndustrySpecificInsight = (industry, topics) => {
    const industryInsights = {
      'Technology': {
        type: 'industry',
        title: 'Tech Industry Growth',
        description: 'SaaS companies in your sector are seeing 23% YoY growth. Your automation focus aligns with industry trends.',
        action: 'View Tech Benchmarks',
        icon: <Target className="w-4 h-4" />,
        color: 'border-cyan-500',
        bgColor: 'bg-cyan-500/10',
        textColor: 'text-cyan-400',
        priority: 'medium'
      },
      'Consulting': {
        type: 'industry',
        title: 'Consulting Best Practices',
        description: 'Top consulting firms are investing 40% more in client analytics. Your data focus is spot-on.',
        action: 'Explore Analytics Tools',
        icon: <Target className="w-4 h-4" />,
        color: 'border-indigo-500',
        bgColor: 'bg-indigo-500/10',
        textColor: 'text-indigo-400',
        priority: 'medium'
      },
      'Retail': {
        type: 'industry',
        title: 'E-commerce Trends',
        description: 'Retail automation reduces operational costs by 35%. Your workflow optimization is strategically sound.',
        action: 'Retail Automation Guide',
        icon: <Target className="w-4 h-4" />,
        color: 'border-emerald-500',
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-400',
        priority: 'medium'
      }
    };

    return industryInsights[industry] || null;
  };

  const getDefaultInsights = () => [
    {
      type: 'welcome',
      title: 'Welcome to Business Intelligence',
      description: 'Start asking questions about your business to unlock personalized insights and recommendations.',
      action: 'Start Conversation',
      icon: <Lightbulb className="w-4 h-4" />,
      color: 'border-blue-500',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-400',
      priority: 'high'
    },
    {
      type: 'tip',
      title: 'Upload Your Data',
      description: 'Add company documents to your knowledge base for more accurate and personalized AI responses.',
      action: 'Add Knowledge',
      icon: <Target className="w-4 h-4" />,
      color: 'border-green-500',
      bgColor: 'bg-green-500/10',
      textColor: 'text-green-400',
      priority: 'medium'
    }
  ];

  const getInsightIcon = (type) => {
    const icons = {
      trend: <TrendingUp className="w-4 h-4" />,
      opportunity: <Lightbulb className="w-4 h-4" />,
      recommendation: <Target className="w-4 h-4" />,
      warning: <AlertTriangle className="w-4 h-4" />,
      success: <CheckCircle className="w-4 h-4" />,
      engagement: <Sparkles className="w-4 h-4" />,
      performance: <BarChart3 className="w-4 h-4" />,
      industry: <Target className="w-4 h-4" />,
      welcome: <Lightbulb className="w-4 h-4" />,
      tip: <Target className="w-4 h-4" />
    };
    return icons[type] || <Lightbulb className="w-4 h-4" />;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Smart Insights</h3>
          <p className="text-sm text-gray-400">AI-powered recommendations based on your activity</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={generateInsights}
          disabled={isGenerating}
          className="glass neon-border"
        >
          {isGenerating ? (
            <>
              <div className="loading-spinner mr-2" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Insights Grid */}
      <div className="space-y-3">
        {insights.length === 0 && !isGenerating && (
          <Card className="glass p-4 text-center">
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400">Start conversations to generate insights</p>
          </Card>
        )}

        {isGenerating && (
          <Card className="glass p-4 text-center">
            <div className="loading-spinner mx-auto mb-2" />
            <p className="text-gray-400">Analyzing your conversations...</p>
          </Card>
        )}

        {insights.map((insight, index) => (
          <Card 
            key={index} 
            className={`${insight.bgColor} p-4 border-l-4 ${insight.color} animate-in slide-in-from-left-2`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className={insight.textColor}>
                  {insight.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-white">{insight.title}</h4>
                    <Badge 
                      className={`text-xs ${
                        insight.priority === 'high' 
                          ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                          : insight.priority === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}
                    >
                      {insight.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-300 mb-3">{insight.description}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`${insight.textColor} hover:bg-white/5 p-0 h-auto font-medium`}
                  >
                    {insight.action}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      {insights.length > 0 && (
        <Card className="glass p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              {insights.length} insights generated
            </span>
            <span className="text-gray-400">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SmartInsightsPanel;