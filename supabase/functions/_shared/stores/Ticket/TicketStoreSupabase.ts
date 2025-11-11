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
      .select('id, created_by, assigned_to, status, created_at, claimed_at, resolved_at, marked_as_fixed_at')
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
      resolvedAt: data.resolved_at ? new Date(data.resolved_at) : null,
      markAsFixedAt: data.marked_as_fixed_at ? new Date(data.marked_as_fixed_at) : null
    }

    console.info(`[TicketStoreSupabase] Found ticket ${ticketId} for customer ${ticketInfo.customerId}`)
    return ticketInfo
  }

  /**
   * Updates the status of a ticket
   * @param ticketId - The ticket ID
   * @param status - The new status
   * @returns Updated ticket billing info if found, undefined otherwise
   */
  async updateStatus(ticketId: string, status: string): Promise<TicketBillingInfo | undefined> {
    console.info(`[TicketStoreSupabase] Updating ticket ${ticketId} status to: ${status}`)

    const { data, error } = await this.supabase
      .from('tickets')
      .update({ status })
      .eq('id', ticketId)
      .select('id, created_by, assigned_to, status, created_at, claimed_at, resolved_at, marked_as_fixed_at')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        console.info(`[TicketStoreSupabase] Ticket not found: ${ticketId}`)
        return undefined
      }
      console.error(`[TicketStoreSupabase] Error updating ticket status:`, error)
      throw new Error(`Failed to update ticket status: ${error.message}`)
    }

    const ticketInfo: TicketBillingInfo = {
      id: data.id,
      customerId: data.created_by,
      engineerId: data.assigned_to,
      status: data.status,
      createdAt: new Date(data.created_at),
      claimedAt: data.claimed_at ? new Date(data.claimed_at) : null,
      resolvedAt: data.resolved_at ? new Date(data.resolved_at) : null,
      markAsFixedAt: data.marked_as_fixed_at ? new Date(data.marked_as_fixed_at) : null
    }

    console.info(`[TicketStoreSupabase] Updated ticket ${ticketId} status successfully to ${data.status}`)
    return ticketInfo
  }

  /**
   * Fetches tickets by customer ID and statuses
   * @param customerId - The customer profile ID
   * @param statuses - Array of ticket statuses to filter by
   * @returns Array of ticket billing info
   */
  async fetchByCustomerAndStatuses(customerId: string, statuses: string[]): Promise<TicketBillingInfo[]> {
    console.info(`[TicketStoreSupabase] Fetching tickets for customer ${customerId} with statuses: ${statuses.join(', ')}`)

    const { data, error } = await this.supabase
      .from('tickets')
      .select('id, created_by, assigned_to, status, created_at, claimed_at, resolved_at, marked_as_fixed_at')
      .eq('created_by', customerId)
      .in('status', statuses)

    if (error) {
      console.error(`[TicketStoreSupabase] Error fetching tickets:`, error)
      throw new Error(`Failed to fetch tickets: ${error.message}`)
    }

    const tickets: TicketBillingInfo[] = data.map(ticket => ({
      id: ticket.id,
      customerId: ticket.created_by,
      engineerId: ticket.assigned_to,
      status: ticket.status,
      createdAt: new Date(ticket.created_at),
      claimedAt: ticket.claimed_at ? new Date(ticket.claimed_at) : null,
      resolvedAt: ticket.resolved_at ? new Date(ticket.resolved_at) : null,
      markAsFixedAt: ticket.marked_as_fixed_at ? new Date(ticket.marked_as_fixed_at) : null
    }))

    console.info(`[TicketStoreSupabase] Found ${tickets.length} tickets`)
    return tickets
  }
}
