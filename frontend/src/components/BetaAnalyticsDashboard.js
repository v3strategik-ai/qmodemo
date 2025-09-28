import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BarChart3, Users, MessageSquare, TrendingUp, TrendingDown, RefreshCw, Star, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BetaAnalyticsDashboard = ({ currentUser }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [userActivity, setUserActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(7);

  useEffect(() => {
    if (currentUser) {
      loadAnalyticsData();
      loadUserActivity();
    }
  }, [currentUser, selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/beta/analytics/dashboard/${currentUser.id}`);
      setAnalyticsData(response.data);
      
      // Track analytics view
      await axios.post(`${API}/beta/analytics/track`, {
        user_id: currentUser.id,
        event_type: 'analytics_viewed',
        feature_name: 'beta_analytics_dashboard',
        metadata: { dashboard_type: 'beta_testing' }
      });
      
    } catch (error) {
      console.error('Failed to load analytics:', error);
      if (error.response?.status === 403) {
        toast.error('Analytics access required. Try switching to CEO or Manager role.');
      } else {
        toast.error('Failed to load analytics data');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUserActivity = async () => {
    try {
      const response = await axios.get(`${API}/beta/analytics/user-activity/${currentUser.id}?days=${selectedPeriod}`);
      setUserActivity(response.data);
    } catch (error) {
      console.error('Failed to load user activity:', error);
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, description, color = "blue" }) => (
    <Card className="glass p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-${color}-500/20`}>
          <Icon className={`w-6 h-6 text-${color}-400`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-gray-400">{title}</div>
        {description && <div className="text-xs text-gray-500">{description}</div>}
      </div>
    </Card>
  );

  const FeatureUsageChart = ({ features }) => (
    <Card className="glass p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Feature Usage</h3>
      <div className="space-y-4">
        {Object.entries(features || {})
          .sort(([,a], [,b]) => b - a)
          .slice(0, 8)
          .map(([feature, count]) => {
            const maxCount = Math.max(...Object.values(features));
            const percentage = (count / maxCount) * 100;
            
            return (
              <div key={feature} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300 capitalize">{feature.replace('_', ' ')}</span>
                  <span className="text-blue-400">{count} uses</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </Card>
  );

  const FeedbackSummary = ({ feedbackData }) => (
    <Card className="glass p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Feedback Summary</h3>
      <div className="space-y-4">
        {Object.entries(feedbackData || {}).map(([type, data]) => (
          <div key={type} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
            <div className="flex items-center gap-3">
              {type === 'rating' && <Star className="w-5 h-5 text-yellow-400" />}
              {type === 'comment' && <MessageSquare className="w-5 h-5 text-blue-400" />}
              {type === 'bug_report' && <div className="w-5 h-5 bg-red-500 rounded" />}
              {type === 'suggestion' && <div className="w-5 h-5 bg-green-500 rounded" />}
              <div>
                <div className="text-white capitalize">{type.replace('_', ' ')}</div>
                <div className="text-xs text-gray-400">{data.count} entries</div>
              </div>
            </div>
            {data.avg_rating > 0 && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300">
                ⭐ {data.avg_rating}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </Card>
  );

  const TourCompletionRates = ({ tourData }) => (
    <Card className="glass p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Tour Completion Rates</h3>
      <div className="space-y-3">
        {Object.entries(tourData || {}).map(([tourId, rate]) => (
          <div key={tourId} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-gray-300 text-sm">Tour</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${rate * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-400 w-12">
                {Math.round(rate * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  const ActivityTimeline = ({ activityData }) => (
    <Card className="glass p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Your Activity</h3>
        <Select value={selectedPeriod.toString()} onValueChange={(value) => setSelectedPeriod(parseInt(value))}>
          <SelectTrigger className="w-32 glass neon-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass border-gray-700">
            <SelectItem value="1">1 Day</SelectItem>
            <SelectItem value="7">7 Days</SelectItem>
            <SelectItem value="30">30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {activityData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-black/20 rounded-lg">
              <div className="text-xl font-bold text-blue-400">{activityData.total_events}</div>
              <div className="text-xs text-gray-400">Total Events</div>
            </div>
            <div className="text-center p-3 bg-black/20 rounded-lg">
              <div className="text-xl font-bold text-green-400">
                {Object.keys(activityData.feature_usage || {}).length}
              </div>
              <div className="text-xs text-gray-400">Features Used</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Event Breakdown</h4>
            {Object.entries(activityData.event_breakdown || {}).map(([event, count]) => (
              <div key={event} className="flex justify-between text-sm">
                <span className="text-gray-400 capitalize">{event.replace('_', ' ')}</span>
                <span className="text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BarChart3 className="w-8 h-8 text-blue-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Beta Analytics Dashboard</h2>
            <p className="text-gray-400">Loading usage analytics and feedback data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass p-6 animate-pulse">
              <div className="h-16 bg-gray-700 rounded mb-4"></div>
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-700 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BarChart3 className="w-8 h-8 text-blue-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Beta Analytics Dashboard</h2>
            <p className="text-gray-400">Usage insights and feedback analysis</p>
          </div>
        </div>
        <Button
          onClick={() => {
            loadAnalyticsData();
            loadUserActivity();
          }}
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {analyticsData && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Beta Users"
              value={analyticsData.total_users}
              icon={Users}
              color="blue"
              description="Active beta testers"
            />
            <StatCard
              title="Features Used"
              value={Object.keys(analyticsData.active_features || {}).length}
              icon={BarChart3}
              color="green"
              description="Different features accessed"
            />
            <StatCard
              title="Feedback Entries"
              value={Object.values(analyticsData.feedback_summary || {}).reduce((sum, data) => sum + (data.count || 0), 0)}
              icon={MessageSquare}
              color="purple"
              description="Total feedback collected"
            />
            <StatCard
              title="Average Rating"
              value={analyticsData.feedback_summary?.rating?.avg_rating?.toFixed(1) || 'N/A'}
              icon={Star}
              color="yellow"
              description="User satisfaction score"
            />
          </div>

          {/* Charts and Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FeatureUsageChart features={analyticsData.active_features} />
            <FeedbackSummary feedbackData={analyticsData.feedback_summary} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TourCompletionRates tourData={analyticsData.tour_completion_rates} />
            <ActivityTimeline activityData={userActivity} />
          </div>
        </>
      )}

      {!analyticsData && !loading && (
        <Card className="glass p-8 text-center">
          <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Analytics Access</h3>
          <p className="text-gray-400 mb-4">
            You need analytics permissions to view this dashboard.
          </p>
          <Badge variant="outline" className="text-blue-400">
            Try switching to CEO or Manager role
          </Badge>
        </Card>
      )}
    </div>
  );
};

export default BetaAnalyticsDashboard;