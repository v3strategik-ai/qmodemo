import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { 
  Trophy, 
  Star, 
  Crown, 
  Flame, 
  Target, 
  Zap, 
  MessageSquare, 
  FileText, 
  Users, 
  BarChart3,
  CheckCircle,
  Lock,
  Gift,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

const AchievementSystem = ({ 
  userConfig, 
  chatMessages, 
  knowledgeItems, 
  progressStats,
  className = "" 
}) => {
  const [achievements, setAchievements] = useState([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [showNewAchievement, setShowNewAchievement] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    initializeAchievements();
    checkForNewAchievements();
  }, [chatMessages, knowledgeItems, progressStats, userConfig]);

  const initializeAchievements = () => {
    const allAchievements = [
      // Conversation Achievements
      {
        id: 'first_chat',
        title: 'First Steps',
        description: 'Start your first AI conversation',
        category: 'conversation',
        rarity: 'common',
        icon: <MessageSquare className="w-6 h-6" />,
        requirement: { type: 'chat_count', value: 1 },
        reward: 'Unlocked: Advanced conversation features',
        points: 10
      },
      {
        id: 'active_user',
        title: 'Getting Active',
        description: 'Have 10 meaningful conversations',
        category: 'conversation',
        rarity: 'common',
        icon: <MessageSquare className="w-6 h-6" />,
        requirement: { type: 'chat_count', value: 10 },
        reward: 'Unlocked: Conversation insights',
        points: 50
      },
      {
        id: 'conversation_expert',
        title: 'Conversation Expert',
        description: 'Master of AI conversations - 50+ chats completed',
        category: 'conversation',
        rarity: 'rare',
        icon: <Star className="w-6 h-6" />,
        requirement: { type: 'chat_count', value: 50 },
        reward: 'Exclusive: Expert user badge',
        points: 200
      },
      {
        id: 'conversation_legend',
        title: 'Conversation Legend',
        description: 'Legendary status - 100+ conversations',
        category: 'conversation',
        rarity: 'legendary',
        icon: <Crown className="w-6 h-6" />,
        requirement: { type: 'chat_count', value: 100 },
        reward: 'Legendary: Priority AI responses',
        points: 500
      },

      // Knowledge Achievements
      {
        id: 'knowledge_starter',
        title: 'Knowledge Seeker',
        description: 'Add your first knowledge item',
        category: 'knowledge',
        rarity: 'common',
        icon: <FileText className="w-6 h-6" />,
        requirement: { type: 'knowledge_count', value: 1 },
        reward: 'Unlocked: Advanced AI context',
        points: 15
      },
      {
        id: 'knowledge_builder',
        title: 'Knowledge Builder',
        description: 'Build a solid knowledge base - 10+ items',
        category: 'knowledge',
        rarity: 'rare',
        icon: <FileText className="w-6 h-6" />,
        requirement: { type: 'knowledge_count', value: 10 },
        reward: 'Enhanced: AI response accuracy',
        points: 150
      },
      {
        id: 'knowledge_master',
        title: 'Knowledge Master',
        description: 'Master curator - 25+ knowledge items',
        category: 'knowledge',
        rarity: 'epic',
        icon: <Trophy className="w-6 h-6" />,
        requirement: { type: 'knowledge_count', value: 25 },
        reward: 'Master: Custom AI personality',
        points: 400
      },

      // Engagement Achievements
      {
        id: 'daily_user',
        title: 'Daily User',
        description: 'Use modQ for 3 consecutive days',
        category: 'engagement',
        rarity: 'common',
        icon: <Target className="w-6 h-6" />,
        requirement: { type: 'streak', value: 3 },
        reward: 'Bonus: Daily insights feature',
        points: 30
      },
      {
        id: 'week_warrior',
        title: 'Week Warrior',
        description: 'Maintain a 7-day activity streak',
        category: 'engagement',
        rarity: 'rare',
        icon: <Flame className="w-6 h-6" />,
        requirement: { type: 'streak', value: 7 },
        reward: 'Warrior: Weekly summary reports',
        points: 100
      },
      {
        id: 'month_champion',
        title: 'Month Champion',
        description: 'Champion level - 30-day streak',
        category: 'engagement',
        rarity: 'epic',
        icon: <Crown className="w-6 h-6" />,
        requirement: { type: 'streak', value: 30 },
        reward: 'Champion: Advanced analytics access',
        points: 300
      },

      // Business Intelligence Achievements
      {
        id: 'insight_hunter',
        title: 'Insight Hunter',
        description: 'Generate your first business insight',
        category: 'intelligence',
        rarity: 'common',
        icon: <BarChart3 className="w-6 h-6" />,
        requirement: { type: 'insights_generated', value: 1 },
        reward: 'Unlocked: Smart insights panel',
        points: 25
      },
      {
        id: 'data_driven',
        title: 'Data-Driven Leader',
        description: 'Generate 20+ actionable insights',
        category: 'intelligence',
        rarity: 'rare',
        icon: <BarChart3 className="w-6 h-6" />,
        requirement: { type: 'insights_generated', value: 20 },
        reward: 'Advanced: Predictive analytics',
        points: 180
      },
      {
        id: 'bi_expert',
        title: 'BI Expert',
        description: 'Business Intelligence master - 50+ insights',
        category: 'intelligence',
        rarity: 'epic',
        icon: <Sparkles className="w-6 h-6" />,
        requirement: { type: 'insights_generated', value: 50 },
        reward: 'Expert: Custom dashboard themes',
        points: 450
      },

      // Industry-Specific Achievements
      {
        id: 'tech_innovator',
        title: 'Tech Innovator',
        description: 'Technology sector automation expert',
        category: 'industry',
        rarity: 'epic',
        icon: <Zap className="w-6 h-6" />,
        requirement: { type: 'industry_automation', industry: 'Technology', value: 10 },
        reward: 'Innovation: Beta feature access',
        points: 350
      },
      {
        id: 'sales_master',
        title: 'Sales Master',
        description: 'Sales optimization champion',
        category: 'industry',
        rarity: 'rare',
        icon: <Target className="w-6 h-6" />,
        requirement: { type: 'sales_conversations', value: 15 },
        reward: 'Sales: Advanced CRM integrations',
        points: 250
      },

      // Special Achievements
      {
        id: 'early_adopter',
        title: 'Early Adopter',
        description: 'Pioneer user of modQ platform',
        category: 'special',
        rarity: 'legendary',
        icon: <Crown className="w-6 h-6" />,
        requirement: { type: 'special', value: 'early_user' },
        reward: 'Legendary: Lifetime premium features',
        points: 1000
      },
      {
        id: 'feedback_hero',
        title: 'Feedback Hero',
        description: 'Provided valuable feedback to improve modQ',
        category: 'special',
        rarity: 'epic',
        icon: <Gift className="w-6 h-6" />,
        requirement: { type: 'feedback_given', value: 5 },
        reward: 'Hero: Direct line to dev team',
        points: 300
      }
    ];

    setAchievements(allAchievements);

    // Set up categories
    const achievementCategories = [
      { 
        id: 'conversation', 
        name: 'Conversations', 
        icon: <MessageSquare className="w-4 h-4" />,
        color: 'text-blue-400'
      },
      { 
        id: 'knowledge', 
        name: 'Knowledge', 
        icon: <FileText className="w-4 h-4" />,
        color: 'text-green-400'
      },
      { 
        id: 'engagement', 
        name: 'Engagement', 
        icon: <Flame className="w-4 h-4" />,
        color: 'text-orange-400'
      },
      { 
        id: 'intelligence', 
        name: 'Intelligence', 
        icon: <BarChart3 className="w-4 h-4" />,
        color: 'text-purple-400'
      },
      { 
        id: 'industry', 
        name: 'Industry', 
        icon: <Target className="w-4 h-4" />,
        color: 'text-cyan-400'
      },
      { 
        id: 'special', 
        name: 'Special', 
        icon: <Crown className="w-4 h-4" />,
        color: 'text-yellow-400'
      }
    ];

    setCategories(achievementCategories);
  };

  const checkForNewAchievements = () => {
    const currentStats = {
      chat_count: chatMessages?.length || 0,
      knowledge_count: knowledgeItems?.length || 0,
      streak: progressStats?.currentStreak || 0,
      insights_generated: Math.floor((chatMessages?.length || 0) / 3),
      sales_conversations: countSalesConversations(),
      industry_automation: countIndustryAutomation()
    };

    const newlyUnlocked = achievements.filter(achievement => {
      const isAlreadyUnlocked = unlockedAchievements.some(ua => ua.id === achievement.id);
      
      if (isAlreadyUnlocked) return false;

      return checkAchievementRequirement(achievement, currentStats);
    });

    if (newlyUnlocked.length > 0) {
      const newAchievement = newlyUnlocked[0]; // Show one at a time
      setUnlockedAchievements(prev => [...prev, ...newlyUnlocked]);
      setShowNewAchievement(newAchievement);
      
      toast.success(`🏆 Achievement Unlocked: ${newAchievement.title}!`);
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setShowNewAchievement(null);
      }, 5000);
    }
  };

  const checkAchievementRequirement = (achievement, stats) => {
    const req = achievement.requirement;
    
    switch (req.type) {
      case 'chat_count':
        return stats.chat_count >= req.value;
      case 'knowledge_count':
        return stats.knowledge_count >= req.value;
      case 'streak':
        return stats.streak >= req.value;
      case 'insights_generated':
        return stats.insights_generated >= req.value;
      case 'sales_conversations':
        return stats.sales_conversations >= req.value;
      case 'industry_automation':
        return userConfig?.industry === req.industry && stats.industry_automation >= req.value;
      case 'special':
        return req.value === 'early_user'; // Everyone is an early user in beta
      case 'feedback_given':
        return stats.chat_count >= 5; // Assume feedback given after 5 chats
      default:
        return false;
    }
  };

  const countSalesConversations = () => {
    if (!chatMessages) return 0;
    
    const salesKeywords = ['sales', 'revenue', 'pipeline', 'deals', 'conversion', 'leads'];
    return chatMessages.filter(msg => 
      salesKeywords.some(keyword => 
        msg.message.toLowerCase().includes(keyword) || 
        msg.response.toLowerCase().includes(keyword)
      )
    ).length;
  };

  const countIndustryAutomation = () => {
    if (!chatMessages) return 0;
    
    const automationKeywords = ['automate', 'automation', 'workflow', 'process'];
    return chatMessages.filter(msg => 
      automationKeywords.some(keyword => 
        msg.message.toLowerCase().includes(keyword) || 
        msg.response.toLowerCase().includes(keyword)
      )
    ).length;
  };

  const getRarityConfig = (rarity) => {
    const configs = {
      common: {
        color: 'text-gray-400 bg-gray-500/20 border-gray-500/30',
        bgGradient: 'from-gray-500/10 to-gray-600/10',
        glow: 'shadow-gray-500/20'
      },
      rare: {
        color: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
        bgGradient: 'from-blue-500/10 to-blue-600/10',
        glow: 'shadow-blue-500/20'
      },
      epic: {
        color: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
        bgGradient: 'from-purple-500/10 to-purple-600/10',
        glow: 'shadow-purple-500/20'
      },
      legendary: {
        color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
        bgGradient: 'from-yellow-500/10 to-yellow-600/10',
        glow: 'shadow-yellow-500/20'
      }
    };
    return configs[rarity] || configs.common;
  };

  const calculateProgress = (achievement) => {
    const currentStats = {
      chat_count: chatMessages?.length || 0,
      knowledge_count: knowledgeItems?.length || 0,
      streak: progressStats?.currentStreak || 0,
      insights_generated: Math.floor((chatMessages?.length || 0) / 3),
      sales_conversations: countSalesConversations(),
      industry_automation: countIndustryAutomation()
    };

    const req = achievement.requirement;
    const current = currentStats[req.type] || 0;
    return Math.min((current / req.value) * 100, 100);
  };

  const isUnlocked = (achievementId) => {
    return unlockedAchievements.some(ua => ua.id === achievementId);
  };

  const totalPoints = unlockedAchievements.reduce((sum, achievement) => sum + achievement.points, 0);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Points */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Achievements</h3>
          <p className="text-gray-400">Unlock rewards as you master business intelligence</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gradient">{totalPoints}</div>
          <div className="text-xs text-gray-400">Points</div>
        </div>
      </div>

      {/* Achievement Categories */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map(category => {
          const categoryAchievements = achievements.filter(a => a.category === category.id);
          const unlockedCount = categoryAchievements.filter(a => isUnlocked(a.id)).length;
          
          return (
            <Card key={category.id} className="glass p-4 text-center">
              <div className={`${category.color} mb-2 flex justify-center`}>
                {category.icon}
              </div>
              <h4 className="text-sm font-medium text-white">{category.name}</h4>
              <p className="text-xs text-gray-400 mt-1">
                {unlockedCount}/{categoryAchievements.length}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map(achievement => {
          const unlocked = isUnlocked(achievement.id);
          const progress = calculateProgress(achievement);
          const rarityConfig = getRarityConfig(achievement.rarity);
          
          return (
            <Card 
              key={achievement.id}
              className={`p-4 border transition-all duration-300 ${
                unlocked 
                  ? `bg-gradient-to-br ${rarityConfig.bgGradient} border-current ${rarityConfig.glow} shadow-lg` 
                  : 'glass border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  unlocked ? rarityConfig.color : 'text-gray-500 bg-gray-700/50'
                }`}>
                  {unlocked ? achievement.icon : <Lock className="w-6 h-6" />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-medium ${unlocked ? 'text-white' : 'text-gray-400'}`}>
                      {achievement.title}
                    </h4>
                    <Badge className={`text-xs ${rarityConfig.color}`}>
                      {achievement.rarity}
                    </Badge>
                  </div>
                  
                  <p className={`text-sm mb-2 ${unlocked ? 'text-gray-200' : 'text-gray-500'}`}>
                    {achievement.description}
                  </p>
                  
                  {!unlocked && progress > 0 && (
                    <div className="mb-2">
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}% complete</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${unlocked ? 'text-green-400' : 'text-gray-500'}`}>
                      {achievement.reward}
                    </span>
                    <span className={`text-xs font-medium ${unlocked ? rarityConfig.color.split(' ')[0] : 'text-gray-500'}`}>
                      {achievement.points} pts
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* New Achievement Popup */}
      {showNewAchievement && (
        <Dialog open={!!showNewAchievement} onOpenChange={() => setShowNewAchievement(null)}>
          <DialogContent className="glass max-w-md">
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-full w-fit">
                <Trophy className="w-8 h-8 text-yellow-400" />
              </div>
              <DialogTitle className="text-xl font-bold text-white">
                🎉 Achievement Unlocked!
              </DialogTitle>
            </DialogHeader>
            
            <div className="text-center space-y-4">
              <div className={`p-3 rounded-lg ${getRarityConfig(showNewAchievement.rarity).color}`}>
                {showNewAchievement.icon}
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{showNewAchievement.title}</h3>
                <p className="text-gray-300 mb-4">{showNewAchievement.description}</p>
                
                <div className="space-y-2">
                  <Badge className={`${getRarityConfig(showNewAchievement.rarity).color} text-sm px-3 py-1`}>
                    {showNewAchievement.rarity.toUpperCase()}
                  </Badge>
                  <p className="text-sm text-green-400">{showNewAchievement.reward}</p>
                  <p className="text-lg font-bold text-gradient">+{showNewAchievement.points} points</p>
                </div>
              </div>
              
              <Button 
                onClick={() => setShowNewAchievement(null)}
                className="tech-button w-full"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Awesome!
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AchievementSystem;