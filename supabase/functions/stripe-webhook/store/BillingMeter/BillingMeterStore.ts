/**
 * Parameters for recording ticket completion usage
 */
export interface RecordTicketCompletionParams {
  customerId: string
  ticketId: string
  value?: number // Optional: custom value for weighted tickets (defaults to 1)
  timestamp?: Date // Optional: timestamp for the event (defaults to now)
}

/**
 * Interface for recording usage events that consume billing credits
 * Uses Stripe Meters to track usage that will be billed against credit grants
 */
export interface BillingMeterStore {
  /**
   * Records a ticket completion event that consumes customer credits
   * @param params - The ticket completion parameters
   * @returns Promise that resolves when the meter event is recorded
   */
  recordTicketCompletion(params: RecordTicketCompletionParams): Promise<void>
}
