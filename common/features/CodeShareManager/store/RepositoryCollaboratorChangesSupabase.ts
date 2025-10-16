import { type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { type RepositoryCollaborator } from '@common/types';
import { type RepositoryCollaboratorChanges } from './RepositoryCollaboratorChanges';

/**
 * Event emitter interface for repository collaborator events
 */
export interface RepositoryCollaboratorEventEmitter {
  emitRepositoryCollaboratorCreated(collaborator: RepositoryCollaborator): void;
  emitRepositoryCollaboratorUpdated(collaborator: RepositoryCollaborator): void;
  emitRepositoryCollaboratorDeleted(collaboratorId: string): void;
}

/**
 * Supabase implementation for listening to repository collaborator changes
 * Uses a single channel to listen for INSERT, UPDATE, and DELETE operations
 */
export class RepositoryCollaboratorChangesSupabase implements RepositoryCollaboratorChanges {
  private supabaseClient: SupabaseClient;
  private eventEmitter: RepositoryCollaboratorEventEmitter;
  private customerId?: string;
  private channel: RealtimeChannel | null = null;
  private readonly tableName: string = 'repository_collaborators';

  constructor(
    supabaseClient: SupabaseClient,
    eventEmitter: RepositoryCollaboratorEventEmitter,
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
   * Sets up a realtime subscription for the customer's collaborators
   * @param customerId - The customer ID to filter updates for
   */
  async start(customerId: string): Promise<void> {
    console.debug(`RepositoryCollaboratorChangesSupabase: start(${customerId})`);
    if (!customerId) {
      throw new Error('RepositoryCollaboratorChangesSupabase: customerId is required');
    }
    this.customerId = customerId;

    if (this.channel) {
      console.debug('RepositoryCollaboratorChangesSupabase: Already listening for changes');
      return;
    }

    console.debug(`RepositoryCollaboratorChangesSupabase: Starting listener for customer ${this.customerId}`);

    // Set auth for realtime authorization
    const session = await this.supabaseClient.auth.getSession();
    await this.supabaseClient.realtime.setAuth(session.data.session?.access_token ?? null);

    // Subscribe to repository collaborator changes for this customer
    this.channel = this.supabaseClient
      .channel(`repository-collaborators-${customerId}`, {
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
          console.debug('RepositoryCollaboratorChangesSupabase: Collaborator created:', payload);
          this.handleCollaboratorInsert(payload.new as Record<string, unknown>);
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
          console.debug('RepositoryCollaboratorChangesSupabase: Collaborator updated:', payload);
          this.handleCollaboratorUpdate(payload.new as Record<string, unknown>);
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
          console.debug('RepositoryCollaboratorChangesSupabase: Collaborator deleted:', payload);
          this.handleCollaboratorDelete(payload.old as Record<string, unknown>);
        }
      )
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
   * Emits the appropriate event with the collaborator ID
   */
  private handleCollaboratorDelete(row: Record<string, unknown>): void {
    try {
      const collaboratorId = row.id as string;
      if (!collaboratorId) {
        throw new Error('Collaborator ID is required for delete event');
      }
      this.eventEmitter.emitRepositoryCollaboratorDeleted(collaboratorId);
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
