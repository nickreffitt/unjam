import { type SupabaseClient } from 'supabase'
import type { BillingEngineerTransferStore } from './BillingEngineerTransferStore.ts'
import type { EngineerTransfer } from '@types'

/**
 * Supabase implementation of BillingEngineerTransferStore
 * Provides audit trail for all engineer payouts via Stripe Connect or bank_transfer
 */
export class BillingEngineerTransferStoreSupabase implements BillingEngineerTransferStore {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Creates a new engineer transfer record
   * @param transfer - The transfer data (without id and createdAt)
   * @returns The created transfer with generated ID
   */
  async create(transfer: Omit<EngineerTransfer, 'id' | 'createdAt'>): Promise<EngineerTransfer> {
    console.info(`[BillingEngineerTransferStoreSupabase] Creating transfer for ticket: ${transfer.ticketId}`)

    const { data, error } = await this.supabase
      .from('engineer_transfers')
      .insert({
        ticket_id: transfer.ticketId,
        engineer_id: transfer.engineerId,
        customer_id: transfer.customerId,
        service: transfer.service,
        batch_group_item_id: transfer.batchGroupItemId || null,
        amount: transfer.amount,
        credits_used: transfer.creditsUsed,
        credit_value: transfer.creditValue,
        platform_profit: transfer.platformProfit,
        status: transfer.status,
        error_message: transfer.errorMessage || null
      })
      .select()
      .single()

    if (error) {
      console.error(`[BillingEngineerTransferStoreSupabase] Error creating transfer:`, error)
      throw new Error(`Failed to create engineer transfer: ${error.message}`)
    }

    const createdTransfer = this.mapFromDatabase(data)
    console.info(`[BillingEngineerTransferStoreSupabase] Successfully created transfer ${createdTransfer.id}`)
    return createdTransfer
  }

  /**
   * Updates an existing engineer transfer record
   * Used primarily to update status on failure or add external transfer ID
   * @param id - The transfer ID
   * @param updates - Partial transfer data to update
   */
  async update(id: string, updates: Partial<EngineerTransfer>): Promise<void> {
    console.info(`[BillingEngineerTransferStoreSupabase] Updating transfer: ${id}`)

    const updateData: Record<string, any> = {}

    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.service !== undefined) updateData.service = updates.service
    if (updates.batchGroupItemId !== undefined) updateData.batch_group_item_id = updates.batchGroupItemId
    if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage
    if (updates.amount !== undefined) updateData.amount = updates.amount
    if (updates.creditsUsed !== undefined) updateData.credits_used = updates.creditsUsed
    if (updates.creditValue !== undefined) updateData.credit_value = updates.creditValue
    if (updates.platformProfit !== undefined) updateData.platform_profit = updates.platformProfit

