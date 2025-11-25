import type { BankTransferRecipient } from '@common/types';

/**
 * Interface for billing bank transfer account storage implementations
 * Defines the contract for engineer bank transfer recipient account CRUD operations
 */
export interface BillingBankTransferAccountStore {
  /**
   * Gets an engineer's bank transfer recipient account by their profile ID
   * @param profileId - The engineer's profile ID
   * @returns The engineer's bank transfer recipient if found, null otherwise
   */
  getByProfileId(profileId: string): Promise<BankTransferRecipient | null>;

  /**
   * Creates a new bank transfer recipient account for an engineer
   * @param profileId - The engineer's profile ID
   * @param beneficiary - The beneficiary account information
   * @returns Promise that resolves when creation is complete
   * @throws Error if creation fails
   */
  create(profileId: string, beneficiary: BankTransferRecipient): Promise<void>;
}
