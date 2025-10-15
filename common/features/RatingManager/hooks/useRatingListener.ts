import { useEffect, useRef } from 'react';
import { type RatingListener, RatingListenerLocal, type RatingListenerCallbacks } from '@common/features/RatingManager/events';

/**
 * Hook that listens to global rating events via window events
 * This hook uses the RatingListener class to manage window event subscriptions
 *
 * @param callbacks - Partial listener implementation with only the events you care about
 *
 * @example
 * ```tsx
 * useRatingListener({
 *   onRatingCreated: (rating) => {
 *     console.log('New rating created:', rating);
 *     refetchRatings();
 *   },
 *   onRatingUpdated: (rating) => {
 *     console.log('Rating updated:', rating);
 *     updateRatingInList(rating);
 *   }
 * });
 * ```
 */
export function useRatingListener(callbacks: Partial<RatingListenerCallbacks>): void {
  // Create a RatingListener instance and keep it stable across re-renders
  const ratingListenerRef = useRef<RatingListener | null>(null);

  useEffect(() => {
    // Create the listener on first render
    if (!ratingListenerRef.current) {
      ratingListenerRef.current = new RatingListenerLocal(callbacks);
      ratingListenerRef.current.startListening();
    } else {
      // Update callbacks on subsequent renders
      ratingListenerRef.current.updateCallbacks(callbacks);
    }

    // Cleanup on unmount
    return () => {
      if (ratingListenerRef.current) {
        ratingListenerRef.current.stopListening();
        ratingListenerRef.current = null;
      }
    };
  }, [callbacks]);
}
