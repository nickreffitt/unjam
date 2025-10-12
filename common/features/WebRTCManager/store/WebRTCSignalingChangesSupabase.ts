import { type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { type WebRTCEventEmitter } from '../events/WebRTCEventEmitter';
import { WebRTCSignalSupabaseRowMapper } from '../util/WebRTCSignalSupabaseRowMapper';
import { type WebRTCSignalingChanges } from './WebRTCSignalingChanges';

/**
 * Supabase implementation for listening to WebRTC signaling changes
 * Uses a single channel per ticket:
 * - webrtc-signals-{ticketId}: For all WebRTC signal events (INSERT and UPDATE) for a specific ticket
 */
export class WebRTCSignalingChangesSupabase implements WebRTCSignalingChanges {
  private supabaseClient: SupabaseClient;
  private eventEmitter: WebRTCEventEmitter;
  private ticketId?: string;
  private webrtcChannel: RealtimeChannel | null = null;
  private readonly tableName: string = 'webrtc_signals';

  constructor(
    ticketId: string,
    supabaseClient: SupabaseClient,
    eventEmitter: WebRTCEventEmitter,
  ) {
    if (!ticketId) {
      throw new Error('WebRTCSignalingChangesSupabase: ticketId is required');
    }
    if (!supabaseClient) {
      throw new Error('WebRTCSignalingChangesSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('WebRTCSignalingChangesSupabase: eventEmitter is required');
    }
    this.ticketId = ticketId;
    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Starts listening for WebRTC signaling changes for a specific ticket
   * Sets up a broadcast channel subscription for the ticket
   */
  async start(): Promise<void> {
    console.debug(`WebRTCSignalingChangesSupabase: start()`);

    if (this.webrtcChannel) {
      console.debug('WebRTCSignalingChangesSupabase: Already listening for changes');
      return;
    }

    console.debug(`WebRTCSignalingChangesSupabase: Starting WebRTC signaling changes listener for ticket ${this.ticketId}`);

    // Set auth for realtime authorization
    const session = await this.supabaseClient.auth.getSession();
    await this.supabaseClient.realtime.setAuth(session.data.session?.access_token ?? null);

    // Subscribe to webrtc signals channel (for INSERT and UPDATE events)
    const channelName = `webrtc-signals-${this.ticketId}`;
    this.webrtcChannel = this.supabaseClient
      .channel(channelName, {
        config: { private: true },
      })
      .on('broadcast', { event: 'INSERT' }, (payload) => {
        console.debug('WebRTCSignalingChangesSupabase: New WebRTC signal created:', payload);
        this.handleSignalInsert(payload.payload.record);
      })
      .on('broadcast', { event: 'UPDATE' }, (payload) => {
        console.debug('WebRTCSignalingChangesSupabase: WebRTC signal updated:', payload);
        const newRecord = payload.payload.record;
        this.handleSignalUpdate(newRecord);
      })
      .subscribe((status, error) => {
        console.debug('WebRTCSignalingChangesSupabase: WebRTC channel status:', status, ' error:', error);
      });
  }

  /**
   * Stops listening for WebRTC signaling changes
   * Unsubscribes from the Realtime channel
   */
  stop(): void {
    console.debug('WebRTCSignalingChangesSupabase: Stopping WebRTC signaling changes listener');

    if (this.webrtcChannel) {
      this.supabaseClient.removeChannel(this.webrtcChannel);
      this.webrtcChannel = null;
    }
  }

  /**
   * Handles WebRTC signal insert events
   * Maps the database row to a WebRTCSignal and emits the appropriate event based on signal type
   */
  private async handleSignalInsert(row: Record<string, unknown>): Promise<void> {
    try {
      // Fetch the complete signal with joined profile data
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select(`
          *,
          from:profiles!webrtc_signals_from_id_fkey(*),
          to:profiles!webrtc_signals_to_id_fkey(*)
        `)
        .eq('id', row.id)
        .single();

      if (error) {
        console.error('WebRTCSignalingChangesSupabase: Error fetching inserted signal:', error);
        return;
      }

      const signal = WebRTCSignalSupabaseRowMapper.mapRowToSignal(data);

      // Emit appropriate event based on signal type
      if (signal.type === 'offer') {
        this.eventEmitter.emitWebRTCOfferCreated(
          signal.sessionId,
          signal.payload,
          signal.from,
          signal.to
        );
      } else if (signal.type === 'answer') {
        this.eventEmitter.emitWebRTCAnswerCreated(
          signal.sessionId,
          signal.payload,
          signal.from,
          signal.to
        );
      } else if (signal.type === 'ice-candidate') {
        this.eventEmitter.emitWebRTCIceCandidate(
          signal.sessionId,
          signal.payload,
          signal.from,
          signal.to
        );
      }
    } catch (error) {
      console.error('WebRTCSignalingChangesSupabase: Error handling signal insert:', error);
    }
  }

  /**
   * Handles WebRTC signal update events
   * Maps the database row to a WebRTCSignal and emits the appropriate event based on signal type
   */
  private async handleSignalUpdate(row: Record<string, unknown>): Promise<void> {
    try {
      // Fetch the complete signal with joined profile data
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select(`
          *,
          from:profiles!webrtc_signals_from_id_fkey(*),
          to:profiles!webrtc_signals_to_id_fkey(*)
        `)
        .eq('id', row.id)
        .single();

      if (error) {
        console.error('WebRTCSignalingChangesSupabase: Error fetching updated signal:', error);
        return;
      }

      const signal = WebRTCSignalSupabaseRowMapper.mapRowToSignal(data);

      // For updates, we typically just need to know the signal was processed
      // The existing event system should handle this through the processed flag
      console.debug('WebRTCSignalingChangesSupabase: Signal updated:', signal.id, 'processed:', signal.processed);
    } catch (error) {
      console.error('WebRTCSignalingChangesSupabase: Error handling signal update:', error);
    }
  }
}
