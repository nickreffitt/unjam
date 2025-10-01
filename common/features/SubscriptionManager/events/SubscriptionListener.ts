import { type Subscription } from '@common/types';

/**
 * Interface for objects that listen to subscription store events
 * All methods are optional to allow listeners to subscribe to only the events they care about
 */
export interface SubscriptionListenerCallbacks {
  /**
   * Called when a new subscription is created
   * @param subscription - The newly created subscription
   */
  onSubscriptionCreated?(subscription: Subscription): void;

  /**
   * Called when a subscription is updated
   * @param subscription - The updated subscription
   */
  onSubscriptionUpdated?(subscription: Subscription): void;

  /**
   * Called when a subscription is deleted
   * @param subscriptionId - The ID of the deleted subscription
   */
  onSubscriptionDeleted?(subscriptionId: string): void;
}

/**
 * Interface for subscription listener implementations
 * Defines the contract that all subscription listener implementations must follow
 */
export interface SubscriptionListener {
  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<SubscriptionListenerCallbacks>): void;

  /**
   * Starts listening to subscription events for cross-tab/cross-client communication
   */
  startListening(): void;

  /**
   * Stops listening to subscription events
   */
  stopListening(): void;

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean;
}
