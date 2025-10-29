import React from 'react';
import { Star } from 'lucide-react';
import { type Ticket } from '@common/types';
import { useRatingState } from '@extension/Rating/hooks/useRatingState';
import { useRatingActions } from '@extension/Rating/hooks/useRatingActions';

interface RatingFormProps {
  ticket: Ticket;
  onSuccess: () => void;
}

/**
 * Rating form component for collecting user feedback
 * Displays star rating (1-5) and optional feedback textarea
 */
export const RatingForm: React.FC<RatingFormProps> = ({ ticket, onSuccess }) => {
  const { rating, setRating, feedback, setFeedback } = useRatingState();
  const { handleSubmitRating, canSubmit } = useRatingActions({
    ticket,
    rating,
    feedback,
    onSuccess,
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Stop propagation to prevent host page keyboard shortcuts
    e.nativeEvent.stopPropagation();
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    // Stop propagation to prevent host page keyboard shortcuts
    e.nativeEvent.stopPropagation();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Stop propagation to prevent host page keyboard shortcuts
    e.nativeEvent.stopPropagation();
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => (
      <button
        key={index}
        onClick={() => setRating(index + 1)}
        className={`unjam-transition-colors ${
          index < rating ? 'unjam-text-yellow-400' : 'unjam-text-gray-300'
        }`}
        aria-label={`Rate ${index + 1} stars`}
      >
        <Star size={24} fill={index < rating ? 'currentColor' : 'none'} />
      </button>
    ));
  };

  return (
    <div data-testid="rating-form">
      <p className="unjam-text-gray-700 unjam-mb-4 unjam-font-medium">Rate your experience:</p>

      <div className="unjam-flex unjam-justify-center unjam-gap-1 unjam-mb-4">
        {renderStars()}
      </div>

      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onKeyPress={handleKeyPress}
        placeholder="Share your feedback (optional)"
        className="unjam-rating-feedback unjam-w-full unjam-bg-white unjam-text-black unjam-p-2 unjam-border unjam-border-gray-300 unjam-rounded unjam-text-sm unjam-resize-none unjam-mb-4"
        rows={3}
        data-testid="rating-feedback-textarea"
      />

      <button
        onClick={handleSubmitRating}
        disabled={!canSubmit}
        className={`unjam-w-full unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm ${
          canSubmit
            ? 'unjam-bg-gray-600 unjam-text-white hover:unjam-bg-gray-700'
            : 'unjam-bg-gray-300 unjam-text-gray-500 unjam-cursor-not-allowed'
        }`}
        data-testid="rating-submit-button"
      >
        Submit Rating
      </button>
    </div>
  );
};
