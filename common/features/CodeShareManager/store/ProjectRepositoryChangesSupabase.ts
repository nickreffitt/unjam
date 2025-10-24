import { type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { type ProjectRepository } from '@common/types';
import { type ProjectRepositoryChanges } from './ProjectRepositoryChanges';

/**
 * Event emitter interface for project repository events
 */
export interface ProjectRepositoryEventEmitter {
  emitProjectRepositoryCreated(repository: ProjectRepository): void;
  emitProjectRepositoryUpdated(repository: ProjectRepository): void;
  emitProjectRepositoryDeleted(repositoryId: string): void;
}

/**
 * Supabase implementation for listening to project repository changes
 * Uses a single channel to listen for INSERT, UPDATE, and DELETE operations
 */
export class ProjectRepositoryChangesSupabase implements ProjectRepositoryChanges {
  private supabaseClient: SupabaseClient;
  private eventEmitter: ProjectRepositoryEventEmitter;
  private profileId?: string;
  private channel: RealtimeChannel | null = null;
  private readonly tableName: string = 'project_repositories';

  constructor(
    supabaseClient: SupabaseClient,
    eventEmitter: ProjectRepositoryEventEmitter,
  ) {
    if (!supabaseClient) {
      throw new Error('ProjectRepositoryChangesSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('ProjectRepositoryChangesSupabase: eventEmitter is required');
    }

    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Starts listening for project repository changes
   * Sets up a realtime subscription for the profile's repositories
   * @param profileId - The profile ID (customer or engineer) to filter updates for
   */
  async start(profileId: string): Promise<void> {
    console.debug(`ProjectRepositoryChangesSupabase: start(${profileId})`);
    if (!profileId) {
      throw new Error('ProjectRepositoryChangesSupabase: profileId is required');
    }
    this.profileId = profileId;

    if (this.channel) {
      console.debug('ProjectRepositoryChangesSupabase: Already listening for changes');
      return;
    }

    console.debug(`ProjectRepositoryChangesSupabase: Starting listener for profile ${this.profileId}`);

    // Set auth for realtime authorization
    const session = await this.supabaseClient.auth.getSession();
    await this.supabaseClient.realtime.setAuth(session.data.session?.access_token ?? null);

    // Subscribe to project repository broadcast channel for this profile
    // The trigger broadcasts to both customer and engineer (collaborator) channels
    this.channel = this.supabaseClient
      .channel(`project-repositories-${profileId}`, {
        config: { private: true },
      })
      .on('broadcast', { event: 'INSERT' }, (payload) => {
        console.debug('ProjectRepositoryChangesSupabase: Repository created:', payload);
        const record = payload.payload.record as Record<string, unknown>;
        this.handleRepositoryInsert(record);
      })
      .on('broadcast', { event: 'UPDATE' }, (payload) => {
        console.debug('ProjectRepositoryChangesSupabase: Repository updated:', payload);
        const record = payload.payload.record as Record<string, unknown>;
        this.handleRepositoryUpdate(record);
      })
      .on('broadcast', { event: 'DELETE' }, (payload) => {
        console.debug('ProjectRepositoryChangesSupabase: Repository deleted:', payload);
        const record = payload.payload.old_record as Record<string, unknown>;
        this.handleRepositoryDelete(record);
      })
      .subscribe((status, error) => {
        console.debug('ProjectRepositoryChangesSupabase: Channel status:', status, ' error:', error);
      });
  }

  /**
   * Stops listening for project repository changes
   * Unsubscribes from the Realtime channel
   */
  stop(): void {
    console.debug('ProjectRepositoryChangesSupabase: Stopping listener');

    if (this.channel) {
      this.supabaseClient.removeChannel(this.channel);
      this.channel = null;
    }
  }

  /**
   * Handles repository insert events
   * Maps the database row to a ProjectRepository and emits the appropriate event
   */
  private handleRepositoryInsert(row: Record<string, unknown>): void {
    try {
      const repository = this.mapRowToRepository(row);
      this.eventEmitter.emitProjectRepositoryCreated(repository);
    } catch (error) {
      console.error('ProjectRepositoryChangesSupabase: Error handling repository insert:', error);
    }
  }

  /**
   * Handles repository update events
   * Maps the database row to a ProjectRepository and emits the appropriate event
   */
  private handleRepositoryUpdate(row: Record<string, unknown>): void {
    try {
      const repository = this.mapRowToRepository(row);
      this.eventEmitter.emitProjectRepositoryUpdated(repository);
    } catch (error) {
      console.error('ProjectRepositoryChangesSupabase: Error handling repository update:', error);
    }
  }

  /**
   * Handles repository delete events
   * Emits the appropriate event with the repository ID
   */
  private handleRepositoryDelete(row: Record<string, unknown>): void {
    try {
      const repositoryId = row.id as string;
      if (!repositoryId) {
        throw new Error('Repository ID is required for delete event');
      }
      this.eventEmitter.emitProjectRepositoryDeleted(repositoryId);
    } catch (error) {
      console.error('ProjectRepositoryChangesSupabase: Error handling repository delete:', error);
    }
  }

  /**
   * Maps a database row to a ProjectRepository object
   */
  private mapRowToRepository(row: Record<string, unknown>): ProjectRepository {
    return {
      id: row.id as string,
      customerId: row.customer_id as string,
      externalProjectUrl: row.external_project_url as string,
      externalPlatform: row.external_platform as string,
      externalProjectId: row.external_project_id as string,
      githubRepoUrl: row.github_repo_url as string,
      githubOwner: row.github_owner as string,
      githubRepo: row.github_repo as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
