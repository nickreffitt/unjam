import { type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { type CodeShareRequestChanges } from './CodeShareRequestChanges';
import { type CodeShareEventEmitter } from '../events';
import { GitHubSupabaseRowMapper } from '@common/features/CodeShareManager/util/GitHubSupabaseRowMapper';

/**
 * Supabase implementation for listening to code share request changes
 * Uses a single channel to listen for INSERT, UPDATE, and DELETE operations
 */
export class CodeShareRequestChangesSupabase implements CodeShareRequestChanges {
  private supabaseClient: SupabaseClient;
  private eventEmitter: CodeShareEventEmitter;
  private userId?: string;
  private channel: RealtimeChannel | null = null;
  private readonly tableName: string = 'codeshare_requests';

  constructor(
    supabaseClient: SupabaseClient,
    eventEmitter: CodeShareEventEmitter,
  ) {
    if (!supabaseClient) {
      throw new Error('CodeShareRequestChangesSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('CodeShareRequestChangesSupabase: eventEmitter is required');
    }

    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Starts listening for code share request changes for a specific user
   * Sets up a realtime subscription for the user's requests
   * @param userId - The user profile ID to filter updates for
   */
  async start(userId: string): Promise<void> {
    console.debug(`CodeShareRequestChangesSupabase: start(${userId})`);
    if (!userId) {
      throw new Error('CodeShareRequestChangesSupabase: userId is required');
    }
    this.userId = userId;

    if (this.channel) {
      console.debug('CodeShareRequestChangesSupabase: Already listening for changes');
      return;
    }

    console.debug(`CodeShareRequestChangesSupabase: Starting listener for user ${this.userId}`);

    // Set auth for realtime authorization
    const session = await this.supabaseClient.auth.getSession();
    await this.supabaseClient.realtime.setAuth(session.data.session?.access_token ?? null);

    // Subscribe to code share requests broadcast channel for this user
    this.channel = this.supabaseClient
      .channel(`codeshare-requests-${userId}`, {
        config: { private: true },
      })
      .on('broadcast', { event: 'INSERT' }, (payload) => {
        console.debug('CodeShareRequestChangesSupabase: Request created:', payload);
        const record = payload.payload.record as Record<string, unknown>;
        // Filter for requests where user is sender or receiver
        if (record.sender_id === userId || record.receiver_id === userId) {
          this.handleRequestInsert(record);
        }
      })
      .on('broadcast', { event: 'UPDATE' }, (payload) => {
        console.debug('CodeShareRequestChangesSupabase: Request updated:', payload);
        const record = payload.payload.record as Record<string, unknown>;
        // Filter for requests where user is sender or receiver
        if (record.sender_id === userId || record.receiver_id === userId) {
          this.handleRequestUpdate(record);
        }
      })
      .on('broadcast', { event: 'DELETE' }, (payload) => {
        console.debug('CodeShareRequestChangesSupabase: Request deleted:', payload);
        const record = payload.payload.old_record as Record<string, unknown>;
        // Filter for requests where user is sender or receiver
        if (record.sender_id === userId || record.receiver_id === userId) {
          this.handleRequestDelete(record);
        }
      })
      .subscribe((status, error) => {
        console.debug('CodeShareRequestChangesSupabase: Channel status:', status, ' error:', error);
      });
  }

  /**
   * Stops listening for code share request changes
   * Unsubscribes from the Realtime channel
   */
  stop(): void {
    console.debug('CodeShareRequestChangesSupabase: Stopping listener');

    if (this.channel) {
      this.supabaseClient.removeChannel(this.channel);
      this.channel = null;
    }
  }

  /**
   * Handles request insert events
   * Fetches the full request with joined profiles and emits the appropriate event
   */
  private async handleRequestInsert(row: Record<string, unknown>): Promise<void> {
    try {
      const requestId = row.id as string;
      // Fetch the full request with sender and receiver profiles
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
        throw error;
      }

      if (!data) {
        throw new Error('Request not found');
      }

      const request = GitHubSupabaseRowMapper.mapRowToCodeShareRequest(data);
      this.eventEmitter.emitCodeShareRequestCreated(request);
    } catch (error) {
      console.error('CodeShareRequestChangesSupabase: Error handling request insert:', error);
    }
  }

  /**
   * Handles request update events
   * Fetches the full request with joined profiles and emits the appropriate event
   */
  private async handleRequestUpdate(row: Record<string, unknown>): Promise<void> {
    try {
      const requestId = row.id as string;
      // Fetch the full request with sender and receiver profiles
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
        throw error;
      }

      if (!data) {
        throw new Error('Request not found');
      }

      const request = GitHubSupabaseRowMapper.mapRowToCodeShareRequest(data);
      this.eventEmitter.emitCodeShareRequestUpdated(request);
    } catch (error) {
      console.error('CodeShareRequestChangesSupabase: Error handling request update:', error);
    }
  }

  /**
   * Handles request delete events
   * Emits the appropriate event with the request ID
   */
  private handleRequestDelete(row: Record<string, unknown>): void {
    try {
      const requestId = row.id as string;
      if (!requestId) {
        throw new Error('Request ID is required for delete event');
      }
      this.eventEmitter.emitCodeShareRequestDeleted(requestId);
    } catch (error) {
      console.error('CodeShareRequestChangesSupabase: Error handling request delete:', error);
    }
  }
}
