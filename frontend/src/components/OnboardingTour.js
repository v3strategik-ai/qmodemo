import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { X, ArrowRight, ArrowLeft, Sparkles, Target, BookOpen, Zap } from 'lucide-react';

const OnboardingTour = ({ onComplete, user }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const tourSteps = [
    {
      id: 'welcome',
      title: 'Welcome to modQ!',
      content: 'Your intelligent business assistant is ready. Let\'s take a quick tour to get you started.',
      icon: <Sparkles className="w-6 h-6" />,
      target: null,
      position: 'center'
    },
    {
      id: 'ai-chat',
      title: 'AI Chat Interface',
      content: 'Start here! Ask your AI assistant anything about business analytics, workflow automation, or strategic planning.',
      icon: <Target className="w-6 h-6" />,
      target: '.ai-chat-container',
      position: 'bottom',
      highlight: true
    },
    {
      id: 'configuration',
      title: 'Configure Your Assistant',
      content: 'Set your company details and choose an AI personality that matches your business needs.',
      icon: <Zap className="w-6 h-6" />,
      target: 'button[role="tab"]:has-text("Configuration")',
      position: 'top',
      action: () => {
        const configTab = document.querySelector('button[role="tab"]');
        if (configTab && configTab.textContent.includes('Configuration')) {
          configTab.click();
        }
      }
    },
    {
      id: 'knowledge-base',
      title: 'Build Your Knowledge Base',
      content: 'Upload company information, policies, and data to train your AI assistant for better, personalized responses.',
      icon: <BookOpen className="w-6 h-6" />,
      target: 'button[role="tab"]:has-text("Knowledge Base")',
      position: 'top',
      action: () => {
        const kbTab = document.querySelector('button[role="tab"]');
        const tabs = document.querySelectorAll('button[role="tab"]');
        tabs.forEach(tab => {
          if (tab.textContent.includes('Knowledge Base')) {
            tab.click();
          }
        });
      }
    },
    {
      id: 'ready',
      title: 'You\'re All Set!',
      content: 'Start your conversation with the AI assistant. Try asking about sales analysis, workflow automation, or business insights.',
      icon: <Target className="w-6 h-6" />,
      target: null,
      position: 'center'
    }
  ];

  const currentStepData = tourSteps[currentStep];

  const nextStep = () => {
    if (currentStepData.action) {
      currentStepData.action();
    }
    
    setTimeout(() => {
      if (currentStep < tourSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        completeTour();
      }
    }, currentStepData.action ? 500 : 0);
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    setIsVisible(false);
    localStorage.setItem(`modq_tour_completed_${user?.id}`, 'true');
    if (onComplete) {
      onComplete();
    }
  };

  const skipTour = () => {
    completeTour();
  };

  useEffect(() => {
    // Check if user has already completed the tour
    const tourCompleted = localStorage.getItem(`modq_tour_completed_${user?.id}`);
    if (tourCompleted) {
      setIsVisible(false);
    }
  }, [user?.id]);

  if (!isVisible) return null;

  const getTooltipPosition = () => {
    const target = currentStepData.target ? document.querySelector(currentStepData.target) : null;
    
    if (!target || currentStepData.position === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999
      };
    }

    const rect = target.getBoundingClientRect();
    const tooltipWidth = 400;
    const tooltipHeight = 200;

    let style = {
      position: 'fixed',
      zIndex: 9999
    };

    switch (currentStepData.position) {
      case 'top':
        style.top = rect.top - tooltipHeight - 20;
        style.left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        break;
      case 'bottom':
        style.top = rect.bottom + 20;
        style.left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        break;
      case 'left':
        style.top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        style.left = rect.left - tooltipWidth - 20;
        break;
      case 'right':
        style.top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        style.left = rect.right + 20;
        break;
      default:
        style.top = '50%';
        style.left = '50%';
        style.transform = 'translate(-50%, -50%)';
    }

    // Keep tooltip within viewport
    if (style.left < 20) style.left = 20;
    if (style.left + tooltipWidth > window.innerWidth - 20) {
      style.left = window.innerWidth - tooltipWidth - 20;
    }
    if (style.top < 20) style.top = 20;
    if (style.top + tooltipHeight > window.innerHeight - 20) {
      style.top = window.innerHeight - tooltipHeight - 20;
    }

    return style;
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={skipTour} />
      
      {/* Highlight Target */}
      {currentStepData.target && currentStepData.highlight && (
        <div
          className="fixed pointer-events-none z-[9999] rounded-lg"
          style={{
            ...(() => {
              const target = document.querySelector(currentStepData.target);
              if (target) {
                const rect = target.getBoundingClientRect();
                return {
                  top: rect.top - 4,
                  left: rect.left - 4,
                  width: rect.width + 8,
                  height: rect.height + 8,
                  boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.3)'
                };
              }
              return {};
            })()
          }}
        />
      )}
      
      {/* Tour Tooltip */}
      <Card 
        className="holographic p-6 w-96 pointer-events-auto"
        style={getTooltipPosition()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-blue-400">
              {currentStepData.icon}
            </div>
            <h3 className="text-lg font-semibold text-white">
              {currentStepData.title}
            </h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={skipTour}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Content */}
        <p className="text-gray-300 text-sm leading-relaxed mb-6">
          {currentStepData.content}
        </p>
        
        {/* Progress */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep 
                    ? 'bg-blue-400' 
                    : index < currentStep 
                      ? 'bg-blue-600' 
                      : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            {currentStep + 1} of {tourSteps.length}
          </Badge>
        </div>
        
        {/* Navigation */}
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={currentStep === 0}
            className="glass neon-border"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              onClick={skipTour}
              className="text-gray-400 hover:text-white"
            >
              Skip Tour
            </Button>
            <Button 
              onClick={nextStep}
              className="tech-button"
            >
              {currentStep === tourSteps.length - 1 ? 'Get Started' : 'Next'}
              {currentStep !== tourSteps.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
};

export default OnboardingTour;