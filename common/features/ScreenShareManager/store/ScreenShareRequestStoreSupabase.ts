import { type SupabaseClient } from '@supabase/supabase-js';
import { type ScreenShareRequest, type ScreenShareStatus } from '@common/types';
import { type ScreenShareRequestStore } from './ScreenShareRequestStore';
import { type ScreenShareEventEmitter } from '@common/features/ScreenShareManager/events';
import { ScreenShareRequestSupabaseRowMapper } from '../util/ScreenShareRequestSupabaseRowMapper';

/**
 * Supabase implementation of the screen share request store
 * Uses Supabase PostgreSQL database for persistence with row-level security
 * Emits events for create and update operations for local same-tab event handling
 */
export class ScreenShareRequestStoreSupabase implements ScreenShareRequestStore {
  private supabaseClient: SupabaseClient;
  private eventEmitter: ScreenShareEventEmitter;
  private readonly tableName: string = 'screenshare_requests';

  constructor(supabaseClient: SupabaseClient, eventEmitter: ScreenShareEventEmitter) {
    if (!supabaseClient) {
      throw new Error('ScreenShareRequestStoreSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('ScreenShareRequestStoreSupabase: eventEmitter is required');
    }
    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
    console.debug('ScreenShareRequestStoreSupabase: Initialized');
  }

  /**
   * Creates a new screen share request
   * @param request - The request to create
   * @returns The created request
   */
  async create(request: Omit<ScreenShareRequest, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt'>): Promise<ScreenShareRequest> {
    // Validate required fields
    if (!request.ticketId) {
      throw new Error('ticketId is required for request creation');
    }
    if (!request.sender?.id) {
      throw new Error('sender profile ID is required for request creation');
    }
    if (!request.receiver?.id) {
      throw new Error('receiver profile ID is required for request creation');
    }
    if (!request.status) {
      throw new Error('status is required for request creation');
    }

    console.debug('ScreenShareRequestStoreSupabase: Creating request for ticket', request.ticketId);

    // Calculate expires_at (10 seconds from now)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 1000);

    const requestWithExpiry = {
      ...request,
      expiresAt,
    };

    const requestRow = ScreenShareRequestSupabaseRowMapper.mapRequestToRow(requestWithExpiry);

    // Omit the ID field to let the database generate its own UUID
    const { id, ...requestRowWithoutId } = requestRow;

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .insert([requestRowWithoutId])
      .select(`
        *,
        sender:profiles!screenshare_requests_sender_id_fkey(*),
        receiver:profiles!screenshare_requests_receiver_id_fkey(*)
      `)
      .single();

    if (error) {
      console.error('ScreenShareRequestStoreSupabase: Create failed:', error);
      throw new Error(`Failed to create screen share request: ${error.message}`);
    }

    const createdRequest = ScreenShareRequestSupabaseRowMapper.mapRowToRequest(data);
    console.debug('ScreenShareRequestStoreSupabase: Created request successfully:', createdRequest.id);

    // Emit event for request creation (for same-tab listeners)
    this.eventEmitter.emitScreenShareRequestCreated(createdRequest);

    return createdRequest;
  }

  /**
   * Gets a screen share request by ID
   * @param requestId - The request ID
   * @returns The request if found
   */
  async getById(requestId: string): Promise<ScreenShareRequest | undefined> {
    console.debug('ScreenShareRequestStoreSupabase: Getting request by ID', requestId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        sender:profiles!screenshare_requests_sender_id_fkey(*),
        receiver:profiles!screenshare_requests_receiver_id_fkey(*)
      `)
      .eq('id', requestId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        console.debug('ScreenShareRequestStoreSupabase: Request not found:', requestId);
        return undefined;
      }
      console.error('ScreenShareRequestStoreSupabase: Get by ID failed:', error);
      throw new Error(`Failed to get screen share request: ${error.message}`);
    }

    return ScreenShareRequestSupabaseRowMapper.mapRowToRequest(data);
  }

  /**
   * Gets all requests for a specific ticket
   * @param ticketId - The ticket ID
   * @returns Array of requests for the ticket
   */
  async getByTicketId(ticketId: string): Promise<ScreenShareRequest[]> {
    console.debug('ScreenShareRequestStoreSupabase: Getting requests for ticket', ticketId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        sender:profiles!screenshare_requests_sender_id_fkey(*),
        receiver:profiles!screenshare_requests_receiver_id_fkey(*)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false }); // Newest first

    if (error) {
      console.error('ScreenShareRequestStoreSupabase: Get by ticket ID failed:', error);
      throw new Error(`Failed to get screen share requests: ${error.message}`);
    }

    const requests = data.map(row => ScreenShareRequestSupabaseRowMapper.mapRowToRequest(row));
    console.debug(`ScreenShareRequestStoreSupabase: Retrieved ${requests.length} requests`);
    return requests;
  }

  /**
   * Gets the active request for a ticket (pending, accepted, or active status)
   * @param ticketId - The ticket ID
   * @returns The active request if found and not expired
   */
  async getActiveByTicketId(ticketId: string): Promise<ScreenShareRequest | undefined> {
    console.debug('ScreenShareRequestStoreSupabase: Getting active request for ticket', ticketId);

    const now = new Date().toISOString();
    const activeStatuses: ScreenShareStatus[] = ['pending', 'accepted', 'active'];

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        sender:profiles!screenshare_requests_sender_id_fkey(*),
        receiver:profiles!screenshare_requests_receiver_id_fkey(*)
      `)
      .eq('ticket_id', ticketId)
      .in('status', activeStatuses)
      .gt('expires_at', now) // Not expired
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('ScreenShareRequestStoreSupabase: Get active by ticket ID failed:', error);
      throw new Error(`Failed to get active screen share request: ${error.message}`);
    }

    if (!data) {
      console.debug('ScreenShareRequestStoreSupabase: No active request found for ticket', ticketId);
      return undefined;
    }

    return ScreenShareRequestSupabaseRowMapper.mapRowToRequest(data);
  }

