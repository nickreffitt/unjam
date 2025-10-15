import { type Rating, type RatingEventType } from '@common/types';
import { type RatingListener, type RatingListenerCallbacks } from './RatingListener';

/**
 * Local storage implementation of rating listener
 * Uses window events and localStorage for cross-tab communication
 */
export class RatingListenerLocal implements RatingListener {
  private callbacks: Partial<RatingListenerCallbacks>;
  private isListening: boolean = false;
  private handleStorageEvent: ((event: StorageEvent) => void) | null = null;
  private handleWindowEvent: ((event: CustomEvent) => void) | null = null;

  constructor(callbacks: Partial<RatingListenerCallbacks>) {
    this.callbacks = callbacks;
  }

  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<RatingListenerCallbacks>): void {
    this.callbacks = callbacks;
  }

  /**
   * Starts listening to both storage events (cross-tab) and window events (same-tab)
   */
  startListening(): void {
    if (this.isListening || typeof window === 'undefined') return;

    // Listen for storage events (cross-tab communication)
    this.handleStorageEvent = (event: StorageEvent) => {
      // Only process events for our specific key
      if (event.key !== 'ratingstore-event' || !event.newValue) return;

      try {
        const eventData = JSON.parse(event.newValue);
        this.processEventData(eventData);
      } catch (error) {
        console.error('RatingListenerLocal: Error parsing storage event data:', error);
      }
    };

    // Listen for window events (same-tab communication)
    this.handleWindowEvent = (event: CustomEvent) => {
      try {
        this.processEventData(event.detail);
      } catch (error) {
        console.error('RatingListenerLocal: Error processing window event data:', error);
      }
    };

    window.addEventListener('storage', this.handleStorageEvent);
    window.addEventListener('rating-event', this.handleWindowEvent as EventListener);
    this.isListening = true;

    console.debug('RatingListenerLocal: Started listening to global rating events via storage and window events');
  }

  /**
   * Processes event data from either storage or window events
   */
  private processEventData(eventData: any): void {
    try {
      if (!eventData || typeof eventData !== 'object') {
        console.warn('RatingListenerLocal: Invalid event data received:', eventData);
        return;
      }

      const { type, rating } = eventData;

      // Deserialize Date objects if rating is present
      let deserializedRating = rating;
      if (rating) {
        deserializedRating = {
          ...rating,
          createdAt: rating.createdAt ? new Date(rating.createdAt) : new Date(),
          updatedAt: rating.updatedAt ? new Date(rating.updatedAt) : null,
        };
      }

      switch (type as RatingEventType) {
        case 'ratingCreated':
          if (this.callbacks.onRatingCreated && deserializedRating) {
            try {
              this.callbacks.onRatingCreated(deserializedRating);
            } catch (error) {
              console.error('RatingListenerLocal: Error in onRatingCreated:', error);
            }
          }
          break;
        case 'ratingUpdated':
          if (this.callbacks.onRatingUpdated && deserializedRating) {
            try {
              this.callbacks.onRatingUpdated(deserializedRating);
            } catch (error) {
              console.error('RatingListenerLocal: Error in onRatingUpdated:', error);
            }
          }
          break;
      }
    } catch (error) {
      console.error('RatingListenerLocal: Error processing event data:', error);
    }
  }

  /**
   * Stops listening to both storage and window events
   */
  stopListening(): void {
    if (!this.isListening) return;

    if (this.handleStorageEvent) {
      window.removeEventListener('storage', this.handleStorageEvent);
      this.handleStorageEvent = null;
    }

    if (this.handleWindowEvent) {
      window.removeEventListener('rating-event', this.handleWindowEvent as EventListener);
      this.handleWindowEvent = null;
    }

    this.isListening = false;
    console.debug('RatingListenerLocal: Stopped listening to global rating events');
  }

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}
