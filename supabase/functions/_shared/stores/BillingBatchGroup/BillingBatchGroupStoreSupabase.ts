import { type SupabaseClient } from 'supabase'
import type { BillingBatchGroupStore } from './BillingBatchGroupStore.ts'
import type { BankTransferBatchGroupDetails, BankTransferBatchGroupStatus } from '@types'

/**
 * Supabase implementation of BillingBatchGroupStore
 * Tracks batch transfer groups for aggregating engineer payouts
 */
export class BillingBatchGroupStoreSupabase implements BillingBatchGroupStore {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Creates a new billing batch group record
   * @param batchGroup - The batch group data (without id, createdAt, updatedAt)
   * @returns The created batch group with generated ID
   */
  async create(batchGroup: Omit<BankTransferBatchGroupDetails, 'id' | 'createdAt' | 'updatedAt'>): Promise<BankTransferBatchGroupDetails> {
    console.info(`[BillingBatchGroupStoreSupabase] Creating batch group: ${batchGroup.name}`)

    const { data, error } = await this.supabase
      .from('billing_batch_groups')
      .insert({
        external_batch_group_id: batchGroup.externalBatchGroupId,
        name: batchGroup.name,
        version: batchGroup.version,
        status: batchGroup.status,
        transfers: batchGroup.transfers,
        completed_at: batchGroup.completedAt,
        cancelled_at: batchGroup.cancelledAt
      })
      .select()
      .single()

    if (error) {
      console.error(`[BillingBatchGroupStoreSupabase] Error creating batch group:`, error)
      throw new Error(`Failed to create batch group: ${error.message}`)
    }

    const createdBatchGroup = this.mapFromDatabase(data)
    console.info(`[BillingBatchGroupStoreSupabase] Successfully created batch group ${createdBatchGroup.id}`)
    return createdBatchGroup
  }

  /**
   * Fetches a batch group by its internal ID
   * @param id - The internal batch group ID
   * @returns The batch group if found, undefined otherwise
   */
  async fetchById(id: string): Promise<BankTransferBatchGroupDetails | undefined> {
    console.info(`[BillingBatchGroupStoreSupabase] Fetching batch group by ID: ${id}`)

    const { data, error } = await this.supabase
      .from('billing_batch_groups')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.info(`[BillingBatchGroupStoreSupabase] Batch group not found for ID: ${id}`)
        return undefined
      }
      console.error(`[BillingBatchGroupStoreSupabase] Error fetching batch group:`, error)
      throw new Error(`Failed to fetch batch group: ${error.message}`)
    }

    const batchGroup = this.mapFromDatabase(data)
    console.info(`[BillingBatchGroupStoreSupabase] Found batch group ${batchGroup.id}`)
    return batchGroup
  }

  /**
   * Fetches a batch group by its external batch group ID
   * @param externalBatchGroupId - The external API batch group ID
   * @returns The batch group if found, undefined otherwise
   */
  async fetchByExternalBatchGroupId(externalBatchGroupId: string): Promise<BankTransferBatchGroupDetails | undefined> {
    console.info(`[BillingBatchGroupStoreSupabase] Fetching batch group by external ID: ${externalBatchGroupId}`)

    const { data, error } = await this.supabase
      .from('billing_batch_groups')
      .select('*')
      .eq('external_batch_group_id', externalBatchGroupId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.info(`[BillingBatchGroupStoreSupabase] Batch group not found for external ID: ${externalBatchGroupId}`)
        return undefined
      }
      console.error(`[BillingBatchGroupStoreSupabase] Error fetching batch group:`, error)
      throw new Error(`Failed to fetch batch group: ${error.message}`)
    }

    const batchGroup = this.mapFromDatabase(data)
    console.info(`[BillingBatchGroupStoreSupabase] Found batch group ${batchGroup.id}`)
    return batchGroup
  }

  /**
   * Fetches all batch groups with a given status
   * @param status - The batch group status to filter by
   * @returns Array of batch groups with the given status
   */
  async fetchByStatus(status: BankTransferBatchGroupStatus): Promise<BankTransferBatchGroupDetails[]> {
    console.info(`[BillingBatchGroupStoreSupabase] Fetching batch groups by status: ${status}`)

    const { data, error } = await this.supabase
      .from('billing_batch_groups')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(`[BillingBatchGroupStoreSupabase] Error fetching batch groups:`, error)
      throw new Error(`Failed to fetch batch groups: ${error.message}`)
    }

    const batchGroups = data.map(row => this.mapFromDatabase(row))
    console.info(`[BillingBatchGroupStoreSupabase] Found ${batchGroups.length} batch groups with status ${status}`)
    return batchGroups
  }

  /**
   * Updates an existing batch group record
   * @param id - The batch group ID
   * @param updates - Partial batch group data to update
   */
  async update(id: string, updates: Partial<BankTransferBatchGroupDetails>): Promise<void> {
    console.info(`[BillingBatchGroupStoreSupabase] Updating batch group: ${id}`)

    const updateData: Record<string, any> = {}

    if (updates.externalBatchGroupId !== undefined) updateData.external_batch_group_id = updates.externalBatchGroupId
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.version !== undefined) updateData.version = updates.version
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.transfers !== undefined) updateData.transfers = updates.transfers
    if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt
    if (updates.cancelledAt !== undefined) updateData.cancelled_at = updates.cancelledAt

    const { error } = await this.supabase
      .from('billing_batch_groups')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error(`[BillingBatchGroupStoreSupabase] Error updating batch group:`, error)
      throw new Error(`Failed to update batch group: ${error.message}`)
    }

    console.info(`[BillingBatchGroupStoreSupabase] Successfully updated batch group ${id}`)
  }

  /**
   * Maps database row to BankTransferBatchGroupDetails type
   */
  private mapFromDatabase(row: any): BankTransferBatchGroupDetails {
    return {
      id: row.id,
      externalBatchGroupId: row.external_batch_group_id,
      name: row.name,
      version: row.version,
      status: row.status,
      transfers: row.transfers || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null
    }
  }
}
