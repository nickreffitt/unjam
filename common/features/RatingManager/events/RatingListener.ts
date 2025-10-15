import { type Rating } from '@common/types';

/**
 * Interface for objects that listen to rating store events
 * All methods are optional to allow listeners to subscribe to only the events they care about
 */
export interface RatingListenerCallbacks {
  /**
   * Called when a new rating is created
   * @param rating - The newly created rating
   */
  onRatingCreated?(rating: Rating): void;

  /**
   * Called when a rating is updated
   * @param rating - The updated rating
   */
  onRatingUpdated?(rating: Rating): void;
}

/**
 * Interface for rating listener implementations
 * Defines the contract that all rating listener implementations must follow
 */
export interface RatingListener {
  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<RatingListenerCallbacks>): void;

  /**
   * Starts listening to rating events for cross-tab/cross-client communication
   */
  startListening(): void;

  /**
   * Stops listening to rating events
   */
  stopListening(): void;

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean;
}
