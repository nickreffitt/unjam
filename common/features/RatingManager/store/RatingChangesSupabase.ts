import { type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { type RatingEventEmitter } from '../events';
import { RatingSupabaseRowMapper } from '../util/RatingSupabaseRowMapper';
import { type RatingChanges } from './RatingChanges';

/**
 * Supabase implementation for listening to rating changes
 * Uses Realtime postgres_changes to listen for INSERT and UPDATE events on the ratings table
 */
export class RatingChangesSupabase implements RatingChanges {
  private supabaseClient: SupabaseClient;
  private eventEmitter: RatingEventEmitter;
  private ratingChannel: RealtimeChannel | null = null;
  private readonly tableName: string = 'ratings';

  constructor(
    supabaseClient: SupabaseClient,
    eventEmitter: RatingEventEmitter,
  ) {
    if (!supabaseClient) {
      throw new Error('RatingChangesSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('RatingChangesSupabase: eventEmitter is required');
    }
    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Starts listening for rating changes
   * Uses broadcast channel for INSERT and UPDATE events
   */
  async start(): Promise<void> {
    console.debug('RatingChangesSupabase: start()');

    if (this.ratingChannel) {
      console.debug('RatingChangesSupabase: Already listening for changes');
      return;
    }

    console.debug('RatingChangesSupabase: Starting rating changes listener');

    // Set auth for realtime authorization
    const session = await this.supabaseClient.auth.getSession();
    await this.supabaseClient.realtime.setAuth(session.data.session?.access_token ?? null);

    // Subscribe to ratings broadcast channel
    const channelName = 'ratings-changes';
    this.ratingChannel = this.supabaseClient
      .channel(channelName, {
        config: { private: true },
      })
      .on('broadcast', { event: 'INSERT' }, (payload) => {
        console.debug('RatingChangesSupabase: New rating created:', payload);
        this.handleRatingInsert(payload.payload.record);
      })
      .on('broadcast', { event: 'UPDATE' }, (payload) => {
        console.debug('RatingChangesSupabase: Rating updated:', payload);
        this.handleRatingUpdate(payload.payload.record);
      })
      .subscribe((status, error) => {
        console.debug('RatingChangesSupabase: Rating channel status:', status, 'error:', error);
      });
  }

  /**
   * Stops listening for rating changes
   * Unsubscribes from the Realtime channel
   */
  stop(): void {
    console.debug('RatingChangesSupabase: Stopping rating changes listener');

    if (this.ratingChannel) {
      this.supabaseClient.removeChannel(this.ratingChannel);
      this.ratingChannel = null;
    }
  }

  /**
   * Handles rating insert events
   * Fetches the complete rating with joined profile data and emits the appropriate event
   */
  private async handleRatingInsert(row: Record<string, unknown>): Promise<void> {
    try {
      // Fetch the complete rating with joined profile data
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select(`
          *,
          created_by_profile:profiles!ratings_created_by_fkey(*),
          rating_for_profile:profiles!ratings_rating_for_fkey(*)
        `)
        .eq('id', row.id)
        .single();

      if (error) {
        console.error('RatingChangesSupabase: Error fetching inserted rating:', error);
        return;
      }

      const rating = RatingSupabaseRowMapper.mapRowToRating(data);
      this.eventEmitter.emitRatingCreated(rating);
    } catch (error) {
      console.error('RatingChangesSupabase: Error handling rating insert:', error);
    }
  }

  /**
   * Handles rating update events
   * Fetches the complete rating with joined profile data and emits the appropriate event
   */
  private async handleRatingUpdate(row: Record<string, unknown>): Promise<void> {
    try {
      // Fetch the complete rating with joined profile data
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select(`
          *,
          created_by_profile:profiles!ratings_created_by_fkey(*),
          rating_for_profile:profiles!ratings_rating_for_fkey(*)
        `)
        .eq('id', row.id)
        .single();

      if (error) {
        console.error('RatingChangesSupabase: Error fetching updated rating:', error);
        return;
      }

      const rating = RatingSupabaseRowMapper.mapRowToRating(data);
      this.eventEmitter.emitRatingUpdated(rating);
    } catch (error) {
      console.error('RatingChangesSupabase: Error handling rating update:', error);
    }
  }
}
