import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { TrendingUp, TrendingDown, DollarSign, Users, Target, BarChart3, Download, RefreshCw } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const VisualAnalyticsDashboard = ({ userConfig = {}, className = "" }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Generate mock data based on user's industry
  const generateMockData = (industry = 'General') => {
    const baseData = {
      revenue: [45000, 52000, 48000, 61000, 58000, 67000, 72000, 69000, 78000, 82000, 88000, 95000],
      customers: [120, 135, 142, 158, 165, 178, 192, 203, 215, 228, 245, 260],
      conversion: [2.4, 2.8, 2.6, 3.2, 3.0, 3.5, 3.8, 3.6, 4.1, 4.3, 4.6, 4.8],
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    };

    // Industry-specific adjustments
    const industryMultipliers = {
      'Technology': { revenue: 1.3, customers: 1.2, conversion: 1.1 },
      'Finance': { revenue: 1.5, customers: 0.8, conversion: 1.3 },
      'Healthcare': { revenue: 1.2, customers: 0.9, conversion: 1.0 },
      'Consulting': { revenue: 1.1, customers: 0.7, conversion: 1.4 },
      'Retail': { revenue: 0.9, customers: 1.4, conversion: 0.8 }
    };

    const multiplier = industryMultipliers[industry] || { revenue: 1, customers: 1, conversion: 1 };

    return {
      revenue: baseData.revenue.map(val => Math.round(val * multiplier.revenue)),
      customers: baseData.customers.map(val => Math.round(val * multiplier.customers)),
      conversion: baseData.conversion.map(val => (val * multiplier.conversion).toFixed(1)),
      months: baseData.months
    };
  };

  const mockData = generateMockData(userConfig?.industry);

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#9CA3AF',
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3B82F6',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: '#6B7280', font: { size: 11 } },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      y: {
        ticks: { color: '#6B7280', font: { size: 11 } },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    }
  };

  const revenueChartData = {
    labels: mockData.months,
    datasets: [
      {
        label: 'Revenue ($)',
        data: mockData.revenue,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const customerChartData = {
    labels: mockData.months,
    datasets: [
      {
        label: 'Active Customers',
        data: mockData.customers,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: '#10B981',
        borderWidth: 1,
      }
    ]
  };

  const conversionData = {
    labels: ['Direct Traffic', 'Social Media', 'Email Marketing', 'Paid Ads', 'Referrals'],
    datasets: [
      {
        data: [35, 25, 20, 15, 5],
        backgroundColor: [
          '#3B82F6',
          '#8B5CF6', 
          '#10B981',
          '#F59E0B',
          '#EF4444'
        ],
        borderWidth: 0,
      }
    ]
  };

  // Key metrics calculations
  const currentRevenue = mockData.revenue[mockData.revenue.length - 1];
  const previousRevenue = mockData.revenue[mockData.revenue.length - 2];
  const revenueGrowth = ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1);

  const currentCustomers = mockData.customers[mockData.customers.length - 1];
  const previousCustomers = mockData.customers[mockData.customers.length - 2];
  const customerGrowth = ((currentCustomers - previousCustomers) / previousCustomers * 100).toFixed(1);

  const avgConversion = (mockData.conversion.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / mockData.conversion.length).toFixed(1);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setRefreshKey(prev => prev + 1);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Business Analytics Dashboard</h3>
          <p className="text-gray-400">
            {userConfig?.company_name ? `${userConfig.company_name} • ` : ''}{userConfig?.industry || 'Business'} Performance Metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="glass neon-border"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Updating...' : 'Refresh'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="glass neon-border"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="holographic p-4" key={`revenue-${refreshKey}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Monthly Revenue</p>
              <p className="text-2xl font-bold text-white">${currentRevenue.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-1">
                {revenueGrowth > 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                )}
                <span className={`text-xs ${revenueGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {revenueGrowth}%
                </span>
              </div>
            </div>
            <div className="text-blue-400">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
        </Card>

        <Card className="holographic p-4" key={`customers-${refreshKey}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Customers</p>
              <p className="text-2xl font-bold text-white">{currentCustomers.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400">+{customerGrowth}%</span>
              </div>
            </div>
            <div className="text-green-400">
              <Users className="w-8 h-8" />
            </div>
          </div>
        </Card>

        <Card className="holographic p-4" key={`conversion-${refreshKey}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Conversion Rate</p>
              <p className="text-2xl font-bold text-white">{avgConversion}%</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400">+0.3%</span>
              </div>
            </div>
            <div className="text-purple-400">
              <Target className="w-8 h-8" />
            </div>
          </div>
        </Card>

        <Card className="holographic p-4" key={`growth-${refreshKey}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Growth Score</p>
              <p className="text-2xl font-bold text-white">8.7</p>
              <div className="flex items-center gap-1 mt-1">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  Excellent
                </Badge>
              </div>
            </div>
            <div className="text-orange-400">
              <BarChart3 className="w-8 h-8" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="holographic p-6" key={`revenue-chart-${refreshKey}`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Revenue Trend</h4>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              12 Months
            </Badge>
          </div>
          <div className="h-64">
            <Line data={revenueChartData} options={chartOptions} />
          </div>
        </Card>

        {/* Customer Growth */}
        <Card className="holographic p-6" key={`customer-chart-${refreshKey}`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Customer Growth</h4>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              Active
            </Badge>
          </div>
          <div className="h-64">
            <Bar data={customerChartData} options={chartOptions} />
          </div>
        </Card>

        {/* Traffic Sources */}
        <Card className="holographic p-6" key={`traffic-chart-${refreshKey}`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Traffic Sources</h4>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              Current Month
            </Badge>
          </div>
          <div className="h-64">
            <Doughnut 
              data={conversionData} 
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: '#9CA3AF',
                      font: { size: 11 },
                      padding: 15
                    }
                  }
                }
              }} 
            />
          </div>
        </Card>

        {/* Performance Insights */}
        <Card className="holographic p-6" key={`insights-${refreshKey}`}>
          <h4 className="text-lg font-semibold text-white mb-4">AI Insights</h4>
          <div className="space-y-4">
            <div className="glass p-3 rounded-lg border-l-4 border-green-500">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-green-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-300">Strong Growth Trend</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Revenue increased {revenueGrowth}% this month. Customer acquisition is accelerating.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass p-3 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-300">Optimization Opportunity</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Focus on direct traffic conversion - it's your highest volume source.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass p-3 rounded-lg border-l-4 border-orange-500">
              <div className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 text-orange-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-300">Seasonal Pattern</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {userConfig?.industry === 'Retail' ? 'Q4 holiday boost expected' : 'Year-end budget cycles approaching'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Items */}
      <Card className="holographic p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Recommended Actions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
            <h5 className="font-medium text-white mb-2">Optimize Conversion</h5>
            <p className="text-sm text-gray-400">
              Improve lead qualification process to increase conversion rates
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <h5 className="font-medium text-white mb-2">Scale Customer Success</h5>
            <p className="text-sm text-gray-400">
              Implement automated onboarding for growing customer base
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="w-6 h-6 text-purple-400" />
            </div>
            <h5 className="font-medium text-white mb-2">Expand Analytics</h5>
            <p className="text-sm text-gray-400">
              Add predictive analytics for better forecasting
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default VisualAnalyticsDashboard;