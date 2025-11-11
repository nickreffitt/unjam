import { type SupabaseClient } from 'supabase'
import type { BillingEngineerTransferStore } from './BillingEngineerTransferStore.ts'
import type { EngineerTransfer } from '@types'

/**
 * Supabase implementation of BillingEngineerTransferStore
 * Provides audit trail for all engineer payouts via Stripe Connect
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
        stripe_transfer_id: transfer.stripeTransferId,
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
   * Used primarily to update status on failure or add Stripe transfer ID
   * @param id - The transfer ID
   * @param updates - Partial transfer data to update
   */
  async update(id: string, updates: Partial<EngineerTransfer>): Promise<void> {
    console.info(`[BillingEngineerTransferStoreSupabase] Updating transfer: ${id}`)

    const updateData: Record<string, any> = {}

    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.stripeTransferId !== undefined) updateData.stripe_transfer_id = updates.stripeTransferId
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
   * Fetches a transfer by Stripe transfer ID
   * @param stripeTransferId - The Stripe transfer ID
   * @returns The transfer if found, undefined otherwise
   */
  async fetchByStripeTransferId(stripeTransferId: string): Promise<EngineerTransfer | undefined> {
    console.info(`[BillingEngineerTransferStoreSupabase] Fetching transfer by Stripe ID: ${stripeTransferId}`)

    const { data, error } = await this.supabase
      .from('engineer_transfers')
      .select('*')
      .eq('stripe_transfer_id', stripeTransferId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        console.info(`[BillingEngineerTransferStoreSupabase] Transfer not found for Stripe ID: ${stripeTransferId}`)
        return undefined
      }
      console.error(`[BillingEngineerTransferStoreSupabase] Error fetching transfer:`, error)
      throw new Error(`Failed to fetch engineer transfer: ${error.message}`)
    }

    const transfer = this.mapFromDatabase(data)
    console.info(`[BillingEngineerTransferStoreSupabase] Found transfer ${transfer.id}`)
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
   * Maps database row to EngineerTransfer type
   */
  private mapFromDatabase(row: any): EngineerTransfer {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      engineerId: row.engineer_id,
      customerId: row.customer_id,
      stripeTransferId: row.stripe_transfer_id,
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
