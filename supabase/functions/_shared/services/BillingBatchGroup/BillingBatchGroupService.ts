import type { BatchTransferResponse } from '@types'

export type { BatchTransferResponse }

/**
 * Service interface for batch group operations
 * Handles batch transfer group management via external API
 */
export interface BillingBatchGroupService {
  /**
   * Creates a new batch group via external API
   * @returns The API response with batch transfer details
   */
  createBatchGroup(): Promise<BatchTransferResponse>

  /**
   * Gets batch group details from external API
   * @param externalBatchGroupId - The external batch transfer ID
   * @returns The API response with batch transfer details
   */
  getBatchGroup(externalBatchGroupId: string): Promise<BatchTransferResponse>

  /**
   * Submits a batch group for processing via external API
   * This marks the batch as ready for funding and payout
   * @param externalBatchGroupId - The external batch transfer ID
   * @returns The API response with updated batch transfer details
   */
  submitBatchGroup(externalBatchGroupId: string): Promise<BatchTransferResponse>
}