    const { error } = await this.supabase
      .from('engineer_transfers')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error(`[BillingEngineerTransferStoreSupabase] Error updating transfer:`, error)
      throw new Error(`Failed to update engineer transfer: ${error.message}`)
    }

    console.info(`[BillingEngineerTransferStoreSupabase] Successfully updated transfer ${id}`)
  }

  /**
   * Fetches a transfer by ticket ID
   * @param ticketId - The ticket ID
   * @returns The transfer if found, undefined otherwise
   */
  async fetchByTicketId(ticketId: string): Promise<EngineerTransfer | undefined> {
    console.info(`[BillingEngineerTransferStoreSupabase] Fetching transfer for ticket: ${ticketId}`)

    const { data, error } = await this.supabase
      .from('engineer_transfers')
      .select('*')
      .eq('ticket_id', ticketId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        console.info(`[BillingEngineerTransferStoreSupabase] Transfer not found for ticket: ${ticketId}`)
        return undefined
      }
      console.error(`[BillingEngineerTransferStoreSupabase] Error fetching transfer:`, error)
      throw new Error(`Failed to fetch engineer transfer: ${error.message}`)
    }

    const transfer = this.mapFromDatabase(data)
    console.info(`[BillingEngineerTransferStoreSupabase] Found transfer ${transfer.id} for ticket ${ticketId}`)
    return transfer
  }

  /**
   * Fetches all transfers for an engineer
   * @param engineerId - The engineer ID
   * @returns Array of transfers
   */
  async fetchByEngineerId(engineerId: string): Promise<EngineerTransfer[]> {
    console.info(`[BillingEngineerTransferStoreSupabase] Fetching transfers for engineer: ${engineerId}`)

    const { data, error } = await this.supabase
      .from('engineer_transfers')
      .select('*')
      .eq('engineer_id', engineerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(`[BillingEngineerTransferStoreSupabase] Error fetching transfers:`, error)
      throw new Error(`Failed to fetch engineer transfers: ${error.message}`)
    }

    const transfers = data.map(row => this.mapFromDatabase(row))
    console.info(`[BillingEngineerTransferStoreSupabase] Found ${transfers.length} transfers for engineer ${engineerId}`)
    return transfers
  }

  /**
   * Fetches all transfers linked to a batch group item
   * @param itemId - The batch group item ID
   * @returns Array of transfers in the batch group item
   */
  async fetchByBatchGroupItemId(itemId: string): Promise<EngineerTransfer[]> {
    console.info(`[BillingEngineerTransferStoreSupabase] Fetching transfers for batch group item: ${itemId}`)

    const { data, error } = await this.supabase
      .from('engineer_transfers')
      .select('*')
      .eq('batch_group_item_id', itemId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(`[BillingEngineerTransferStoreSupabase] Error fetching transfers by batch group item:`, error)
      throw new Error(`Failed to fetch transfers by batch group item: ${error.message}`)
    }

    const transfers = data.map(row => this.mapFromDatabase(row))
    console.info(`[BillingEngineerTransferStoreSupabase] Found ${transfers.length} transfers for batch group item ${itemId}`)
    return transfers
  }

  /**
   * Updates multiple transfers to link them to a batch group item
   * Used when rolling up individual transfers into a batch
   * @param transferIds - Array of transfer IDs to update
   * @param itemId - The batch group item ID to link to
   */
  async updateBatchGroupItemId(transferIds: string[], itemId: string): Promise<void> {
    console.info(`[BillingEngineerTransferStoreSupabase] Updating ${transferIds.length} transfers to link to batch group item: ${itemId}`)

    const { error } = await this.supabase
      .from('engineer_transfers')
      .update({ batch_group_item_id: itemId })
      .in('id', transferIds)

    if (error) {
      console.error(`[BillingEngineerTransferStoreSupabase] Error updating transfers with batch group item:`, error)
      throw new Error(`Failed to update transfers with batch group item: ${error.message}`)
    }

    console.info(`[BillingEngineerTransferStoreSupabase] Successfully linked ${transferIds.length} transfers to batch group item ${itemId}`)
  }

  /**
   * Fetches all transfers with a specific status
   * @param status - The transfer status to filter by
   * @returns Array of transfers with the given status
   */
  async fetchByStatus(status: 'pending' | 'pending_funds' | 'completed' | 'failed'): Promise<EngineerTransfer[]> {
    console.info(`[BillingEngineerTransferStoreSupabase] Fetching transfers with status: ${status}`)

    const { data, error } = await this.supabase
      .from('engineer_transfers')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(`[BillingEngineerTransferStoreSupabase] Error fetching transfers by status:`, error)
      throw new Error(`Failed to fetch transfers by status: ${error.message}`)
    }

    const transfers = data.map(row => this.mapFromDatabase(row))
    console.info(`[BillingEngineerTransferStoreSupabase] Found ${transfers.length} transfers with status ${status}`)
    return transfers
  }

  /**
   * Fetches pending bank_transfer transfers grouped by engineer ID
   * Used for batch transfer aggregation
   * @returns Map of engineer ID to aggregated transfer data
   */
  async fetchPendingBankTransfersGroupedByEngineer(): Promise<Map<string, {
    engineerId: string;
    totalAmount: number;
    totalPlatformProfit: number;
    transferIds: string[];
  }>> {
    console.info(`[BillingEngineerTransferStoreSupabase] Fetching pending bank_transfer transfers grouped by engineer`)

    const { data, error } = await this.supabase
      .from('engineer_transfers')
      .select('id, engineer_id, amount, platform_profit')
      .eq('status', 'pending')
      .eq('service', 'bank_transfer')
      .is('batch_group_item_id', null)
      .order('engineer_id')

    if (error) {
      console.error(`[BillingEngineerTransferStoreSupabase] Error fetching pending bank_transfer transfers:`, error)
      throw new Error(`Failed to fetch pending bank_transfer transfers: ${error.message}`)
    }

    // Group transfers by engineer_id
    const groupedMap = new Map<string, {
      engineerId: string;
      totalAmount: number;
      totalPlatformProfit: number;
      transferIds: string[];
    }>()

    for (const row of data) {
      const engineerId = row.engineer_id

      if (!groupedMap.has(engineerId)) {
        groupedMap.set(engineerId, {
          engineerId,
          totalAmount: 0,
          totalPlatformProfit: 0,
          transferIds: []
        })
      }

      const group = groupedMap.get(engineerId)!
      group.totalAmount += row.amount
      group.totalPlatformProfit += row.platform_profit
      group.transferIds.push(row.id)
    }

    console.info(`[BillingEngineerTransferStoreSupabase] Found ${groupedMap.size} engineer(s) with pending bank_transfer transfers`)
    return groupedMap
  }

  /**
   * Maps database row to EngineerTransfer type
   */
  private mapFromDatabase(row: any): EngineerTransfer {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      engineerId: row.engineer_id,
      customerId: row.customer_id,
      service: row.service,
      batchGroupItemId: row.batch_group_item_id,
      amount: row.amount,
      creditsUsed: row.credits_used,
      creditValue: row.credit_value,
      platformProfit: row.platform_profit,
      status: row.status,
      errorMessage: row.error_message,
      createdAt: new Date(row.created_at)
    }
  }
}
