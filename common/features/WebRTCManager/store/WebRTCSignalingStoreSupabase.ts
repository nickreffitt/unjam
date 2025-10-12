import { type SupabaseClient } from '@supabase/supabase-js';
import { type WebRTCSignal } from '@common/types';
import { type WebRTCSignalingStore } from './WebRTCSignalingStore';
import { type WebRTCEventEmitter } from '../events/WebRTCEventEmitter';
import { WebRTCSignalSupabaseRowMapper } from '../util/WebRTCSignalSupabaseRowMapper';

/**
 * Supabase implementation of the WebRTC signaling store
 * Uses Supabase PostgreSQL database for persistence with row-level security
 * Emits events for create and update operations for local same-tab event handling
 */
export class WebRTCSignalingStoreSupabase implements WebRTCSignalingStore {
  private supabaseClient: SupabaseClient;
  private readonly tableName: string = 'webrtc_signals';

  constructor(supabaseClient: SupabaseClient, eventEmitter: WebRTCEventEmitter) {
    if (!supabaseClient) {
      throw new Error('WebRTCSignalingStoreSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('WebRTCSignalingStoreSupabase: eventEmitter is required');
    }
    this.supabaseClient = supabaseClient;
    console.debug('WebRTCSignalingStoreSupabase: Initialized');
  }

  /**
   * Creates a new WebRTC signal
   * @param signal - The signal to create (without id and createdAt)
   * @returns The created signal
   */
  async create(signal: Omit<WebRTCSignal, 'id' | 'createdAt'>): Promise<WebRTCSignal> {
    // Validate required fields
    if (!signal.ticketId) {
      throw new Error('ticketId is required for signal creation');
    }
    if (!signal.sessionId) {
      throw new Error('sessionId is required for signal creation');
    }
    if (!signal.from?.id) {
      throw new Error('from profile ID is required for signal creation');
    }
    if (!signal.to?.id) {
      throw new Error('to profile ID is required for signal creation');
    }
    if (!signal.type) {
      throw new Error('type is required for signal creation');
    }
    if (!signal.payload) {
      throw new Error('payload is required for signal creation');
    }

    console.debug('WebRTCSignalingStoreSupabase: Creating signal for ticket', signal.ticketId, 'session', signal.sessionId);

    const signalRow = WebRTCSignalSupabaseRowMapper.mapSignalToRow(signal);

    // Omit the ID field to let the database generate its own UUID
    const { id, ...signalRowWithoutId } = signalRow;

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .insert([signalRowWithoutId])
      .select(`
        *,
        from:profiles!webrtc_signals_from_id_fkey(*),
        to:profiles!webrtc_signals_to_id_fkey(*)
      `)
      .single();

    if (error) {
      console.error('WebRTCSignalingStoreSupabase: Create failed:', error);
      throw new Error(`Failed to create WebRTC signal: ${error.message}`);
    }

    const createdSignal = WebRTCSignalSupabaseRowMapper.mapRowToSignal(data);
    console.debug('WebRTCSignalingStoreSupabase: Created signal successfully:', createdSignal.id);

    // Note: We don't emit events here because the broadcast mechanism will handle it
    // This prevents duplicate events in the same tab

    return createdSignal;
  }

  /**
   * Gets unprocessed signals for a specific session and user
   * @param sessionId - The session ID
   * @param userId - The user ID to get signals for
   * @returns Array of unprocessed signals
   */
  async getUnprocessedForSession(sessionId: string, userId: string): Promise<WebRTCSignal[]> {
    console.debug('WebRTCSignalingStoreSupabase: Getting unprocessed signals for session', sessionId, 'and user', userId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        from:profiles!webrtc_signals_from_id_fkey(*),
        to:profiles!webrtc_signals_to_id_fkey(*)
      `)
      .eq('session_id', sessionId)
      .eq('to_id', userId)
      .eq('processed', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('WebRTCSignalingStoreSupabase: Get unprocessed failed:', error);
      throw new Error(`Failed to get unprocessed signals: ${error.message}`);
    }

    const signals = data.map(row => WebRTCSignalSupabaseRowMapper.mapRowToSignal(row));
    console.debug(`WebRTCSignalingStoreSupabase: Retrieved ${signals.length} unprocessed signals`);
    return signals;
  }

  /**
   * Marks a signal as processed
   * @param signalId - The signal ID to mark as processed
   * @returns True if marked successfully, false if not found
   */
  async markProcessed(signalId: string): Promise<boolean> {
    console.debug('WebRTCSignalingStoreSupabase: Marking signal as processed', signalId);

    const { error } = await this.supabaseClient
      .from(this.tableName)
      .update({ processed: true })
      .eq('id', signalId)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        console.warn('WebRTCSignalingStoreSupabase: Signal not found for update:', signalId);
        return false;
      }
      console.error('WebRTCSignalingStoreSupabase: Mark processed failed:', error);
      throw new Error(`Failed to mark signal as processed: ${error.message}`);
    }

    console.debug('WebRTCSignalingStoreSupabase: Marked signal as processed successfully:', signalId);
    return true;
  }

  /**
   * Deletes all signals for a session
   * @param sessionId - The session ID
   * @returns Number of signals deleted
   */
  async deleteBySessionId(sessionId: string): Promise<number> {
    console.debug('WebRTCSignalingStoreSupabase: Deleting signals for session', sessionId);

    const { error, count } = await this.supabaseClient
      .from(this.tableName)
      .delete({ count: 'exact' })
      .eq('session_id', sessionId);

    if (error) {
      console.error('WebRTCSignalingStoreSupabase: Delete by session failed:', error);
      throw new Error(`Failed to delete signals for session: ${error.message}`);
    }

    const deletedCount = count ?? 0;
    console.debug(`WebRTCSignalingStoreSupabase: Deleted ${deletedCount} signals`);
    return deletedCount;
  }

  /**
   * Clears all signals (mainly for testing purposes)
   * WARNING: This will delete all signals from the database
   */
  async clear(): Promise<void> {
    console.warn('WebRTCSignalingStoreSupabase: Clearing all signals');

    const { error } = await this.supabaseClient
      .from(this.tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (error) {
      console.error('WebRTCSignalingStoreSupabase: Clear failed:', error);
      throw new Error(`Failed to clear WebRTC signals: ${error.message}`);
    }

    console.debug('WebRTCSignalingStoreSupabase: Cleared all signals');
  }

  /**
   * Reloads signals from storage
   * Used when we need to sync with changes made by other tabs
   * Note: For Supabase implementation, this is a no-op since data is always fresh
   */
  reload(): void {
    console.debug('WebRTCSignalingStoreSupabase: Reload called');
    // No-op for Supabase since data is always fresh from the database
  }
}
