import type { EngineerAccount } from '@types'

/**
 * Service for managing engineer billing accounts
 */
export interface BillingEngineerAccountService {
  /**
   * Fetches an existing engineer account
   * @param accountId - The Stripe Connect account ID
   * @returns The engineer account details
   */
  fetch(accountId: string): Promise<EngineerAccount>

  /**
   * Creates a new Stripe Express Connect account for an engineer
   * @param engineerId - The engineer's ID
   * @param email - The engineer's email
   * @returns The created engineer account details
   */
  create(engineerId: string, email: string): Promise<EngineerAccount>
}
