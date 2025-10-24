import { type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { type RepositoryCollaborator } from '@common/types';
import { type RepositoryCollaboratorChanges } from './RepositoryCollaboratorChanges';
import { type CodeShareEventEmitter } from '../events';


/**
 * Supabase implementation for listening to repository collaborator changes
 * Uses a single channel to listen for INSERT, UPDATE, and DELETE operations
 */
export class RepositoryCollaboratorChangesSupabase implements RepositoryCollaboratorChanges {
  private supabaseClient: SupabaseClient;
  private eventEmitter: CodeShareEventEmitter;
  private profileId?: string;
  private channel: RealtimeChannel | null = null;
  private readonly tableName: string = 'repository_collaborators';

  constructor(
    supabaseClient: SupabaseClient,
    eventEmitter: CodeShareEventEmitter,
  ) {
    if (!supabaseClient) {
      throw new Error('RepositoryCollaboratorChangesSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('RepositoryCollaboratorChangesSupabase: eventEmitter is required');
    }

    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Starts listening for repository collaborator changes
   * Sets up a realtime subscription for the profile's collaborators
   * @param profileId - The profile ID (customer or engineer) to filter updates for
   */
  async start(profileId: string): Promise<void> {
    console.debug(`RepositoryCollaboratorChangesSupabase: start(${profileId})`);
    if (!profileId) {
      throw new Error('RepositoryCollaboratorChangesSupabase: profileId is required');
    }
    this.profileId = profileId;

    if (this.channel) {
      console.debug('RepositoryCollaboratorChangesSupabase: Already listening for changes');
      return;
    }

    console.debug(`RepositoryCollaboratorChangesSupabase: Starting listener for profile ${this.profileId}`);

    // Set auth for realtime authorization
    const session = await this.supabaseClient.auth.getSession();
    await this.supabaseClient.realtime.setAuth(session.data.session?.access_token ?? null);

    // Subscribe to repository collaborator broadcast channel for this profile
    // The trigger broadcasts to both customer and engineer channels
    this.channel = this.supabaseClient
      .channel(`repository-collaborators-${profileId}`, {
        config: { private: true },
      })
      .on('broadcast', { event: 'INSERT' }, (payload) => {
        console.debug('RepositoryCollaboratorChangesSupabase: Collaborator created:', payload);
        this.handleCollaboratorInsert(payload.payload.record as Record<string, unknown>);
      })
      .on('broadcast', { event: 'UPDATE' }, (payload) => {
        console.debug('RepositoryCollaboratorChangesSupabase: Collaborator updated:', payload);
        this.handleCollaboratorUpdate(payload.payload.record as Record<string, unknown>);
      })
      .on('broadcast', { event: 'DELETE' }, (payload) => {
        console.debug('RepositoryCollaboratorChangesSupabase: Collaborator deleted:', payload);
        this.handleCollaboratorDelete(payload.payload.old_record as Record<string, unknown>);
      })
      .subscribe((status, error) => {
        console.debug('RepositoryCollaboratorChangesSupabase: Channel status:', status, ' error:', error);
      });
  }

  /**
   * Stops listening for repository collaborator changes
   * Unsubscribes from the Realtime channel
   */
  stop(): void {
    console.debug('RepositoryCollaboratorChangesSupabase: Stopping listener');

    if (this.channel) {
      this.supabaseClient.removeChannel(this.channel);
      this.channel = null;
    }
  }

  /**
   * Handles collaborator insert events
   * Maps the database row to a RepositoryCollaborator and emits the appropriate event
   */
  private handleCollaboratorInsert(row: Record<string, unknown>): void {
    try {
      const collaborator = this.mapRowToCollaborator(row);
      this.eventEmitter.emitRepositoryCollaboratorCreated(collaborator);
    } catch (error) {
      console.error('RepositoryCollaboratorChangesSupabase: Error handling collaborator insert:', error);
    }
  }

  /**
   * Handles collaborator update events
   * Maps the database row to a RepositoryCollaborator and emits the appropriate event
   */
  private handleCollaboratorUpdate(row: Record<string, unknown>): void {
    try {
      const collaborator = this.mapRowToCollaborator(row);
      this.eventEmitter.emitRepositoryCollaboratorUpdated(collaborator);
    } catch (error) {
      console.error('RepositoryCollaboratorChangesSupabase: Error handling collaborator update:', error);
    }
  }

  /**
   * Handles collaborator delete events
   * Emits the appropriate event with the collaborator ID and engineer ID
   */
  private handleCollaboratorDelete(row: Record<string, unknown>): void {
    try {
      console.debug('RepositoryCollaboratorChangesSupabase: handleCollaboratorDelete row:', row);
      const collaboratorId = row.id as string;
      const engineerId = row.engineer_id as string;
      console.debug('RepositoryCollaboratorChangesSupabase: Extracted collaboratorId:', collaboratorId, 'engineerId:', engineerId);
      if (!collaboratorId) {
        throw new Error('Collaborator ID is required for delete event');
      }
      if (!engineerId) {
        throw new Error('Engineer ID is required for delete event');
      }
      this.eventEmitter.emitRepositoryCollaboratorDeleted(collaboratorId, engineerId);
    } catch (error) {
      console.error('RepositoryCollaboratorChangesSupabase: Error handling collaborator delete:', error);
    }
  }

  /**
   * Maps a database row to a RepositoryCollaborator object
   */
  private mapRowToCollaborator(row: Record<string, unknown>): RepositoryCollaborator {
    return {
      id: row.id as string,
      ticketId: row.ticket_id as string,
      repositoryId: row.repository_id as string,
      engineerId: row.engineer_id as string,
      githubUsername: row.github_username as string,
      invitedAt: new Date(row.invited_at as string),
      removedAt: row.removed_at ? new Date(row.removed_at as string) : undefined,
    };
  }
}
