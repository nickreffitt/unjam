import { type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { type AuthEventEmitter } from '../events/AuthEventEmitter';
import { AuthSupabaseRowMapper } from '../util/AuthSupabaseRowMapper';
import { type AuthUser } from '@common/types';
import { type AuthChanges } from './AuthChanges';

/**
 * Supabase implementation for listening to profile changes
 * Uses Supabase Postgres Changes with RLS filtering to emit events when the user's profile is updated
 * Server-side filtering ensures users only receive updates for their own profile
 */
export class AuthChangesSupabase implements AuthChanges {
  private supabaseClient: SupabaseClient;
  private eventEmitter: AuthEventEmitter;
  private profileId?: string;
  private channel: RealtimeChannel | null = null;
  private readonly tableName: string = 'profiles';

  constructor(
    supabaseClient: SupabaseClient,
    eventEmitter: AuthEventEmitter,
  ) {
    if (!supabaseClient) {
      throw new Error('AuthChangesSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('AuthChangesSupabase: eventEmitter is required');
    }

    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Starts listening for profile updates
   * Sets up Supabase Postgres Changes subscription for UPDATE events
   * Uses RLS to automatically filter for the authenticated user's profile only
   * @param profileId - The profile ID to filter updates for
   */
  start(profileId: string): void {
    console.debug(`AuthChangesSupabase: start(${profileId}) Call stack:`, new Error().stack);
    if (!profileId) {
      throw new Error('AuthChangesSupabase: profileId is required');
    }
    this.profileId = profileId;

    if (this.channel) {
      console.debug('AuthChangesSupabase: Already listening for changes');
      return;
    }

    console.debug(`AuthChangesSupabase: Starting profile changes listener for profile ${this.profileId}`);

    this.channel = this.supabaseClient
      .channel(`profile-changes-${this.profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: this.tableName,
          filter: `id=eq.${this.profileId}`,
        },
        (payload) => {
          console.debug('AuthChangesSupabase: Profile updated:', payload);
          this.handleProfileUpdate(payload.new);
        }
      )
      .subscribe((status) => {
        console.debug('AuthChangesSupabase: Subscription status:', status);
      });
  }

  /**
   * Stops listening for profile updates
   * Unsubscribes from Supabase Postgres Changes
   */
  stop(): void {
    console.debug('AuthChangesSupabase: Stopping profile changes listener');

    if (this.channel) {
      this.supabaseClient.removeChannel(this.channel);
      this.channel = null;
    }
  }

  /**
   * Handles profile update events
   * Maps the database row to a UserProfile and emits the appropriate event
   */
  private async handleProfileUpdate(row: Record<string, unknown>): Promise<void> {
    try {
      const profile = AuthSupabaseRowMapper.mapRowToProfile(row);

      // Get current user from Supabase session
      const { data: { user: supabaseUser } } = await this.supabaseClient.auth.getUser();

      if (!supabaseUser) {
        console.warn('AuthChangesSupabase: No authenticated user found when handling profile update');
        return;
      }

      // Map Supabase user to our User type
      const user = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        createdAt: new Date(supabaseUser.created_at),
      };

      // Create complete AuthUser with both user and profile
      const authUser: AuthUser = {
        status: 'signed-in',
        user,
        profile,
      };

      this.eventEmitter.emitUserProfileUpdated(authUser);
    } catch (error) {
      console.error('AuthChangesSupabase: Error handling profile update:', error);
    }
  }
}
