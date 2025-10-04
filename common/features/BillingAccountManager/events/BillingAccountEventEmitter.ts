import { type EngineerAccount } from '@common/types';

export type BillingAccountEventType =
  | 'billingAccountCreated'
  | 'billingAccountUpdated';

/**
 * Event emitter for billing account-related events
 * Abstracts the underlying event mechanism to allow for future technology changes
 */
export class BillingAccountEventEmitter {
  constructor() {
    // No need for local listeners - everything goes through window events
  }

  /**
   * Emits a billing account created event
   * @param account - The created account
   */
  emitBillingAccountCreated(account: EngineerAccount): void {
    this.emitWindowEvent('billingAccountCreated', { account });
  }

  /**
   * Emits a billing account updated event
   * @param account - The updated account
   */
  emitBillingAccountUpdated(account: EngineerAccount): void {
    this.emitWindowEvent('billingAccountUpdated', { account });
  }

  /**
   * Emits events for both same-tab and cross-tab communication
   */
  private emitWindowEvent(type: BillingAccountEventType, data: Record<string, unknown>): void {
    if (typeof window === 'undefined') return; // Skip in non-browser environments

    const eventPayload = {
      type,
      ...data,
      timestamp: Date.now()
    };

    // 1. Emit custom window event for same-tab communication
    const customEvent = new CustomEvent('billing-account-event', {
      detail: eventPayload
    });
    window.dispatchEvent(customEvent);

    // 2. Use localStorage to trigger storage events for cross-tab communication
    const eventKey = 'billing-account-event';
    localStorage.setItem(eventKey, JSON.stringify(eventPayload));

    // Clean up immediately to avoid cluttering localStorage
    localStorage.removeItem(eventKey);

    console.debug('BillingAccountEventEmitter: Emitting both window and storage events:', type, data);
  }
}
