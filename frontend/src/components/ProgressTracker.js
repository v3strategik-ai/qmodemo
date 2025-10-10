import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { 
  Trophy, 
  Target, 
  Zap, 
  MessageSquare, 
  FileText, 
  BarChart3, 
  Users, 
  CheckCircle,
  Star,
  Flame,
  TrendingUp,
  Calendar,
  Clock
} from 'lucide-react';

const ProgressTracker = ({ userConfig = {}, chatMessages = [], knowledgeItems = [], className = "" }) => {
  const [stats, setStats] = useState({});
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    calculateStats();
    generateWeeklyGoals();
    checkAchievements();
  }, [chatMessages, knowledgeItems, userConfig]);

  const calculateStats = () => {
    const now = new Date();
    const thisWeek = getThisWeekData();
    const lastWeek = getLastWeekData();
    
    const newStats = {
      // This week stats
      conversationsThisWeek: thisWeek.conversations,
      knowledgeItemsAdded: thisWeek.knowledgeItems,
      automationsDiscussed: thisWeek.automations,
      insightsGenerated: thisWeek.insights,
      
      // Growth comparisons
      conversationGrowth: calculateGrowth(thisWeek.conversations, lastWeek.conversations),
      knowledgeGrowth: calculateGrowth(thisWeek.knowledgeItems, lastWeek.knowledgeItems),
      
      // Total stats
      totalConversations: chatMessages?.length || 0,
      totalKnowledgeItems: knowledgeItems?.length || 0,
      
      // Engagement metrics
      avgMessagesPerDay: thisWeek.conversations / 7,
      longestStreak: calculateStreak(),
      currentStreak: getCurrentStreak()
    };

    setStats(newStats);
  };

  const getThisWeekData = () => {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    
    const thisWeekMessages = chatMessages?.filter(msg => {
      const msgDate = new Date(msg.timestamp);
      return msgDate >= weekStart;
    }) || [];

    const thisWeekKnowledge = knowledgeItems?.filter(item => {
      const itemDate = new Date(item.created_at);
      return itemDate >= weekStart;
    }) || [];

    const automationKeywords = ['automate', 'automation', 'workflow', 'process', 'streamline'];
    const automationsDiscussed = thisWeekMessages.filter(msg => 
      automationKeywords.some(keyword => 
        msg.message.toLowerCase().includes(keyword) || 
        msg.response.toLowerCase().includes(keyword)
      )
    ).length;

    return {
      conversations: thisWeekMessages.length,
      knowledgeItems: thisWeekKnowledge.length,
      automations: automationsDiscussed,
      insights: Math.floor(thisWeekMessages.length / 3) // Estimate insights generated
    };
  };

  const getLastWeekData = () => {
    const now = new Date();
    const thisWeekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const lastWeekMessages = chatMessages?.filter(msg => {
      const msgDate = new Date(msg.timestamp);
      return msgDate >= lastWeekStart && msgDate < thisWeekStart;
    }) || [];

    const lastWeekKnowledge = knowledgeItems?.filter(item => {
      const itemDate = new Date(item.created_at);
      return itemDate >= lastWeekStart && itemDate < thisWeekStart;
    }) || [];

    return {
      conversations: lastWeekMessages.length,
      knowledgeItems: lastWeekKnowledge.length
    };
  };

  const calculateGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const calculateStreak = () => {
    // Calculate longest consecutive days with activity
    if (!chatMessages || chatMessages.length === 0) return 0;
    
    const days = {};
    chatMessages.forEach(msg => {
      const date = new Date(msg.timestamp).toDateString();
      days[date] = true;
    });

    const sortedDates = Object.keys(days).sort((a, b) => new Date(a) - new Date(b));
    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return maxStreak;
  };

  const getCurrentStreak = () => {
    if (!chatMessages || chatMessages.length === 0) return 0;
    
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    const hasActivityToday = chatMessages.some(msg => 
      new Date(msg.timestamp).toDateString() === today
    );
    
    const hasActivityYesterday = chatMessages.some(msg => 
      new Date(msg.timestamp).toDateString() === yesterday
    );

    if (hasActivityToday || hasActivityYesterday) {
      // Calculate actual current streak
      const days = {};
      chatMessages.forEach(msg => {
        const date = new Date(msg.timestamp).toDateString();
        days[date] = true;
      });

      const sortedDates = Object.keys(days).sort((a, b) => new Date(b) - new Date(a));
      let streak = 0;
      const todayTime = new Date().getTime();

      for (let i = 0; i < sortedDates.length; i++) {
        const dateTime = new Date(sortedDates[i]).getTime();
        const diffDays = Math.floor((todayTime - dateTime) / (1000 * 60 * 60 * 24));

        if (diffDays === i) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    }

    return 0;
  };

  const generateWeeklyGoals = () => {
    const baseGoals = [
      {
        id: 'conversations',
        title: 'Weekly Conversations',
        description: 'Have meaningful AI conversations about your business',
        target: 10,
        current: stats.conversationsThisWeek || 0,
        icon: <MessageSquare className="w-4 h-4" />,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20'
      },
      {
        id: 'knowledge',
        title: 'Knowledge Building',
        description: 'Add business information to train your AI',
        target: 3,
        current: stats.knowledgeItemsAdded || 0,
        icon: <FileText className="w-4 h-4" />,
        color: 'text-green-400',
        bgColor: 'bg-green-500/20'
      },
      {
        id: 'automation',
        title: 'Automation Discovery',
        description: 'Explore workflow automation opportunities',
        target: 5,
        current: stats.automationsDiscussed || 0,
        icon: <Zap className="w-4 h-4" />,
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20'
      },
      {
        id: 'insights',
        title: 'Generate Insights',
        description: 'Get AI-powered business insights and recommendations',
        target: 8,
        current: stats.insightsGenerated || 0,
        icon: <BarChart3 className="w-4 h-4" />,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20'
      }
    ];

    setWeeklyGoals(baseGoals);
  };

  const checkAchievements = () => {
    const newAchievements = [];
    
    // Conversation milestones
    if (stats.totalConversations >= 50) {
      newAchievements.push({
        id: 'conversation_expert',
        title: 'Conversation Expert',
        description: '50+ AI conversations completed',
        icon: <MessageSquare className="w-5 h-5" />,
        rarity: 'rare',
        unlockedAt: new Date().toISOString()
      });
    } else if (stats.totalConversations >= 20) {
      newAchievements.push({
        id: 'active_user',
        title: 'Active User',
        description: '20+ AI conversations completed',
        icon: <Users className="w-5 h-5" />,
        rarity: 'common',
        unlockedAt: new Date().toISOString()
      });
    }

    // Streak achievements
    if (stats.currentStreak >= 7) {
      newAchievements.push({
        id: 'week_warrior',
        title: 'Week Warrior',
        description: '7-day activity streak',
        icon: <Flame className="w-5 h-5" />,
        rarity: 'epic',
        unlockedAt: new Date().toISOString()
      });
    } else if (stats.currentStreak >= 3) {
      newAchievements.push({
        id: 'consistent_user',
        title: 'Consistent User',
        description: '3-day activity streak',
        icon: <Target className="w-5 h-5" />,
        rarity: 'common',
        unlockedAt: new Date().toISOString()
      });
    }

    // Knowledge achievements
    if (stats.totalKnowledgeItems >= 10) {
      newAchievements.push({
        id: 'knowledge_builder',
        title: 'Knowledge Builder',
        description: '10+ knowledge items added',
        icon: <FileText className="w-5 h-5" />,
        rarity: 'rare',
        unlockedAt: new Date().toISOString()
      });
    }

    // Industry-specific achievements
    if (userConfig?.industry === 'Technology' && stats.automationsDiscussed >= 10) {
      newAchievements.push({
        id: 'tech_innovator',
        title: 'Tech Innovator',
        description: 'Technology automation expert',
        icon: <Zap className="w-5 h-5" />,
        rarity: 'legendary',
        unlockedAt: new Date().toISOString()
      });
    }

    setAchievements(newAchievements);
  };

  const getRarityColor = (rarity) => {
    const colors = {
      common: 'text-gray-400 bg-gray-500/20 border-gray-500/30',
      rare: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      epic: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
      legendary: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
    };
    return colors[rarity] || colors.common;
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Progress Tracker</h3>
          <p className="text-gray-400">Your business intelligence journey</p>
        </div>
        <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
          <Trophy className="w-3 h-3 mr-1" />
          Level {Math.floor(stats.totalConversations / 10) + 1}
        </Badge>
      </div>

      {/* Weekly Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="holographic p-4">
          <div className="flex items-center gap-3">
            <div className="text-blue-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.conversationsThisWeek || 0}</p>
              <p className="text-sm text-gray-400">Conversations</p>
              {stats.conversationGrowth !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400">+{stats.conversationGrowth}%</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="holographic p-4">
          <div className="flex items-center gap-3">
            <div className="text-green-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.knowledgeItemsAdded || 0}</p>
              <p className="text-sm text-gray-400">Knowledge Items</p>
              {stats.knowledgeGrowth !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400">+{stats.knowledgeGrowth}%</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="holographic p-4">
          <div className="flex items-center gap-3">
            <div className="text-orange-400">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.currentStreak || 0}</p>
              <p className="text-sm text-gray-400">Day Streak</p>
              <p className="text-xs text-gray-500">Best: {stats.longestStreak || 0} days</p>
            </div>
          </div>
        </Card>

        <Card className="holographic p-4">
          <div className="flex items-center gap-3">
            <div className="text-purple-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.insightsGenerated || 0}</p>
              <p className="text-sm text-gray-400">AI Insights</p>
              <p className="text-xs text-gray-500">This week</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Weekly Goals */}
      <Card className="holographic p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-400" />
          Weekly Goals
        </h4>
        
        <div className="space-y-4">
          {weeklyGoals.map((goal) => {
            const percentage = Math.min((goal.current / goal.target) * 100, 100);
            return (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={goal.color}>
                      {goal.icon}
                    </div>
                    <span className="font-medium text-white">{goal.title}</span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {goal.current}/{goal.target}
                  </span>
                </div>
                
                <div className="relative">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(percentage)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  {percentage >= 100 && (
                    <CheckCircle className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-6 w-4 h-4 text-green-400" />
                  )}
                </div>
                
                <p className="text-xs text-gray-500">{goal.description}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Achievements */}
      <Card className="holographic p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Achievements
        </h4>
        
        {achievements.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Keep using modQ to unlock achievements!</p>
            <p className="text-sm text-gray-500 mt-2">
              Try having more conversations or adding knowledge items
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <div 
                key={achievement.id} 
                className={`p-4 rounded-lg border ${getRarityColor(achievement.rarity)} animate-in fade-in-50`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-current">
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-white">{achievement.title}</h5>
                    <p className="text-sm text-gray-300">{achievement.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-xs ${getRarityColor(achievement.rarity)}`}>
                        {achievement.rarity}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ProgressTracker;