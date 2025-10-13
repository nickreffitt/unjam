import { type SupabaseClient } from 'supabase'
import type { TicketStore, TicketBillingInfo } from './TicketStore.ts'

/**
 * Supabase implementation of TicketStore
 * Minimal version focused on billing operations only
 */
export class TicketStoreSupabase implements TicketStore {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Fetches minimal ticket information needed for billing
   * @param ticketId - The ticket ID
   * @returns Ticket billing info if found, undefined otherwise
   */
  async fetchBillingInfo(ticketId: string): Promise<TicketBillingInfo | undefined> {
    console.info(`[TicketStoreSupabase] Fetching billing info for ticket: ${ticketId}`)

    const { data, error } = await this.supabase
      .from('tickets')
      .select('id, created_by, assigned_to, status, created_at, claimed_at, resolved_at')
      .eq('id', ticketId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        console.info(`[TicketStoreSupabase] Ticket not found: ${ticketId}`)
        return undefined
      }
      console.error(`[TicketStoreSupabase] Error fetching ticket:`, error)
      throw new Error(`Failed to fetch ticket: ${error.message}`)
    }

    const ticketInfo: TicketBillingInfo = {
      id: data.id,
      customerId: data.created_by,
      engineerId: data.assigned_to,
      status: data.status,
      createdAt: new Date(data.created_at),
      claimedAt: data.claimed_at ? new Date(data.claimed_at) : null,
      resolvedAt: data.resolved_at ? new Date(data.resolved_at) : null
    }

    console.info(`[TicketStoreSupabase] Found ticket ${ticketId} for customer ${ticketInfo.customerId}`)
    return ticketInfo
  }
}
