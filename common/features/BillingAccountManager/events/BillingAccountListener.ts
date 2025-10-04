import { type EngineerAccount } from '@common/types';
import { type BillingAccountEventType } from './BillingAccountEventEmitter';

/**
 * Interface for objects that listen to billing account events
 * All methods are optional to allow listeners to subscribe to only the events they care about
 */
export interface BillingAccountListenerCallbacks {
  /**
   * Called when a new billing account is created
   * @param account - The newly created account
   */
  onBillingAccountCreated?(account: EngineerAccount): void;

  /**
   * Called when a billing account is updated
   * @param account - The updated account
   */
  onBillingAccountUpdated?(account: EngineerAccount): void;
}

/**
 * Class that manages listening to global billing account events
 * Handles both same-tab (window events) and cross-tab (storage events) communication
 */
export class BillingAccountListener {
  private callbacks: Partial<BillingAccountListenerCallbacks>;
  private isListening: boolean = false;
  private handleStorageEvent: ((event: StorageEvent) => void) | null = null;
  private handleWindowEvent: ((event: CustomEvent) => void) | null = null;

  constructor(callbacks: Partial<BillingAccountListenerCallbacks>) {
    this.callbacks = callbacks;
  }

  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<BillingAccountListenerCallbacks>): void {
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
      if (event.key !== 'billing-account-event' || !event.newValue) return;

      try {
        const eventData = JSON.parse(event.newValue);
        this.processEventData(eventData);
      } catch (error) {
        console.error('BillingAccountListener: Error parsing storage event data:', error);
      }
    };

    // Listen for window events (same-tab communication)
    this.handleWindowEvent = (event: CustomEvent) => {
      try {
        this.processEventData(event.detail);
      } catch (error) {
        console.error('BillingAccountListener: Error processing window event data:', error);
      }
    };

    window.addEventListener('storage', this.handleStorageEvent);
    window.addEventListener('billing-account-event', this.handleWindowEvent as EventListener);
    this.isListening = true;

    console.debug('BillingAccountListener: Started listening to global billing account events via storage and window events');
  }

  /**
   * Processes event data from either storage or window events
   */
  private processEventData(eventData: any): void {
    try {
      const { type, account } = eventData;

      // Deserialize Date objects if needed
      let deserializedAccount = account;
      if (account) {
        deserializedAccount = {
          ...account,
          currentDeadline: account.currentDeadline ? new Date(account.currentDeadline) : null,
        };
      }

      switch (type as BillingAccountEventType) {
        case 'billingAccountCreated':
          if (this.callbacks.onBillingAccountCreated && deserializedAccount) {
            try {
              this.callbacks.onBillingAccountCreated(deserializedAccount);
            } catch (error) {
              console.error('BillingAccountListener: Error in onBillingAccountCreated:', error);
            }
          }
          break;
        case 'billingAccountUpdated':
          if (this.callbacks.onBillingAccountUpdated && deserializedAccount) {
            try {
              this.callbacks.onBillingAccountUpdated(deserializedAccount);
            } catch (error) {
              console.error('BillingAccountListener: Error in onBillingAccountUpdated:', error);
            }
          }
          break;
      }
    } catch (error) {
      console.error('BillingAccountListener: Error processing event data:', error);
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
      window.removeEventListener('billing-account-event', this.handleWindowEvent as EventListener);
      this.handleWindowEvent = null;
    }

    this.isListening = false;
    console.debug('BillingAccountListener: Stopped listening to global billing account events');
  }

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}
