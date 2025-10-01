import { type Subscription, type SubscriptionEventType } from '@common/types';
import { type SubscriptionListener, type SubscriptionListenerCallbacks } from './SubscriptionListener';

/**
 * Local storage implementation of subscription listener
 * Uses window storage events for cross-tab communication
 */
export class SubscriptionListenerLocal implements SubscriptionListener {
  private callbacks: Partial<SubscriptionListenerCallbacks>;
  private isListening: boolean = false;
  private handleStorageEvent: ((event: StorageEvent) => void) | null = null;

  constructor(callbacks: Partial<SubscriptionListenerCallbacks>) {
    this.callbacks = callbacks;
  }

  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<SubscriptionListenerCallbacks>): void {
    this.callbacks = callbacks;
  }

  /**
   * Starts listening to storage events for cross-tab communication
   */
  startListening(): void {
    if (this.isListening || typeof window === 'undefined') return;

    this.handleStorageEvent = (event: StorageEvent) => {
      // Only process events for our specific key
      if (event.key !== 'subscriptionstore-event' || !event.newValue) return;

      try {
        const eventData = JSON.parse(event.newValue);
        const { type, subscription, subscriptionId } = eventData;

        // Deserialize Date objects if subscription is present
        let deserializedSubscription = subscription;
        if (subscription) {
          deserializedSubscription = {
            ...subscription,
            createdAt: subscription.createdAt ? new Date(subscription.createdAt) : new Date(),
            updatedAt: subscription.updatedAt ? new Date(subscription.updatedAt) : new Date(),
          };
        }

        switch (type as SubscriptionEventType) {
          case 'subscriptionCreated':
            if (this.callbacks.onSubscriptionCreated && deserializedSubscription) {
              try {
                this.callbacks.onSubscriptionCreated(deserializedSubscription);
              } catch (error) {
                console.error('SubscriptionListenerLocal: Error in onSubscriptionCreated:', error);
              }
            }
            break;
          case 'subscriptionUpdated':
            if (this.callbacks.onSubscriptionUpdated && deserializedSubscription) {
              try {
                this.callbacks.onSubscriptionUpdated(deserializedSubscription);
              } catch (error) {
                console.error('SubscriptionListenerLocal: Error in onSubscriptionUpdated:', error);
              }
            }
            break;
          case 'subscriptionDeleted':
            if (this.callbacks.onSubscriptionDeleted && subscriptionId) {
              try {
                this.callbacks.onSubscriptionDeleted(subscriptionId);
              } catch (error) {
                console.error('SubscriptionListenerLocal: Error in onSubscriptionDeleted:', error);
              }
            }
            break;
        }
      } catch (error) {
        console.error('SubscriptionListenerLocal: Error parsing storage event data:', error);
      }
    };

    window.addEventListener('storage', this.handleStorageEvent);
    this.isListening = true;
    console.debug('SubscriptionListenerLocal: Started listening to global subscription events via storage');
  }

  /**
   * Stops listening to storage events
   */
  stopListening(): void {
    if (!this.isListening || !this.handleStorageEvent) return;

    window.removeEventListener('storage', this.handleStorageEvent);
    this.handleStorageEvent = null;
    this.isListening = false;
    console.debug('SubscriptionListenerLocal: Stopped listening to global subscription events');
  }

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}
