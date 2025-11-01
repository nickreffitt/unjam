import { type SupabaseClient } from '@supabase/supabase-js';
import { type Ticket, type TicketStatus, type EngineerProfile } from '@common/types';
import { type TicketStore } from './TicketStore';
import { type TicketEventEmitter } from '../events/TicketEventEmitter';
import { TicketSupabaseRowMapper } from '../util/TicketSupabaseRowMapper';

/**
 * Supabase implementation of the ticket store
 * Uses Supabase PostgreSQL database for persistence with row-level security
 * Emits events for create and update operations for local same-tab event handling
 */
export class TicketStoreSupabase implements TicketStore {
  private supabaseClient: SupabaseClient;
  private eventEmitter: TicketEventEmitter;
  private readonly tableName: string = 'tickets';

  constructor(supabaseClient: SupabaseClient, eventEmitter: TicketEventEmitter) {
    if (!supabaseClient) {
      throw new Error('TicketStoreSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('TicketStoreSupabase: eventEmitter is required');
    }
    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
    console.debug('TicketStoreSupabase: Initialized');
  }

  /**
   * Creates a new ticket
   * @param ticket - The ticket to create
   * @returns The created ticket with any modifications (like generated ID)
   */
  async create(ticket: Ticket): Promise<Ticket> {
    // Validate required fields
    if (!ticket.summary) {
      throw new Error('summary is required for ticket creation');
    }
    if (!ticket.problemDescription) {
      throw new Error('problemDescription is required for ticket creation');
    }
    if (!ticket.createdBy?.id) {
      throw new Error('createdBy profile ID is required for ticket creation');
    }

    console.debug('TicketStoreSupabase: Creating ticket');

    const ticketRow = TicketSupabaseRowMapper.mapTicketToRow(ticket);

    // Omit the ID field to let the database generate its own UUID
    const { id, ...ticketRowWithoutId } = ticketRow;

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .insert([ticketRowWithoutId])
      .select(`
        *,
        created_by:profiles!tickets_created_by_fkey(*),
        assigned_to:profiles!tickets_assigned_to_fkey(*)
      `)
      .single();

    if (error) {
      console.error('TicketStoreSupabase: Create failed:', error);
      throw new Error(`Failed to create ticket: ${error.message}`);
    }

    const createdTicket = TicketSupabaseRowMapper.mapRowToTicket(data);
    console.debug('TicketStoreSupabase: Created ticket successfully:', createdTicket.id);

    // Emit event for ticket creation (for same-tab listeners)
    this.eventEmitter.emitTicketCreated(createdTicket);

    return createdTicket;
  }

  /**
   * Gets all tickets by status with pagination
   * @param ticketStatuses - The status(es) to filter by (single status or array)
   * @param size - Number of tickets to return (page size)
   * @param offset - Number of tickets to skip (for pagination)
   * @returns Array of tickets matching the status(es)
   */
  async getAllByStatus(
    ticketStatuses: TicketStatus | TicketStatus[],
    size: number,
    offset: number = 0
  ): Promise<Ticket[]> {
    const statuses = Array.isArray(ticketStatuses) ? ticketStatuses : [ticketStatuses];
    console.debug(`TicketStoreSupabase: Getting tickets by status (${statuses.join(', ')}), size: ${size}, offset: ${offset}`);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        created_by:profiles!tickets_created_by_fkey(*),
        assigned_to:profiles!tickets_assigned_to_fkey(*)
      `)
      .in('status', statuses)
      .range(offset, offset + size - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('TicketStoreSupabase: Get all by status failed:', error);
      throw new Error(`Failed to get tickets by status: ${error.message}`);
    }

    const tickets = data.map(row => TicketSupabaseRowMapper.mapRowToTicket(row));
    console.debug(`TicketStoreSupabase: Retrieved ${tickets.length} tickets`);
    return tickets;
  }

  /**
   * Gets a single ticket by ID
   * @param ticketId - The ID of the ticket to retrieve
   * @returns The ticket if found, null otherwise
   */
  async get(ticketId: string): Promise<Ticket | null> {
    console.debug('TicketStoreSupabase: Getting ticket by ID:', ticketId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        created_by:profiles!tickets_created_by_fkey(*),
        assigned_to:profiles!tickets_assigned_to_fkey(*)
      `)
      .eq('id', ticketId)
      .maybeSingle();

    if (error) {
      console.error('TicketStoreSupabase: Get by ID failed:', error);
      throw new Error(`Failed to get ticket by ID: ${error.message}`);
    }

    return data ? TicketSupabaseRowMapper.mapRowToTicket(data) : null;
  }

  /**
   * Updates an existing ticket
   * @param ticketId - The ID of the ticket to update
   * @param updatedTicket - The updated ticket data
   * @returns The updated ticket
   * @throws Error if ticket is not found
   */
  async update(ticketId: string, updatedTicket: Ticket): Promise<Ticket> {
    console.debug('TicketStoreSupabase: Updating ticket:', ticketId);

    const ticketRow = TicketSupabaseRowMapper.mapTicketToRow(updatedTicket);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .update(ticketRow)
      .eq('id', ticketId)
      .select(`
        *,
        created_by:profiles!tickets_created_by_fkey(*),
        assigned_to:profiles!tickets_assigned_to_fkey(*)
      `)
      .single();

    if (error) {
      console.error('TicketStoreSupabase: Update failed:', error);
      if (error.code === 'PGRST116') {
        throw new Error(`Ticket with ID ${ticketId} not found`);
      }
      throw new Error(`Failed to update ticket: ${error.message}`);
    }

    const ticket = TicketSupabaseRowMapper.mapRowToTicket(data);
    console.debug('TicketStoreSupabase: Updated ticket successfully:', ticketId);

    // Emit event for ticket update (for same-tab listeners)
    this.eventEmitter.emitTicketUpdated(ticket);

    return ticket;
  }

