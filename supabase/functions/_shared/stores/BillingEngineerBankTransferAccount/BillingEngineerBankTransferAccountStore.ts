import type { BankTransferRecipient } from '@types'

/**
 * Interface for billing engineer bank transfer account persistence
 */
export interface BillingEngineerBankTransferAccountStore {
  /**
   * Creates a new billing engineer bank transfer account record
   * @param profileId - The engineer profile ID
   * @param recipient - The bank transfer recipient data
   * @returns The created bank transfer recipient
   */
  create(profileId: string, recipient: BankTransferRecipient): Promise<BankTransferRecipient>
  
  /**
   * Deletes a billing engineer bank transfer account record
   * @param externalId - The external recipient ID
   */
  delete(externalId: string): Promise<void>

  /**
   * Fetches a billing engineer bank transfer account by their profile ID
   * @param profileId - The engineer profile ID
   * @returns The bank transfer recipient if found, undefined otherwise
   */
  getByProfileId(profileId: string): Promise<BankTransferRecipient | undefined>
}
