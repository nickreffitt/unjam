import { type Subscription, type SubscriptionEventType } from '@common/types';
import { type SubscriptionEventEmitter } from './SubscriptionEventEmitter';

/**
 * Local storage implementation of the subscription event emitter
 * Uses window events and localStorage for cross-tab communication
 */
export class SubscriptionEventEmitterLocal implements SubscriptionEventEmitter {
  constructor() {
    // No need for local listeners - everything goes through window events
  }

  /**
   * Emits a subscription created event
   * @param subscription - The created subscription
   */
  emitSubscriptionCreated(subscription: Subscription): void {
    this.emitWindowEvent('subscriptionCreated', { subscription });
  }

  /**
   * Emits a subscription updated event
   * @param subscription - The updated subscription
   */
  emitSubscriptionUpdated(subscription: Subscription): void {
    this.emitWindowEvent('subscriptionUpdated', { subscription });
  }

  /**
   * Emits a subscription deleted event
   * @param subscriptionId - The ID of the deleted subscription
   */
  emitSubscriptionDeleted(subscriptionId: string): void {
    this.emitWindowEvent('subscriptionDeleted', { subscriptionId });
  }

  /**
   * Emits a storage event for cross-tab communication only
   */
  private emitWindowEvent(type: SubscriptionEventType, data: Record<string, unknown>): void {
    if (typeof window === 'undefined') return; // Skip in non-browser environments

    const eventPayload = {
      type,
      ...data,
      timestamp: Date.now()
    };

    // Use a temporary localStorage key to trigger storage events across tabs
    const eventKey = 'subscriptionstore-event';
    localStorage.setItem(eventKey, JSON.stringify(eventPayload));

    // Clean up immediately to avoid cluttering localStorage
    localStorage.removeItem(eventKey);

    console.debug('SubscriptionEventEmitterLocal: Emitting storage event:', type, data);
  }
}
