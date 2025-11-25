import type { BankTransferBatchGroupItem } from '@types'

/**
 * Interface for billing batch group item persistence
 * Tracks individual items added to batch transfers, one per engineer
 */
export interface BillingBatchGroupItemStore {
  /**
   * Creates a new billing batch group item record
   * @param item - The batch group item data
   * @returns The created batch group item with generated ID
   */
  create(item: Omit<BankTransferBatchGroupItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<BankTransferBatchGroupItem>

  /**
   * Fetches all batch group items for a given batch group
   * @param batchGroupId - The batch group ID
   * @returns Array of batch group items
   */
  fetchByBatchGroupId(batchGroupId: string): Promise<BankTransferBatchGroupItem[]>

  /**
   * Fetches a batch group item by its external batch item ID
   * @param externalBatchItemId - The external batch item ID
   * @returns The batch group item if found, undefined otherwise
   */
  fetchByExternalBatchItemId(externalBatchItemId: string): Promise<BankTransferBatchGroupItem | undefined>

  /**
   * Updates an existing batch group item record
   * @param id - The batch group item ID
   * @param updates - Partial batch group item data to update
   */
  update(id: string, updates: Partial<BankTransferBatchGroupItem>): Promise<void>
}
