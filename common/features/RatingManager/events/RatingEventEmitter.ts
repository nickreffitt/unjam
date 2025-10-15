import { type Rating } from '@common/types';

/**
 * Interface for rating event emission implementations
 * Defines the contract that all rating event emitter implementations must follow
 */
export interface RatingEventEmitter {
  /**
   * Emits a rating created event
   * @param rating - The created rating
   */
  emitRatingCreated(rating: Rating): void;

  /**
   * Emits a rating updated event
   * @param rating - The updated rating
   */
  emitRatingUpdated(rating: Rating): void;
}
