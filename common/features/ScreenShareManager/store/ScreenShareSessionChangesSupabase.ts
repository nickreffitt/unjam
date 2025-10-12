import { type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { type ScreenShareEventEmitter } from '../events/ScreenShareEventEmitter';
import { ScreenShareSessionSupabaseRowMapper } from '../util/ScreenShareSessionSupabaseRowMapper';
import { type ScreenShareSessionChanges } from './ScreenShareSessionChanges';

/**
 * Supabase implementation for listening to screenshare session changes
 * Uses a single channel per ticket:
 * - screenshare-sessions-{ticketId}: For all screenshare session events (INSERT and UPDATE) for a specific ticket
 */
export class ScreenShareSessionChangesSupabase implements ScreenShareSessionChanges {
  private supabaseClient: SupabaseClient;
  private eventEmitter: ScreenShareEventEmitter;
  private ticketId?: string;
  private screenshareChannel: RealtimeChannel | null = null;
  private readonly tableName: string = 'screenshare_sessions';

  constructor(
    ticketId: string,
    supabaseClient: SupabaseClient,
    eventEmitter: ScreenShareEventEmitter,
  ) {
    if (!ticketId) {
      throw new Error('ScreenShareSessionChangesSupabase: ticketId is required');
    }
    if (!supabaseClient) {
      throw new Error('ScreenShareSessionChangesSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('ScreenShareSessionChangesSupabase: eventEmitter is required');
    }
    this.ticketId = ticketId;
    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Starts listening for screenshare session changes for a specific ticket
   * Sets up a broadcast channel subscription for the ticket
   */
  async start(): Promise<void> {
    console.debug(`ScreenShareSessionChangesSupabase: start()`);

    if (this.screenshareChannel) {
      console.debug('ScreenShareSessionChangesSupabase: Already listening for changes');
      return;
    }

    console.debug(`ScreenShareSessionChangesSupabase: Starting screenshare session changes listener for ticket ${this.ticketId}`);

    // Set auth for realtime authorization
    const session = await this.supabaseClient.auth.getSession();
    await this.supabaseClient.realtime.setAuth(session.data.session?.access_token ?? null);

    // Subscribe to screenshare sessions channel (for INSERT and UPDATE events)
    const channelName = `screenshare-sessions-${this.ticketId}`;
    this.screenshareChannel = this.supabaseClient
      .channel(channelName, {
        config: { private: true },
      })
      .on('broadcast', { event: 'INSERT' }, (payload) => {
        console.debug('ScreenShareSessionChangesSupabase: New screenshare session created:', payload);
        this.handleSessionInsert(payload.payload.record);
      })
      .on('broadcast', { event: 'UPDATE' }, (payload) => {
        console.debug('ScreenShareSessionChangesSupabase: Screenshare session updated:', payload);
        const newRecord = payload.payload.record;
        this.handleSessionUpdate(newRecord);
      })
      .subscribe((status, error) => {
        console.debug('ScreenShareSessionChangesSupabase: Screenshare channel status:', status, ' error:', error);
      });
  }

  /**
   * Stops listening for screenshare session changes
   * Unsubscribes from the Realtime channel
   */
  stop(): void {
    console.debug('ScreenShareSessionChangesSupabase: Stopping screenshare session changes listener');

    if (this.screenshareChannel) {
      this.supabaseClient.removeChannel(this.screenshareChannel);
      this.screenshareChannel = null;
    }
  }

  /**
   * Handles screenshare session insert events
   * Maps the database row to a ScreenShareSession and emits the appropriate event
   */
  private async handleSessionInsert(row: Record<string, unknown>): Promise<void> {
    try {
      // Fetch the complete session with joined profile data
      // Use inner joins for both publisher and subscriber (both required)
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select(`
          *,
          publisher:profiles!screenshare_sessions_publisher_id_fkey(*),
          subscriber:profiles!screenshare_sessions_subscriber_id_fkey(*)
        `)
        .eq('id', row.id)
        .single();

      if (error) {
        console.error('ScreenShareSessionChangesSupabase: Error fetching inserted session:', error);
        return;
      }

      const session = ScreenShareSessionSupabaseRowMapper.mapRowToSession(data);
      this.eventEmitter.emitScreenShareSessionCreated(session);
    } catch (error) {
      console.error('ScreenShareSessionChangesSupabase: Error handling session insert:', error);
    }
  }

  /**
   * Handles screenshare session update events
   * Maps the database row to a ScreenShareSession and emits the appropriate event
   */
  private async handleSessionUpdate(row: Record<string, unknown>): Promise<void> {
    try {
      // Fetch the complete session with joined profile data
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select(`
          *,
          publisher:profiles!screenshare_sessions_publisher_id_fkey(*),
          subscriber:profiles!screenshare_sessions_subscriber_id_fkey(*)
        `)
        .eq('id', row.id)
        .single();

      if (error) {
        console.error('ScreenShareSessionChangesSupabase: Error fetching updated session:', error);
        return;
      }

      const session = ScreenShareSessionSupabaseRowMapper.mapRowToSession(data);

      // Check if this is an "ended" session to emit the specific ended event
      if (session.status === 'ended') {
        this.eventEmitter.emitScreenShareSessionEnded(session);
      } else {
        this.eventEmitter.emitScreenShareSessionUpdated(session);
      }
    } catch (error) {
      console.error('ScreenShareSessionChangesSupabase: Error handling session update:', error);
    }
  }
}
