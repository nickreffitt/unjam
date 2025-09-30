import type { BillingEvent } from './types.ts'

/**
 * BillingEventHandler interface for handling billing-related webhook events
 */
export interface BillingEventHandler {
  /**
   * Handle a billing event webhook
   * @param body - The raw request body as a string
   * @param signature - The signature header for verification
   * @returns Promise that resolves with the billing event
   * @throws Error if event processing fails
   */
  handleEvent(body: string, signature: string): Promise<BillingEvent>;
}