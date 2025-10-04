import type { BillingEngineerEvent } from '@types'

/**
 * BillingEngineerEventConverter interface for converting webhook events to domain events
 */
export interface BillingEngineerEventConverter {
  /**
   * Convert a billing engineer event webhook to a domain event
   * @param body - The raw request body as a string
   * @param signature - The signature header for verification
   * @returns Promise that resolves with the engineer event
   * @throws Error if event processing fails
   */
  convertEvent(body: string, signature: string): Promise<BillingEngineerEvent>;
}
