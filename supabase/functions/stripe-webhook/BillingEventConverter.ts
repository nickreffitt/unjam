import type { BillingEvent } from './types.ts'

/**
 * BillingEventConverter interface for converting webhook events to domain events
 */
export interface BillingEventConverter {
  /**
   * Convert a billing event webhook to a domain event
   * @param body - The raw request body as a string
   * @param signature - The signature header for verification
   * @returns Promise that resolves with the billing event
   * @throws Error if event processing fails
   */
  convertEvent(body: string, signature: string): Promise<BillingEvent>;
}