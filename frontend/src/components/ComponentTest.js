import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';

// Test imports of potentially problematic components
import VisualAnalyticsDashboard from './VisualAnalyticsDashboard';
import ProgressTracker from './ProgressTracker';
import MobileOptimization from './MobileOptimization';
import APIDocs from './APIDocs';

const ComponentTest = () => {
  const [activeTest, setActiveTest] = React.useState('none');
  
  const mockUser = { id: 'test-user', email: 'test@example.com' };
  const mockConfig = { 
    company_name: 'Test Company', 
    industry: 'Technology',
    ai_personality: 'Professional Assistant'
  };

  return (
    <div className="p-6 space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Component Test Page</h2>
        <div className="flex gap-4 mb-6">
          <Button onClick={() => setActiveTest('analytics')}>Test Analytics</Button>
          <Button onClick={() => setActiveTest('progress')}>Test Progress</Button>
          <Button onClick={() => setActiveTest('mobile')}>Test Mobile</Button>
          <Button onClick={() => setActiveTest('api')}>Test API Docs</Button>
          <Button onClick={() => setActiveTest('none')}>Clear</Button>
        </div>
        
        {activeTest === 'none' && (
          <div className="text-gray-400">Select a component to test</div>
        )}
        
        {activeTest === 'analytics' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Testing VisualAnalyticsDashboard</h3>
            <VisualAnalyticsDashboard userConfig={mockConfig} />
          </div>
        )}
        
        {activeTest === 'progress' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Testing ProgressTracker</h3>
            <ProgressTracker 
              userConfig={mockConfig}
              chatMessages={[]}
              knowledgeItems={[]}
            />
          </div>
        )}
        
        {activeTest === 'mobile' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Testing MobileOptimization</h3>
            <MobileOptimization currentUser={mockUser} />
          </div>
        )}
        
        {activeTest === 'api' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Testing APIDocs</h3>
            <APIDocs currentUser={mockUser} />
          </div>
        )}
      </Card>
    </div>
  );
};

export default ComponentTest;