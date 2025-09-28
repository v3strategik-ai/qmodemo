import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { MessageSquare, Star, Bug, Lightbulb, X, Send, Heart } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FeedbackWidget = ({ currentUser, featureName, isOpen, onClose }) => {
  const [feedbackType, setFeedbackType] = useState('rating');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const feedbackTypes = [
    { value: 'rating', label: 'Rate Feature', icon: Star },
    { value: 'comment', label: 'General Feedback', icon: MessageSquare },
    { value: 'bug_report', label: 'Report Bug', icon: Bug },
    { value: 'suggestion', label: 'Suggest Improvement', icon: Lightbulb }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('Please log in to submit feedback');
      return;
    }

    try {
      setLoading(true);
      
      const feedbackData = {
        user_id: currentUser.id,
        feature_name: featureName,
        feedback_type: feedbackType,
        rating: feedbackType === 'rating' ? rating : null,
        comment: comment.trim() || null,
        metadata: {
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          feature_context: featureName
        }
      };

      await axios.post(`${API}/beta/feedback/submit`, feedbackData);
      
      setSubmitted(true);
      toast.success('Thank you for your feedback! 🙏');
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setRating(0);
        setComment('');
        setFeedbackType('rating');
      }, 2000);
      
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ value, onChange, readonly = false }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !readonly && onChange(star)}
            className={`p-1 transition-colors ${
              star <= value 
                ? 'text-yellow-400' 
                : 'text-gray-500 hover:text-yellow-300'
            } ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
            disabled={readonly}
          >
            <Star className="w-5 h-5" fill={star <= value ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="glass w-full max-w-md">
        {submitted ? (
          <div className="p-6 text-center">
            <div className="text-green-400 mb-4">
              <Heart className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Thank You!
            </h3>
            <p className="text-gray-300">
              Your feedback helps us improve modQ for everyone.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-6 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Share Feedback</h3>
                <p className="text-sm text-gray-400">
                  Help us improve <span className="text-blue-400">{featureName}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 pt-0 space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Feedback Type
                </label>
                <Select value={feedbackType} onValueChange={setFeedbackType}>
                  <SelectTrigger className="glass neon-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-gray-700">
                    {feedbackTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              {feedbackType === 'rating' && (
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    Rate this feature
                  </label>
                  <div className="flex items-center gap-3">
                    <StarRating value={rating} onChange={setRating} />
                    <span className="text-sm text-gray-400">
                      {rating > 0 && (
                        rating === 5 ? 'Excellent!' :
                        rating === 4 ? 'Good' :
                        rating === 3 ? 'Average' :
                        rating === 2 ? 'Poor' : 'Very Poor'
                      )}
                    </span>
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  {feedbackType === 'bug_report' ? 'Describe the bug' :
                   feedbackType === 'suggestion' ? 'Your suggestion' :
                   'Additional comments'} (optional)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    feedbackType === 'bug_report' ? 'What happened? What did you expect to happen?' :
                    feedbackType === 'suggestion' ? 'What would make this feature better?' :
                    'Tell us more about your experience...'
                  }
                  className="glass neon-border min-h-[80px]"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || (feedbackType === 'rating' && rating === 0)}
                  className="flex-1 tech-button"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Feedback
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </Card>
    </div>
  );
};

// Floating feedback button component
export const FeedbackButton = ({ currentUser, featureName = 'general' }) => {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowFeedback(true)}
        size="sm"
        variant="ghost"
        className="text-gray-400 hover:text-blue-400 transition-colors"
        title="Give feedback"
      >
        <MessageSquare className="w-4 h-4" />
      </Button>
      
      <FeedbackWidget
        currentUser={currentUser}
        featureName={featureName}
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
    </>
  );
};

export default FeedbackWidget;