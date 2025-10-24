import { type SupabaseClient } from '@supabase/supabase-js';
import { type CodeShareRequest, type CodeShareStatus } from '@common/types';
import { type CodeShareRequestStore } from './CodeShareRequestStore';
import { type CodeShareEventEmitter } from '@common/features/CodeShareManager/events';
import { GitHubSupabaseRowMapper } from '@common/features/CodeShareManager/util/GitHubSupabaseRowMapper';

/**
 * Supabase implementation of the code share request store
 * Uses Supabase PostgreSQL database for persistence with row-level security
 * Emits events for create and update operations for local same-tab event handling
 */
export class CodeShareRequestStoreSupabase implements CodeShareRequestStore {
  private supabaseClient: SupabaseClient;
  private eventEmitter: CodeShareEventEmitter;
  private readonly tableName: string = 'codeshare_requests';

  constructor(supabaseClient: SupabaseClient, eventEmitter: CodeShareEventEmitter) {
    if (!supabaseClient) {
      throw new Error('CodeShareRequestStoreSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('CodeShareRequestStoreSupabase: eventEmitter is required');
    }
    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
    console.debug('CodeShareRequestStoreSupabase: Initialized');
  }

  /**
   * Creates a new code share request
   * @param request - The request to create
   * @returns The created request
   */
  async create(request: Omit<CodeShareRequest, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt'>): Promise<CodeShareRequest> {
    // Validate required fields
    if (!request.sender?.id) {
      throw new Error('sender profile ID is required for request creation');
    }
    if (!request.receiver?.id) {
      throw new Error('receiver profile ID is required for request creation');
    }
    if (!request.status) {
      throw new Error('status is required for request creation');
    }

    console.debug('CodeShareRequestStoreSupabase: Creating request from', request.sender.id, 'to', request.receiver.id);

    // Calculate expires_at (5 seconds from now)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 1000);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .insert([{
        sender_id: request.sender.id,
        receiver_id: request.receiver.id,
        status: request.status,
        expires_at: expiresAt.toISOString()
      }])
      .select(`
        *,
        sender:profiles!codeshare_requests_sender_id_fkey(*),
        receiver:profiles!codeshare_requests_receiver_id_fkey(*)
      `)
      .single();

    if (error) {
      console.error('CodeShareRequestStoreSupabase: Create failed:', error);
      throw new Error(`Failed to create code share request: ${error.message}`);
    }

    const createdRequest = GitHubSupabaseRowMapper.mapRowToCodeShareRequest(data);
    console.debug('CodeShareRequestStoreSupabase: Created request successfully:', createdRequest.id);

    // Emit event for request creation (for same-tab listeners)
    this.eventEmitter.emitCodeShareRequestCreated(createdRequest);

    return createdRequest;
  }

  /**
   * Gets a code share request by ID
   * @param requestId - The request ID
   * @returns The request if found
   */
  async getById(requestId: string): Promise<CodeShareRequest | undefined> {
    console.debug('CodeShareRequestStoreSupabase: Getting request by ID', requestId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        sender:profiles!codeshare_requests_sender_id_fkey(*),
        receiver:profiles!codeshare_requests_receiver_id_fkey(*)
      `)
      .eq('id', requestId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        console.debug('CodeShareRequestStoreSupabase: Request not found:', requestId);
        return undefined;
      }
      console.error('CodeShareRequestStoreSupabase: Get by ID failed:', error);
      throw new Error(`Failed to get code share request: ${error.message}`);
    }

    return GitHubSupabaseRowMapper.mapRowToCodeShareRequest(data);
  }

  /**
   * Gets all requests for a specific user (as sender or receiver)
   * @param userId - The user profile ID
   * @returns Array of requests for the user
   */
  async getByUserId(userId: string): Promise<CodeShareRequest[]> {
    console.debug('CodeShareRequestStoreSupabase: Getting requests for user', userId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        sender:profiles!codeshare_requests_sender_id_fkey(*),
        receiver:profiles!codeshare_requests_receiver_id_fkey(*)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false }); // Newest first

    if (error) {
      console.error('CodeShareRequestStoreSupabase: Get by user ID failed:', error);
      throw new Error(`Failed to get code share requests: ${error.message}`);
    }

    const requests = data.map(row => GitHubSupabaseRowMapper.mapRowToCodeShareRequest(row));
    console.debug(`CodeShareRequestStoreSupabase: Retrieved ${requests.length} requests`);
    return requests;
  }

  /**
   * Gets the active request for a user (pending status, not expired)
   * @param userId - The user profile ID
   * @returns The active request if found
   */
  async getActiveByUserId(userId: string): Promise<CodeShareRequest | undefined> {
    console.debug('CodeShareRequestStoreSupabase: Getting active request for user', userId);

    const now = new Date().toISOString();
    const activeStatuses: CodeShareStatus[] = ['pending'];

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        sender:profiles!codeshare_requests_sender_id_fkey(*),
        receiver:profiles!codeshare_requests_receiver_id_fkey(*)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .in('status', activeStatuses)
      .gt('expires_at', now) // Not expired
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('CodeShareRequestStoreSupabase: Get active by user ID failed:', error);
      throw new Error(`Failed to get active code share request: ${error.message}`);
    }

    if (!data) {
      console.debug('CodeShareRequestStoreSupabase: No active request found for user', userId);
      return undefined;
    }

    return GitHubSupabaseRowMapper.mapRowToCodeShareRequest(data);
  }

  /**
   * Updates the status of a code share request
   * @param requestId - The request ID
   * @param status - The new status
   * @returns The updated request if found
   */
  async updateStatus(requestId: string, status: CodeShareStatus): Promise<CodeShareRequest | undefined> {
    console.debug('CodeShareRequestStoreSupabase: Updating request status', requestId, 'to', status);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .update({ status })
      .eq('id', requestId)
      .select(`
        *,
        sender:profiles!codeshare_requests_sender_id_fkey(*),
        receiver:profiles!codeshare_requests_receiver_id_fkey(*)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        console.warn('CodeShareRequestStoreSupabase: Request not found for update:', requestId);
        return undefined;
      }
      console.error('CodeShareRequestStoreSupabase: Update status failed:', error);
      throw new Error(`Failed to update code share request status: ${error.message}`);
    }

    const updatedRequest = GitHubSupabaseRowMapper.mapRowToCodeShareRequest(data);
    console.debug('CodeShareRequestStoreSupabase: Updated request successfully:', updatedRequest.id);

    // Emit event for request update (for same-tab listeners)
    this.eventEmitter.emitCodeShareRequestUpdated(updatedRequest);

    return updatedRequest;
  }

  /**
   * Deletes a code share request (for cancellation)
   * @param requestId - The request ID to delete
   * @returns True if deleted, false if not found
   */
  async delete(requestId: string): Promise<boolean> {
    console.debug('CodeShareRequestStoreSupabase: Deleting request', requestId);

    const { error, count } = await this.supabaseClient
      .from(this.tableName)
      .delete({ count: 'exact' })
      .eq('id', requestId);

    if (error) {
      console.error('CodeShareRequestStoreSupabase: Delete failed:', error);
      throw new Error(`Failed to delete code share request: ${error.message}`);
    }

    const deleted = (count ?? 0) > 0;
    if (deleted) {
      console.debug('CodeShareRequestStoreSupabase: Deleted request successfully:', requestId);
    } else {
      console.warn('CodeShareRequestStoreSupabase: Request not found for deletion:', requestId);
    }

    return deleted;
  }

  /**
   * Reloads integrations from storage
   * No-op for Supabase implementation as queries are always fresh
   */
  reload(): void {
    // No-op - Supabase queries are always fresh
    console.debug('CodeShareRequestStoreSupabase: Reload called (no-op)');
  }
}
