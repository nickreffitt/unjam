/**
 * Minimal ticket information needed for billing operations
 */
export interface TicketBillingInfo {
  id: string
  customerId: string // Profile ID of the customer who created the ticket
  engineerId: string | null // Profile ID of the engineer assigned to the ticket
  status: string
  createdAt: Date
  claimedAt: Date | null // When engineer claimed the ticket (start of work)
  resolvedAt: Date | null // When ticket was marked resolved/completed
}

/**
 * Minimal interface for ticket storage operations needed by billing functions
 * This is a simplified version focused only on read operations for billing
 */
export interface TicketStore {
  /**
   * Fetches minimal ticket information needed for billing
   * @param ticketId - The ticket ID
   * @returns Ticket billing info if found, undefined otherwise
   */
  fetchBillingInfo(ticketId: string): Promise<TicketBillingInfo | undefined>

  /**
   * Updates the status of a ticket
   * @param ticketId - The ticket ID
   * @param status - The new status
   * @returns Updated ticket billing info if found, undefined otherwise
   */
  updateStatus(ticketId: string, status: string): Promise<TicketBillingInfo | undefined>
}
