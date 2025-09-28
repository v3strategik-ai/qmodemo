import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { X, ArrowLeft, ArrowRight, Play, RotateCcw } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GuidedTour = ({ currentUser, onTourEnd }) => {
  const [availableTours, setAvailableTours] = useState([]);
  const [currentTour, setCurrentTour] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showTourList, setShowTourList] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      loadAvailableTours();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentTour && currentTour.steps && currentTour.steps.length > 0) {
      highlightStep(currentTour.steps[currentStep]);
    }
  }, [currentTour, currentStep]);

  const loadAvailableTours = async () => {
    try {
      const response = await axios.get(`${API}/beta/tours/user/${currentUser.id}`);
      setAvailableTours(response.data.tours);
      
      // Auto-start welcome tour for new users if not completed
      const welcomeTour = response.data.tours.find(tour => 
        tour.tour_name === 'welcome_tour' && !tour.progress.completed
      );
      
      if (welcomeTour && !tour.progress.started) {
        // Auto-start welcome tour after a delay
        setTimeout(() => {
          startTour(welcomeTour);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to load tours:', error);
    }
  };

  const highlightStep = (step) => {
    // Remove previous highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });
    
    if (step.target && step.target !== 'body') {
      const element = document.querySelector(step.target);
      if (element) {
        element.classList.add('tour-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedElement(element);
      }
    }
  };

  const startTour = async (tour) => {
    try {
      setCurrentTour(tour);
      setCurrentStep(0);
      setShowTourList(false);
      
      // Track tour start
      await axios.post(`${API}/beta/tours/start`, {
        user_id: currentUser.id,
        tour_id: tour.id
      });
      
      await axios.post(`${API}/beta/analytics/track`, {
        user_id: currentUser.id,
        event_type: 'tour_started',
        feature_name: 'guided_tours',
        metadata: { tour_name: tour.tour_name }
      });
      
    } catch (error) {
      console.error('Failed to start tour:', error);
      toast.error('Failed to start tour');
    }
  };

  const nextStep = async () => {
    if (currentTour && currentStep < currentTour.steps.length - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      
      // Update progress
      await updateProgress(newStep, false);
    } else {
      // Tour completed
      await completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateProgress = async (step, completed) => {
    try {
      await axios.post(`${API}/beta/tours/progress`, {
        user_id: currentUser.id,
        tour_id: currentTour.id,
        step: step,
        completed: completed
      });
    } catch (error) {
      console.error('Failed to update tour progress:', error);
    }
  };

  const completeTour = async () => {
    try {
      await updateProgress(currentTour.steps.length, true);
      
      // Track completion
      await axios.post(`${API}/beta/analytics/track`, {
        user_id: currentUser.id,
        event_type: 'tour_completed',
        feature_name: 'guided_tours',
        metadata: { 
          tour_name: currentTour.tour_name,
          steps_completed: currentTour.steps.length
        }
      });
      
      toast.success('Tour completed! 🎉');
      endTour();
      
    } catch (error) {
      console.error('Failed to complete tour:', error);
    }
  };

  const endTour = () => {
    // Remove highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });
    
    setCurrentTour(null);
    setCurrentStep(0);
    setHighlightedElement(null);
    
    if (onTourEnd) {
      onTourEnd();
    }
  };

  const skipTour = async () => {
    try {
      await axios.post(`${API}/beta/analytics/track`, {
        user_id: currentUser.id,
        event_type: 'tour_skipped',
        feature_name: 'guided_tours',
        metadata: { 
          tour_name: currentTour.tour_name,
          step_skipped_at: currentStep
        }
      });
      
      endTour();
    } catch (error) {
      console.error('Failed to track tour skip:', error);
      endTour();
    }
  };

  if (!currentUser) {
    return null;
  }

  // Tour overlay and popup
  if (currentTour && currentTour.steps && currentTour.steps.length > 0) {
    const step = currentTour.steps[currentStep];
    
    return (
      <>
        {/* Tour Overlay */}
        <div className="fixed inset-0 bg-black/50 z-50 pointer-events-none">
          {/* Tour Step Card */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Card className="glass p-6 max-w-md mx-4 pointer-events-auto animate-pulse-slow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <div className="text-sm text-blue-400">
                    Step {currentStep + 1} of {currentTour.steps.length}
                  </div>
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
              
              <p className="text-gray-300 mb-6">{step.content}</p>
              
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                
                <div className="flex gap-1">
                  {currentTour.steps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentStep ? 'bg-blue-400' : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
                
                <Button
                  onClick={nextStep}
                  className="tech-button"
                >
                  {currentStep === currentTour.steps.length - 1 ? 'Finish' : 'Next'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
        
        {/* Add tour highlight styles */}
        <style jsx global>{`
          .tour-highlight {
            position: relative;
            z-index: 51;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3);
            border-radius: 8px;
            animation: tour-pulse 2s infinite;
          }
          
          @keyframes tour-pulse {
            0%, 100% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3); }
            50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3), 0 0 30px rgba(59, 130, 246, 0.5); }
          }
        `}</style>
      </>
    );
  }

  // Tour list button (when no active tour)
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Button
        onClick={() => setShowTourList(!showTourList)}
        className="tech-button shadow-lg"
        size="sm"
      >
        <Play className="w-4 h-4 mr-2" />
        Tours
      </Button>
      
      {showTourList && (
        <Card className="glass absolute bottom-12 right-0 p-4 w-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Available Tours</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTourList(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            {availableTours.map((tour) => (
              <div key={tour.id} className="border border-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-white">{tour.title}</h4>
                  {tour.progress.completed && (
                    <div className="text-green-400 text-xs">✓ Completed</div>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-3">{tour.description}</p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => startTour(tour)}
                    className="tech-button"
                  >
                    {tour.progress.started && !tour.progress.completed ? 'Continue' : 'Start'}
                  </Button>
                  {tour.progress.completed && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startTour(tour)}
                      className="text-gray-400"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Restart
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default GuidedTour;