  /**
   * Updates the status of a screen share request
   * @param requestId - The request ID
   * @param status - The new status
   * @returns The updated request if found
   */
  async updateStatus(requestId: string, status: ScreenShareStatus): Promise<ScreenShareRequest | undefined> {
    console.debug('ScreenShareRequestStoreSupabase: Updating request status', requestId, 'to', status);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .update({ status })
      .eq('id', requestId)
      .select(`
        *,
        sender:profiles!screenshare_requests_sender_id_fkey(*),
        receiver:profiles!screenshare_requests_receiver_id_fkey(*)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        console.warn('ScreenShareRequestStoreSupabase: Request not found for update:', requestId);
        return undefined;
      }
      console.error('ScreenShareRequestStoreSupabase: Update status failed:', error);
      throw new Error(`Failed to update screen share request status: ${error.message}`);
    }

    const updatedRequest = ScreenShareRequestSupabaseRowMapper.mapRowToRequest(data);
    console.debug('ScreenShareRequestStoreSupabase: Updated request successfully:', updatedRequest.id);

    // Emit event for request update (for same-tab listeners)
    this.eventEmitter.emitScreenShareRequestUpdated(updatedRequest);

    return updatedRequest;
  }

  /**
   * Deletes a screen share request (for cancellation)
   * @param requestId - The request ID to delete
   * @returns True if deleted, false if not found
   */
  async delete(requestId: string): Promise<boolean> {
    console.debug('ScreenShareRequestStoreSupabase: Deleting request', requestId);

    const { error, count } = await this.supabaseClient
      .from(this.tableName)
      .delete({ count: 'exact' })
      .eq('id', requestId);

    if (error) {
      console.error('ScreenShareRequestStoreSupabase: Delete failed:', error);
      throw new Error(`Failed to delete screen share request: ${error.message}`);
    }

    const deleted = (count ?? 0) > 0;
    if (deleted) {
      console.debug('ScreenShareRequestStoreSupabase: Deleted request successfully:', requestId);
    } else {
      console.warn('ScreenShareRequestStoreSupabase: Request not found for deletion:', requestId);
    }

    return deleted;
  }

  /**
   * Gets all requests
   * @returns All screen share requests
   */
  async getAll(): Promise<ScreenShareRequest[]> {
    console.debug('ScreenShareRequestStoreSupabase: Getting all requests');

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        sender:profiles!screenshare_requests_sender_id_fkey(*),
        receiver:profiles!screenshare_requests_receiver_id_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('ScreenShareRequestStoreSupabase: Get all failed:', error);
      throw new Error(`Failed to get all screen share requests: ${error.message}`);
    }

    const requests = data.map(row => ScreenShareRequestSupabaseRowMapper.mapRowToRequest(row));
    console.debug(`ScreenShareRequestStoreSupabase: Retrieved ${requests.length} requests`);
    return requests;
  }

  /**
   * Clears all requests (mainly for testing purposes)
   * WARNING: This will delete all requests from the database
   */
  async clear(): Promise<void> {
    console.warn('ScreenShareRequestStoreSupabase: Clearing all requests');

    const { error } = await this.supabaseClient
      .from(this.tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (error) {
      console.error('ScreenShareRequestStoreSupabase: Clear failed:', error);
      throw new Error(`Failed to clear screen share requests: ${error.message}`);
    }

    console.debug('ScreenShareRequestStoreSupabase: Cleared all requests');
  }

  /**
   * Reloads requests from storage
   * Used when we need to sync with changes made by other tabs
   * Note: For Supabase implementation, this is a no-op since data is always fresh
   */
  reload(): void {
    console.debug('ScreenShareRequestStoreSupabase: Reload called');
    // No-op for Supabase since data is always fresh from the database
  }
}
