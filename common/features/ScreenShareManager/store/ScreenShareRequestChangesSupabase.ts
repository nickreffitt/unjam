import { type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { type ScreenShareEventEmitter } from '../events/ScreenShareEventEmitter';
import { ScreenShareRequestSupabaseRowMapper } from '../util/ScreenShareRequestSupabaseRowMapper';
import { type ScreenShareRequestChanges } from './ScreenShareRequestChanges';

/**
 * Supabase implementation for listening to screenshare request changes
 * Uses a single channel per ticket:
 * - screenshare-requests-{ticketId}: For all screenshare request events (INSERT and UPDATE) for a specific ticket
 */
export class ScreenShareRequestChangesSupabase implements ScreenShareRequestChanges {
  private supabaseClient: SupabaseClient;
  private eventEmitter: ScreenShareEventEmitter;
  private ticketId?: string;
  private screenshareChannel: RealtimeChannel | null = null;
  private readonly tableName: string = 'screenshare_requests';

  constructor(
    ticketId: string,
    supabaseClient: SupabaseClient,
    eventEmitter: ScreenShareEventEmitter,
  ) {
    if (!ticketId) {
      throw new Error('ScreenShareRequestChangesSupabase: ticketId is required');
    }
    if (!supabaseClient) {
      throw new Error('ScreenShareRequestChangesSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('ScreenShareRequestChangesSupabase: eventEmitter is required');
    }
    this.ticketId = ticketId;
    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Starts listening for screenshare request changes for a specific ticket
   * Sets up a broadcast channel subscription for the ticket
   */
  async start(): Promise<void> {
    console.debug(`ScreenShareRequestChangesSupabase: start()`);

    if (this.screenshareChannel) {
      console.debug('ScreenShareRequestChangesSupabase: Already listening for changes');
      return;
    }

    console.debug(`ScreenShareRequestChangesSupabase: Starting screenshare request changes listener for ticket ${this.ticketId}`);

    // Set auth for realtime authorization
    const session = await this.supabaseClient.auth.getSession();
    await this.supabaseClient.realtime.setAuth(session.data.session?.access_token ?? null);

    // Subscribe to screenshare requests channel (for INSERT and UPDATE events)
    const channelName = `screenshare-requests-${this.ticketId}`;
    this.screenshareChannel = this.supabaseClient
      .channel(channelName, {
        config: { private: true },
      })
      .on('broadcast', { event: 'INSERT' }, (payload) => {
        console.debug('ScreenShareRequestChangesSupabase: New screenshare request created:', payload);
        this.handleRequestInsert(payload.payload.record);
      })
      .on('broadcast', { event: 'UPDATE' }, (payload) => {
        console.debug('ScreenShareRequestChangesSupabase: Screenshare request updated:', payload);
        const newRecord = payload.payload.record;
        this.handleRequestUpdate(newRecord);
      })
      .subscribe((status, error) => {
        console.debug('ScreenShareRequestChangesSupabase: Screenshare channel status:', status, ' error:', error);
      });
  }

  /**
   * Stops listening for screenshare request changes
   * Unsubscribes from the Realtime channel
   */
  stop(): void {
    console.debug('ScreenShareRequestChangesSupabase: Stopping screenshare request changes listener');

    if (this.screenshareChannel) {
      this.supabaseClient.removeChannel(this.screenshareChannel);
      this.screenshareChannel = null;
    }
  }

  /**
   * Handles screenshare request insert events
   * Maps the database row to a ScreenShareRequest and emits the appropriate event
   */
  private async handleRequestInsert(row: Record<string, unknown>): Promise<void> {
    try {
      // Fetch the complete request with joined profile data
      // Use inner joins for both sender and receiver (both required)
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select(`
          *,
          sender:profiles!screenshare_requests_sender_id_fkey(*),
          receiver:profiles!screenshare_requests_receiver_id_fkey(*)
        `)
        .eq('id', row.id)
        .single();

      if (error) {
        console.error('ScreenShareRequestChangesSupabase: Error fetching inserted request:', error);
        return;
      }

      const request = ScreenShareRequestSupabaseRowMapper.mapRowToRequest(data);
      this.eventEmitter.emitScreenShareRequestCreated(request);
    } catch (error) {
      console.error('ScreenShareRequestChangesSupabase: Error handling request insert:', error);
    }
  }

  /**
   * Handles screenshare request update events
   * Maps the database row to a ScreenShareRequest and emits the appropriate event
   */
  private async handleRequestUpdate(row: Record<string, unknown>): Promise<void> {
    try {
      // Fetch the complete request with joined profile data
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select(`
          *,
          sender:profiles!screenshare_requests_sender_id_fkey(*),
          receiver:profiles!screenshare_requests_receiver_id_fkey(*)
        `)
        .eq('id', row.id)
        .single();

      if (error) {
        console.error('ScreenShareRequestChangesSupabase: Error fetching updated request:', error);
        return;
      }

      const request = ScreenShareRequestSupabaseRowMapper.mapRowToRequest(data);
      this.eventEmitter.emitScreenShareRequestUpdated(request);
    } catch (error) {
      console.error('ScreenShareRequestChangesSupabase: Error handling request update:', error);
    }
  }
}
