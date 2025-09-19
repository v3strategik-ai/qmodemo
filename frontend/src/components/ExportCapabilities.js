import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { 
  Download, 
  FileText, 
  Image, 
  BarChart3, 
  MessageSquare, 
  FileSpreadsheet,
  Archive,
  Clock,
  CheckCircle,
  X
} from 'lucide-react';
import { toast } from 'sonner';

const ExportCapabilities = ({ 
  userConfig, 
  chatMessages, 
  knowledgeItems, 
  insights,
  className = "" 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    format: 'pdf',
    includeChats: true,
    includeInsights: true,
    includeKnowledge: true,
    includeAnalytics: true,
    dateRange: 'all'
  });
  const [exportHistory, setExportHistory] = useState([]);

  const exportFormats = [
    {
      id: 'pdf',
      name: 'PDF Report',
      description: 'Professional business report with charts and insights',
      icon: <FileText className="w-4 h-4" />,
      color: 'text-red-400',
      fileSize: '2-5 MB'
    },
    {
      id: 'excel',
      name: 'Excel Spreadsheet',
      description: 'Data tables with analytics and conversation logs',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      color: 'text-green-400',
      fileSize: '1-3 MB'
    },
    {
      id: 'json',
      name: 'JSON Data',
      description: 'Raw data export for developers and integrations',
      icon: <Archive className="w-4 h-4" />,
      color: 'text-blue-400',
      fileSize: '500KB - 2MB'
    },
    {
      id: 'csv',
      name: 'CSV Tables',
      description: 'Comma-separated values for easy data analysis',
      icon: <BarChart3 className="w-4 h-4" />,
      color: 'text-purple-400',
      fileSize: '200KB - 1MB'
    }
  ];

  const exportSections = [
    {
      id: 'includeChats',
      name: 'AI Conversations',
      description: 'All chat messages and AI responses',
      icon: <MessageSquare className="w-4 h-4" />,
      count: chatMessages?.length || 0
    },
    {
      id: 'includeInsights',
      name: 'Smart Insights',
      description: 'AI-generated business insights and recommendations',
      icon: <BarChart3 className="w-4 h-4" />,
      count: insights?.length || 5
    },
    {
      id: 'includeKnowledge',
      name: 'Knowledge Base',
      description: 'Uploaded documents and business information',
      icon: <FileText className="w-4 h-4" />,
      count: knowledgeItems?.length || 0
    },
    {
      id: 'includeAnalytics',
      name: 'Analytics Data',
      description: 'Performance metrics and usage statistics',
      icon: <BarChart3 className="w-4 h-4" />,
      count: 12 // Mock analytics count
    }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Simulate export process
      await simulateExport();
      
      const exportRecord = {
        id: Date.now(),
        format: exportConfig.format,
        sections: Object.keys(exportConfig).filter(key => 
          key.startsWith('include') && exportConfig[key]
        ).length,
        size: generateMockFileSize(),
        createdAt: new Date().toISOString(),
        status: 'completed'
      };
      
      setExportHistory(prev => [exportRecord, ...prev.slice(0, 4)]); // Keep last 5
      
      toast.success(`${exportFormats.find(f => f.id === exportConfig.format)?.name} exported successfully!`);
      
    } catch (error) {
      toast.error('Export failed. Please try again.');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const simulateExport = () => {
    return new Promise((resolve) => {
      setTimeout(resolve, 3000); // Simulate 3 second export
    });
  };

  const generateMockFileSize = () => {
    const format = exportConfig.format;
    const baseSizes = {
      pdf: 2500, // KB
      excel: 1800,
      json: 800,
      csv: 400
    };
    
    const sectionMultiplier = Object.keys(exportConfig).filter(key => 
      key.startsWith('include') && exportConfig[key]
    ).length * 0.3;
    
    const size = Math.round(baseSizes[format] * (1 + sectionMultiplier));
    
    if (size > 1024) {
      return `${(size / 1024).toFixed(1)} MB`;
    }
    return `${size} KB`;
  };

  const generateExportPreview = () => {
    const selectedFormat = exportFormats.find(f => f.id === exportConfig.format);
    const selectedSections = exportSections.filter(section => 
      exportConfig[section.id]
    );
    
    return {
      format: selectedFormat,
      sections: selectedSections,
      estimatedSize: generateMockFileSize(),
      itemCount: selectedSections.reduce((total, section) => total + section.count, 0)
    };
  };

  const downloadFile = (exportRecord) => {
    // Simulate file download
    const format = exportRecord.format;
    const fileName = `modQ-export-${new Date(exportRecord.createdAt).toISOString().split('T')[0]}.${format}`;
    
    // Create a mock blob and download it
    const mockContent = generateMockFileContent(format);
    const blob = new Blob([mockContent], { 
      type: format === 'pdf' ? 'application/pdf' : 
            format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
            format === 'json' ? 'application/json' : 'text/csv'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success(`${fileName} downloaded!`);
  };

  const generateMockFileContent = (format) => {
    const data = {
      exportInfo: {
        generatedAt: new Date().toISOString(),
        company: userConfig?.company_name || 'Your Company',
        industry: userConfig?.industry || 'General',
        format: format
      },
      conversations: chatMessages?.slice(0, 5).map(msg => ({
        timestamp: msg.timestamp,
        message: msg.message,
        response: msg.response?.substring(0, 200) + '...'
      })) || [],
      insights: [
        "Sales performance trending upward based on recent conversations",
        "Automation opportunities identified in workflow discussions",
        "Customer success metrics showing positive engagement"
      ],
      analytics: {
        totalConversations: chatMessages?.length || 0,
        knowledgeItems: knowledgeItems?.length || 0,
        avgResponseTime: "2.3 seconds",
        satisfactionScore: "94%"
      }
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      let csv = "Type,Timestamp,Content\n";
      data.conversations.forEach(conv => {
        csv += `Message,${conv.timestamp},"${conv.message}"\n`;
        csv += `Response,${conv.timestamp},"${conv.response}"\n`;
      });
      return csv;
    } else {
      return `modQ Business Intelligence Export
Generated: ${new Date().toLocaleString()}
Company: ${data.exportInfo.company}
Industry: ${data.exportInfo.industry}

SUMMARY:
- Total Conversations: ${data.analytics.totalConversations}
- Knowledge Items: ${data.analytics.knowledgeItems}
- Average Response Time: ${data.analytics.avgResponseTime}
- Satisfaction Score: ${data.analytics.satisfactionScore}

This is a demo export. In production, this would contain your actual business data and insights.`;
    }
  };

  const preview = generateExportPreview();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Export Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button className="tech-button">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </DialogTrigger>
        
        <DialogContent className="glass max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-400" />
              Export Your Business Data
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <h4 className="font-medium text-white mb-3">Export Format</h4>
              <div className="grid grid-cols-2 gap-3">
                {exportFormats.map((format) => (
                  <Card 
                    key={format.id}
                    className={`p-3 cursor-pointer transition-all border ${
                      exportConfig.format === format.id 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-gray-600 hover:border-gray-500 glass'
                    }`}
                    onClick={() => setExportConfig({...exportConfig, format: format.id})}
                  >
                    <div className="flex items-start gap-3">
                      <div className={format.color}>
                        {format.icon}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-white">{format.name}</h5>
                        <p className="text-xs text-gray-400 mt-1">{format.description}</p>
                        <Badge className="mt-2 bg-gray-700/50 text-gray-300 text-xs">
                          {format.fileSize}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Section Selection */}
            <div>
              <h4 className="font-medium text-white mb-3">Include Data</h4>
              <div className="space-y-3">
                {exportSections.map((section) => (
                  <div key={section.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={section.id}
                      checked={exportConfig[section.id]}
                      onCheckedChange={(checked) => 
                        setExportConfig({...exportConfig, [section.id]: checked})
                      }
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <div className="text-gray-400">
                        {section.icon}
                      </div>
                      <div className="flex-1">
                        <label htmlFor={section.id} className="text-sm font-medium text-white cursor-pointer">
                          {section.name}
                        </label>
                        <p className="text-xs text-gray-400">{section.description}</p>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                        {section.count} items
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <h4 className="font-medium text-white mb-3">Date Range</h4>
              <Select value={exportConfig.dateRange} onValueChange={(value) => 
                setExportConfig({...exportConfig, dateRange: value})
              }>
                <SelectTrigger className="glass neon-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export Preview */}
            <Card className="glass p-4 border-blue-500/30">
              <h4 className="font-medium text-white mb-3">Export Preview</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Format:</span>
                  <span className="text-white">{preview.format?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sections:</span>
                  <span className="text-white">{preview.sections.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Items:</span>
                  <span className="text-white">{preview.itemCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Estimated Size:</span>
                  <span className="text-white">{preview.estimatedSize}</span>
                </div>
              </div>
            </Card>

            {/* Export Button */}
            <Button 
              onClick={handleExport}
              disabled={isExporting || preview.sections.length === 0}
              className="w-full tech-button"
            >
              {isExporting ? (
                <>
                  <div className="loading-spinner mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export {preview.format?.name}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export History */}
      {exportHistory.length > 0 && (
        <Card className="glass p-4">
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            Recent Exports
          </h4>
          
          <div className="space-y-3">
            {exportHistory.map((record) => {
              const format = exportFormats.find(f => f.id === record.format);
              return (
                <div key={record.id} className="flex items-center justify-between p-3 glass rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={format?.color}>
                      {format?.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{format?.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(record.createdAt).toLocaleString()} • {record.size}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(record)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ExportCapabilities;