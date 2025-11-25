import { type SupabaseClient } from 'supabase'
import type { BillingBatchGroupItemStore } from './BillingBatchGroupItemStore.ts'
import type { BankTransferBatchGroupItem } from '@types'

/**
 * Supabase implementation of BillingBatchGroupItemStore
 * Tracks individual items added to Airwallex batch transfers
 */
export class BillingBatchGroupItemStoreSupabase implements BillingBatchGroupItemStore {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Creates a new billing batch group item record
   * @param item - The batch group item data (without id, createdAt, updatedAt)
   * @returns The created batch group item with generated ID
   */
  async create(item: Omit<BankTransferBatchGroupItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<BankTransferBatchGroupItem> {
    console.info(`[BillingBatchGroupItemStoreSupabase] Creating batch group item for engineer: ${item.engineerId}`)

    const { data, error } = await this.supabase
      .from('billing_batch_group_items')
      .insert({
        batch_group_id: item.batchGroupId,
        external_batch_item_id: item.externalId,
        engineer_id: item.engineerId,
        beneficiary_id: item.externalEngineerId,
        total_amount: item.totalAmount,
        total_platform_profit: item.totalPlatformProfit,
        status: item.status
      })
      .select()
      .single()

    if (error) {
      console.error(`[BillingBatchGroupItemStoreSupabase] Error creating batch group item:`, error)
      throw new Error(`Failed to create batch group item: ${error.message}`)
    }

    const createdItem = this.mapFromDatabase(data)
    console.info(`[BillingBatchGroupItemStoreSupabase] Successfully created batch group item ${createdItem.id}`)
    return createdItem
  }

  /**
   * Fetches all batch group items for a given batch group
   * @param batchGroupId - The batch group ID
   * @returns Array of batch group items
   */
  async fetchByBatchGroupId(batchGroupId: string): Promise<BankTransferBatchGroupItem[]> {
    console.info(`[BillingBatchGroupItemStoreSupabase] Fetching items for batch group: ${batchGroupId}`)

    const { data, error } = await this.supabase
      .from('billing_batch_group_items')
      .select('*')
      .eq('batch_group_id', batchGroupId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(`[BillingBatchGroupItemStoreSupabase] Error fetching batch group items:`, error)
      throw new Error(`Failed to fetch batch group items: ${error.message}`)
    }

    const items = data.map(row => this.mapFromDatabase(row))
    console.info(`[BillingBatchGroupItemStoreSupabase] Found ${items.length} items for batch group ${batchGroupId}`)
    return items
  }

  /**
   * Fetches a batch group item by its external batch item ID
   * @param externalBatchItemId - The Airwallex batch item ID
   * @returns The batch group item if found, undefined otherwise
   */
  async fetchByExternalBatchItemId(externalBatchItemId: string): Promise<BankTransferBatchGroupItem | undefined> {
    console.info(`[BillingBatchGroupItemStoreSupabase] Fetching item by external ID: ${externalBatchItemId}`)

    const { data, error } = await this.supabase
      .from('billing_batch_group_items')
      .select('*')
      .eq('external_batch_item_id', externalBatchItemId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.info(`[BillingBatchGroupItemStoreSupabase] Item not found for external ID: ${externalBatchItemId}`)
        return undefined
      }
      console.error(`[BillingBatchGroupItemStoreSupabase] Error fetching batch group item:`, error)
      throw new Error(`Failed to fetch batch group item: ${error.message}`)
    }

    const item = this.mapFromDatabase(data)
    console.info(`[BillingBatchGroupItemStoreSupabase] Found item ${item.id}`)
    return item
  }

  /**
   * Updates an existing batch group item record
   * @param id - The batch group item ID
   * @param updates - Partial batch group item data to update
   */
  async update(id: string, updates: Partial<BankTransferBatchGroupItem>): Promise<void> {
    console.info(`[BillingBatchGroupItemStoreSupabase] Updating batch group item: ${id}`)

    const updateData: Record<string, any> = {}

    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.externalId !== undefined) updateData.external_batch_item_id = updates.externalId
    if (updates.totalAmount !== undefined) updateData.total_amount = updates.totalAmount
    if (updates.totalPlatformProfit !== undefined) updateData.total_platform_profit = updates.totalPlatformProfit

    const { error } = await this.supabase
      .from('billing_batch_group_items')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error(`[BillingBatchGroupItemStoreSupabase] Error updating batch group item:`, error)
      throw new Error(`Failed to update batch group item: ${error.message}`)
    }

    console.info(`[BillingBatchGroupItemStoreSupabase] Successfully updated batch group item ${id}`)
  }

  /**
   * Maps database row to BankTransferBatchGroupItem type
   */
  private mapFromDatabase(row: any): BankTransferBatchGroupItem {
    return {
      id: row.id,
      externalId: row.external_batch_item_id,
      engineerId: row.engineer_id,
      batchGroupId: row.batch_group_id,
      externalEngineerId: row.beneficiary_id,
      totalAmount: row.total_amount,
      totalPlatformProfit: row.total_platform_profit,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }
}
