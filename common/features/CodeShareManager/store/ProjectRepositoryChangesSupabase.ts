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
  private customerId?: string;
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
   * Sets up a realtime subscription for the customer's repositories
   * @param customerId - The customer ID to filter updates for
   */
  async start(customerId: string): Promise<void> {
    console.debug(`ProjectRepositoryChangesSupabase: start(${customerId})`);
    if (!customerId) {
      throw new Error('ProjectRepositoryChangesSupabase: customerId is required');
    }
    this.customerId = customerId;

    if (this.channel) {
      console.debug('ProjectRepositoryChangesSupabase: Already listening for changes');
      return;
    }

    console.debug(`ProjectRepositoryChangesSupabase: Starting listener for customer ${this.customerId}`);

    // Set auth for realtime authorization
    const session = await this.supabaseClient.auth.getSession();
    await this.supabaseClient.realtime.setAuth(session.data.session?.access_token ?? null);

    // Subscribe to project repository changes for this customer
    this.channel = this.supabaseClient
      .channel(`project-repositories-${customerId}`, {
        config: { private: true },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: this.tableName,
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          console.debug('ProjectRepositoryChangesSupabase: Repository created:', payload);
          this.handleRepositoryInsert(payload.new as Record<string, unknown>);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: this.tableName,
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          console.debug('ProjectRepositoryChangesSupabase: Repository updated:', payload);
          this.handleRepositoryUpdate(payload.new as Record<string, unknown>);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: this.tableName,
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          console.debug('ProjectRepositoryChangesSupabase: Repository deleted:', payload);
          this.handleRepositoryDelete(payload.old as Record<string, unknown>);
        }
      )
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
