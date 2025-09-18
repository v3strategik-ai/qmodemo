import React, { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ThumbsUp, ThumbsDown, MessageSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AIResponseRating = ({ messageId, onRate, className = "" }) => {
  const [rating, setRating] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRate = async (ratingValue) => {
    setRating(ratingValue);
    
    try {
      setIsSubmitting(true);
      
      // Submit rating to backend
      await axios.post(`${API}/chat/rate`, {
        message_id: messageId,
        rating: ratingValue,
        feedback: feedback.trim() || null
      });

      if (onRate) {
        onRate(messageId, ratingValue, feedback);
      }

      toast.success(
        ratingValue === 'helpful' 
          ? 'Thanks for the positive feedback!' 
          : 'Thanks for your feedback! We\'ll improve.'
      );

      // Show feedback form for negative ratings
      if (ratingValue === 'not_helpful' && !showFeedback) {
        setShowFeedback(true);
      }
      
    } catch (error) {
      console.error('Failed to submit rating:', error);
      toast.error('Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitFeedback = async () => {
    if (!feedback.trim()) {
      toast.error('Please provide feedback');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await axios.post(`${API}/chat/feedback`, {
        message_id: messageId,
        rating: rating,
        feedback: feedback.trim()
      });

      toast.success('Feedback submitted! Thank you for helping us improve.');
      setShowFeedback(false);
      
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (rating && !showFeedback) {
    return (
      <div className={`flex items-center gap-2 text-xs text-gray-400 ${className}`}>
        <span>Thanks for your feedback!</span>
        {rating === 'helpful' ? (
          <ThumbsUp className="w-3 h-3 text-green-400" />
        ) : (
          <ThumbsDown className="w-3 h-3 text-orange-400" />
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {!rating && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Was this response helpful?</span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRate('helpful')}
              disabled={isSubmitting}
              className="h-6 px-2 text-xs text-gray-400 hover:text-green-400 hover:bg-green-500/10"
            >
              <ThumbsUp className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRate('not_helpful')}
              disabled={isSubmitting}
              className="h-6 px-2 text-xs text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
            >
              <ThumbsDown className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {showFeedback && (
        <div className="glass p-3 rounded-lg neon-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-white">Help us improve</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFeedback(false)}
              className="text-gray-400 hover:text-white h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What could be better about this response? (optional)"
            className="glass neon-border text-sm h-20"
          />
          
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFeedback(false)}
              className="text-gray-400 hover:text-white"
            >
              Skip
            </Button>
            <Button
              size="sm"
              onClick={submitFeedback}
              disabled={isSubmitting}
              className="tech-button"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIResponseRating;