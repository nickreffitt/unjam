import { useCallback } from 'react';
import { type Ticket } from '@common/types';
import { useRatingManager } from '@extension/contexts/RatingManagerContext';
import { useUserProfile } from '@extension/shared/UserProfileContext';

interface UseRatingActionsParams {
  ticket: Ticket | null;
  rating: number;
  feedback: string;
  onSuccess: () => void;
}

/**
 * Hook for managing rating actions
 * Handles submitting ratings via RatingManager
 */
export function useRatingActions({ ticket, rating, feedback, onSuccess }: UseRatingActionsParams) {
  const { ratingManager } = useRatingManager();
  const { customerProfile } = useUserProfile();

  const handleSubmitRating = useCallback(async () => {
    if (!ticket) {
      console.error('useRatingActions: Cannot submit rating - no ticket provided');
      return;
    }

    if (!customerProfile) {
      console.error('useRatingActions: Cannot submit rating - user not authenticated');
      return;
    }

    if (rating === 0) {
      console.error('useRatingActions: Cannot submit rating - rating is required');
      return;
    }

    if (!ticket.assignedTo) {
      console.error('useRatingActions: Cannot submit rating - ticket has no assigned engineer');
      return;
    }

    try {
      // Convert 1-5 star rating to 0-500 scale (e.g., 4 stars = 400)
      const ratingValue = rating * 100;

      await ratingManager.createRating(
        ticket.id,
        customerProfile,
        ticket.assignedTo,
        ratingValue,
        feedback.trim() || undefined
      );

      console.debug('useRatingActions: Rating submitted successfully', {
        ticketId: ticket.id,
        rating: ratingValue,
        hasFeedback: !!feedback.trim(),
      });

      onSuccess();
    } catch (error) {
      console.error('useRatingActions: Failed to submit rating:', error);
      // TODO: Show error to user
    }
  }, [ticket, rating, feedback, ratingManager, customerProfile, onSuccess]);

  return {
    handleSubmitRating,
    canSubmit: rating > 0 && !!ticket && !!customerProfile && !!ticket.assignedTo,
  };
}