  /**
   * Gets tickets assigned to a specific engineer with specific status(es)
   * This method provides efficient filtering at the data layer
   * @param engineerProfile - The engineer to filter by
   * @param ticketStatuses - The status(es) to filter by (single status or array)
   * @param size - Number of tickets to return (page size)
   * @param offset - Number of tickets to skip (for pagination)
   * @returns Array of tickets assigned to the engineer with the specified status(es)
   */
  async getAllEngineerTicketsByStatus(
    engineerProfile: EngineerProfile,
    ticketStatuses: TicketStatus | TicketStatus[],
    size: number,
    offset: number = 0
  ): Promise<Ticket[]> {
    const statuses = Array.isArray(ticketStatuses) ? ticketStatuses : [ticketStatuses];
    console.debug(`TicketStoreSupabase: Getting engineer ${engineerProfile.id} tickets by status (${statuses.join(', ')}), size: ${size}, offset: ${offset}`);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        created_by:profiles!tickets_created_by_fkey(*),
        assigned_to:profiles!tickets_assigned_to_fkey(*)
      `)
      .eq('assigned_to', engineerProfile.id)
      .in('status', statuses)
      .range(offset, offset + size - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('TicketStoreSupabase: Get engineer tickets by status failed:', error);
      throw new Error(`Failed to get engineer tickets by status: ${error.message}`);
    }

    const tickets = data.map(row => TicketSupabaseRowMapper.mapRowToTicket(row));
    console.debug(`TicketStoreSupabase: Retrieved ${tickets.length} engineer tickets`);
    return tickets;
  }

  /**
   * Gets the total count of tickets with a specific status
   * Useful for pagination to know total pages
   * @param ticketStatus - The status to count
   * @returns Number of tickets with that status
   */
  async getCountByStatus(ticketStatus: TicketStatus): Promise<number> {
    console.debug(`TicketStoreSupabase: Getting count of ${ticketStatus} tickets`);

    const { count, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('status', ticketStatus);

    if (error) {
      console.error('TicketStoreSupabase: Get count by status failed:', error);
      throw new Error(`Failed to get count by status: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Gets the active ticket for a specific customer
   * An active ticket is one that is not completed or auto-completed
   * @param customerId - The ID of the customer to find an active ticket for
   * @returns The active ticket if found, null otherwise
   */
  async getActiveTicketByCustomer(customerId: string): Promise<Ticket | null> {
    console.debug('TicketStoreSupabase: Getting active ticket for customer:', customerId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        created_by:profiles!tickets_created_by_fkey(*),
        assigned_to:profiles!tickets_assigned_to_fkey(*)
      `)
      .eq('created_by', customerId)
      .not('status', 'in', '(completed,auto-completed)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('TicketStoreSupabase: Get active ticket by customer failed:', error);
      throw new Error(`Failed to get active ticket by customer: ${error.message}`);
    }

    return data ? TicketSupabaseRowMapper.mapRowToTicket(data) : null;
  }

  /**
   * Gets paginated tickets created by a specific customer
   * Returns completed and auto-completed tickets only
   * @param customerId - The ID of the customer
   * @param size - Number of tickets to return (page size)
   * @param offset - Number of tickets to skip (for pagination)
   * @returns Array of tickets created by the customer
   */
  async getCustomerTickets(customerId: string, size: number, offset: number = 0): Promise<Ticket[]> {
    console.debug(`TicketStoreSupabase: Getting tickets for customer ${customerId}, size: ${size}, offset: ${offset}`);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        created_by:profiles!tickets_created_by_fkey(*),
        assigned_to:profiles!tickets_assigned_to_fkey(*)
      `)
      .eq('created_by', customerId)
      .in('status', ['completed', 'auto-completed'])
      .range(offset, offset + size - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('TicketStoreSupabase: Get customer tickets failed:', error);
      throw new Error(`Failed to get customer tickets: ${error.message}`);
    }

    const tickets = data.map(row => TicketSupabaseRowMapper.mapRowToTicket(row));
    console.debug(`TicketStoreSupabase: Retrieved ${tickets.length} tickets for customer`);
    return tickets;
  }

  /**
   * Gets all tickets (mainly for testing purposes)
   * @returns All tickets in the store
   */
  async getAll(): Promise<Ticket[]> {
    console.debug('TicketStoreSupabase: Getting all tickets');

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        created_by:profiles!tickets_created_by_fkey(*),
        assigned_to:profiles!tickets_assigned_to_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('TicketStoreSupabase: Get all failed:', error);
      throw new Error(`Failed to get all tickets: ${error.message}`);
    }

    const tickets = data.map(row => TicketSupabaseRowMapper.mapRowToTicket(row));
    console.debug(`TicketStoreSupabase: Retrieved ${tickets.length} tickets`);
    return tickets;
  }

  /**
   * Reloads tickets from storage
   * Note: For Supabase implementation, this is a no-op since data is always fresh
   */
  reload(): void {
    console.debug('TicketStoreSupabase: Reload called (no-op for Supabase implementation)');
    // No-op for Supabase since data is always fresh from the database
  }

  /**
   * Clears all tickets (mainly for testing purposes)
   * WARNING: This will delete all tickets from the database
   */
  async clear(): Promise<void> {
    console.warn('TicketStoreSupabase: Clearing all tickets from database');

    const { error } = await this.supabaseClient
      .from(this.tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (error) {
      console.error('TicketStoreSupabase: Clear failed:', error);
      throw new Error(`Failed to clear tickets: ${error.message}`);
    }

    console.debug('TicketStoreSupabase: Cleared all tickets');
  }
}
