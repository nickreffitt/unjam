import type { EngineerAccount } from '@common/types';

/**
 * Interface for billing account storage implementations
 * Defines the contract for engineer billing account CRUD operations
 */
export interface BillingAccountStore {
  /**
   * Gets an engineer's billing account by their profile ID
   * @param profileId - The engineer's profile ID
   * @returns The engineer's billing account if found, null otherwise
   */
  getByProfileId(profileId: string): Promise<EngineerAccount | null>;
}
