import type { BankTransferBatchGroupDetails, BankTransferBatchGroupStatus } from '@types'

/**
 * Interface for billing batch group persistence
 * Tracks batch transfer groups for aggregating engineer payouts
 */
export interface BillingBatchGroupStore {
  /**
   * Creates a new billing batch group record
   * @param batchGroup - The batch group data
   * @returns The created batch group with generated ID
   */
  create(batchGroup: Omit<BankTransferBatchGroupDetails, 'id' | 'createdAt' | 'updatedAt'>): Promise<BankTransferBatchGroupDetails>

  /**
   * Fetches a batch group by its internal ID
   * @param id - The internal batch group ID
   * @returns The batch group if found, undefined otherwise
   */
  fetchById(id: string): Promise<BankTransferBatchGroupDetails | undefined>

  /**
   * Fetches a batch group by its external batch group ID
   * @param externalBatchGroupId - The external API batch group ID
   * @returns The batch group if found, undefined otherwise
   */
  fetchByExternalBatchGroupId(externalBatchGroupId: string): Promise<BankTransferBatchGroupDetails | undefined>

  /**
   * Fetches all batch groups with a given status
   * @param status - The batch group status to filter by
   * @returns Array of batch groups with the given status
   */
  fetchByStatus(status: BankTransferBatchGroupStatus): Promise<BankTransferBatchGroupDetails[]>

  /**
   * Updates an existing batch group record
   * @param id - The batch group ID
   * @param updates - Partial batch group data to update
   */
  update(id: string, updates: Partial<BankTransferBatchGroupDetails>): Promise<void>
}
