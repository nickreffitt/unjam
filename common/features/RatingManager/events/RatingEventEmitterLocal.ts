import { type Rating, type RatingEventType } from '@common/types';
import { type RatingEventEmitter } from './RatingEventEmitter';

/**
 * Local storage implementation of the rating event emitter
 * Uses window events and localStorage for cross-tab communication
 */
export class RatingEventEmitterLocal implements RatingEventEmitter {
  constructor() {
    // No need for local listeners - everything goes through window events
  }

  /**
   * Emits a rating created event
   * @param rating - The created rating
   */
  emitRatingCreated(rating: Rating): void {
    this.emitWindowEvent('ratingCreated', { rating });
  }

  /**
   * Emits a rating updated event
   * @param rating - The updated rating
   */
  emitRatingUpdated(rating: Rating): void {
    this.emitWindowEvent('ratingUpdated', { rating });
  }

  /**
   * Emits events for both same-tab and cross-tab communication
   */
  private emitWindowEvent(type: RatingEventType, data: Record<string, unknown>): void {
    if (typeof window === 'undefined') return; // Skip in non-browser environments

    const eventPayload = {
      type,
      ...data,
      timestamp: Date.now()
    };

    // 1. Emit custom window event for same-tab communication
    const customEvent = new CustomEvent('rating-event', {
      detail: eventPayload
    });
    window.dispatchEvent(customEvent);

    // 2. Use localStorage to trigger storage events for cross-tab communication
    const eventKey = 'ratingstore-event';
    localStorage.setItem(eventKey, JSON.stringify(eventPayload));

    // Clean up immediately to avoid cluttering localStorage
    localStorage.removeItem(eventKey);

    console.debug('RatingEventEmitterLocal: Emitting both window and storage events:', type, data);
  }
}
