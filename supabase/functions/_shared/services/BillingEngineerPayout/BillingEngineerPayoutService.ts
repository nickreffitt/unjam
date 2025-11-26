/**
 * Parameters for creating an engineer payout transfer
 */
export interface CreateTransferParams {
  ticketId: string
  engineerId: string
  engineerConnectAccountId: string
  customerId: string
  creditValue: number // Customer credit value in cents (e.g., 1000 = $10)
  payoutAmount: number // Engineer payout amount in cents (e.g., 2000 = $20)
}

/**
 * Result of creating a transfer to an engineer
 */
export interface TransferResult {
  transferId: string // Stripe transfer ID
  amount: number // Amount transferred to engineer in cents
  platformProfit: number // Platform profit in cents (creditValue - amount)
}

/**
 * Interface for managing engineer payouts via Stripe Connect
 * Handles transfers from platform to engineer Connect accounts
 */
export interface BillingEngineerPayoutService {
  /**
   * Creates a transfer to pay an engineer for completing a ticket
   * Fetches the engineer's payout amount from their Connect account metadata
   * and creates a transfer to their account
   *
   * @param params - Transfer parameters
   * @returns Transfer result with Stripe transfer ID and platform profit
   * @throws Error if Connect account not found or transfer fails
   */
  createTransfer(params: CreateTransferParams): Promise<TransferResult>

  /**
   * Fetches the configured payout amount for an engineer
   * Reads from Connect account metadata
   *
   * @param connectAccountId - Engineer's Stripe Connect account ID
   * @returns Payout amount in cents (defaults to 350 = $3.50)
   */
  fetchPayoutAmount(connectAccountId: string): Promise<number>
}
