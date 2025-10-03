import type { EngineerAccount } from '@types'

/**
 * Interface for billing engineer account persistence
 */
export interface BillingEngineerStore {
  /**
   * Creates a new billing engineer account record
   * @param account - The engineer account data from the billing provider
   * @returns The created engineer account
   */
  create(account: EngineerAccount): Promise<EngineerAccount>

  /**
   * Updates an existing billing engineer account record
   * @param account - The updated engineer account data
   */
  update(account: EngineerAccount): Promise<void>

  /**
   * Deletes a billing engineer account record
   * @param accountId - The billing provider's account ID
   */
  delete(accountId: string): Promise<void>

  /**
   * Fetches a billing engineer account by their billing provider ID
   * @param accountId - The billing provider's account ID
   * @returns The engineer account if found, undefined otherwise
   */
  fetch(accountId: string): Promise<EngineerAccount | undefined>

  /**
   * Fetches a billing engineer account by their profile ID
   * @param profileId - The engineer profile ID
   * @returns The engineer account if found, undefined otherwise
   */
  getByProfileId(profileId: string): Promise<EngineerAccount | undefined>
}
