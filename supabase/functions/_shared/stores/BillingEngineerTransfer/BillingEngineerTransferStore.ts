import type { EngineerTransfer } from '@types'

/**
 * Interface for engineer transfer (payout) persistence
 * Provides audit trail for all transfers from platform to engineer Connect accounts
 */
export interface BillingEngineerTransferStore {
  /**
   * Creates a new engineer transfer record
   * @param transfer - The transfer data
   * @returns The created transfer with generated ID
   */
  create(transfer: Omit<EngineerTransfer, 'id' | 'createdAt'>): Promise<EngineerTransfer>

  /**
   * Updates an existing engineer transfer record
   * Used primarily to update status on failure
   * @param id - The transfer ID
   * @param updates - Partial transfer data to update
   */
  update(id: string, updates: Partial<EngineerTransfer>): Promise<void>

  /**
   * Fetches a transfer by ticket ID
   * @param ticketId - The ticket ID
   * @returns The transfer if found, undefined otherwise
   */
  fetchByTicketId(ticketId: string): Promise<EngineerTransfer | undefined>

  /**
   * Fetches all transfers for an engineer
   * @param engineerId - The engineer ID
   * @returns Array of transfers
   */
  fetchByEngineerId(engineerId: string): Promise<EngineerTransfer[]>

  /**
   * Fetches all transfers linked to a batch group item
   * @param itemId - The batch group item ID
   * @returns Array of transfers in the batch group item
   */
  fetchByBatchGroupItemId(itemId: string): Promise<EngineerTransfer[]>

  /**
   * Updates multiple transfers to link them to a batch group item
   * Used when rolling up individual transfers into a batch
   * @param transferIds - Array of transfer IDs to update
   * @param itemId - The batch group item ID to link to
   */
  updateBatchGroupItemId(transferIds: string[], itemId: string): Promise<void>

  /**
   * Fetches all transfers with a specific status
   * @param status - The transfer status to filter by
   * @returns Array of transfers with the given status
   */
  fetchByStatus(status: 'pending' | 'pending_funds' | 'completed' | 'failed'): Promise<EngineerTransfer[]>

  /**
   * Fetches pending bank transfers grouped by engineer ID
   * Used for batch transfer aggregation
   * @returns Map of engineer ID to aggregated transfer data
   */
  fetchPendingBankTransfersGroupedByEngineer(): Promise<Map<string, {
    engineerId: string;
    totalAmount: number;
    totalPlatformProfit: number;
    transferIds: string[];
  }>>
}
