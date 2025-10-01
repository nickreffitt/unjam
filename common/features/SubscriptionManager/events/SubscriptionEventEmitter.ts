import { type Subscription } from '@common/types';

/**
 * Interface for subscription event emission implementations
 * Defines the contract that all subscription event emitter implementations must follow
 */
export interface SubscriptionEventEmitter {
  /**
   * Emits a subscription created event
   * @param subscription - The created subscription
   */
  emitSubscriptionCreated(subscription: Subscription): void;

  /**
   * Emits a subscription updated event
   * @param subscription - The updated subscription
   */
  emitSubscriptionUpdated(subscription: Subscription): void;

  /**
   * Emits a subscription deleted event
   * @param subscriptionId - The ID of the deleted subscription
   */
  emitSubscriptionDeleted(subscriptionId: string): void;
}
