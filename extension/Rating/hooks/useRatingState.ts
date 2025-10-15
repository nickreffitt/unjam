import { useState } from 'react';

/**
 * Hook for managing rating form state
 * Handles rating value (1-5 stars) and optional feedback text
 */
export function useRatingState() {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const resetRating = () => {
    setRating(0);
    setFeedback('');
    setIsSubmitted(false);
  };

  return {
    rating,
    setRating,
    feedback,
    setFeedback,
    isSubmitted,
    setIsSubmitted,
    resetRating,
  };
}
