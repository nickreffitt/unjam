import React from 'react';
import { type Ticket } from '@common/types';
import { RatingForm } from '@extension/Rating/components/RatingForm/RatingForm';
import { RatingSuccess } from '@extension/Rating/components/RatingSuccess/RatingSuccess';
import { useRatingState } from '@extension/Rating/hooks/useRatingState';

interface RatingProps {
  ticket: Ticket;
  onClose?: () => void;
}

/**
 * Top-level Rating component that manages rating submission flow
 * Conditionally renders RatingForm or RatingSuccess based on submission state
 */
const Rating: React.FC<RatingProps> = ({ ticket, onClose }) => {
  const { isSubmitted, setIsSubmitted } = useRatingState();

  const handleSuccess = () => {
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return <RatingSuccess onClose={onClose} />;
  }

  return <RatingForm ticket={ticket} onSuccess={handleSuccess} />;
};

export default Rating;
