/**
 * Balance information from billing provider
 */
export interface BalanceInfo {
  available: number; // Available balance in cents (can be transferred immediately)
  pending: number;   // Pending balance in cents (waiting to clear)
  currency: string;  // Currency code (e.g., 'usd')
}

/**
 * Interface for checking billing provider balance
 * Used to verify sufficient funds before creating transfers
 */
export interface BillingBalanceService {
  /**
   * Gets the current balance from the billing provider
   *
   * @returns Balance information with available and pending amounts
   * @throws Error if balance check fails
   */
  getBalance(): Promise<BalanceInfo>

  /**
   * Checks if sufficient funds are available for a transfer
   *
   * @param amount - Amount in cents to check
   * @returns true if sufficient available balance exists
   * @throws Error if balance check fails
   */
  hasAvailableBalance(amount: number): Promise<boolean>
}
