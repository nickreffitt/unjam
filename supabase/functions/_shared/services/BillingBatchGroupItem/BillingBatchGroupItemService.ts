import type { AddBatchItemRequest, BatchTransferResponse, BatchTransferItemsResponse } from '@types'

export type { AddBatchItemRequest }

/**
 * Service interface for billing batch group item operations
 * Handles adding items to batch transfers
 */
export interface BillingBatchGroupItemService {
  /**
   * Adds items to a batch transfer
   * @param batchId - The batch transfer ID
   * @param items - Array of items to add to the batch
   * @returns The updated batch transfer response
   */
  addItemsToBatch(batchId: string, items: AddBatchItemRequest[]): Promise<BatchTransferResponse>

  /**
   * Gets all items in a batch transfer
   * @param batchId - The batch transfer ID
   * @returns The batch transfer items response with individual item IDs
   */
  getBatchItems(batchId: string): Promise<BatchTransferItemsResponse>
}
