import { type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { type GitHubIntegration } from '@common/types';
import { type GitHubIntegrationChanges } from './GitHubIntegrationChanges';

/**
 * Event emitter interface for GitHub integration events
 */
export interface GitHubIntegrationEventEmitter {
  emitGitHubIntegrationCreated(integration: GitHubIntegration): void;
  emitGitHubIntegrationUpdated(integration: GitHubIntegration): void;
  emitGitHubIntegrationDeleted(integrationId: string): void;
}

/**
 * Supabase implementation for listening to GitHub integration changes
 * Uses a single channel to listen for INSERT, UPDATE, and DELETE operations
 */
export class GitHubIntegrationChangesSupabase implements GitHubIntegrationChanges {
  private supabaseClient: SupabaseClient;
  private eventEmitter: GitHubIntegrationEventEmitter;
  private customerId?: string;
  private channel: RealtimeChannel | null = null;
  private readonly tableName: string = 'github_integrations';

  constructor(
    supabaseClient: SupabaseClient,
    eventEmitter: GitHubIntegrationEventEmitter,
  ) {
    if (!supabaseClient) {
      throw new Error('GitHubIntegrationChangesSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('GitHubIntegrationChangesSupabase: eventEmitter is required');
    }

    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Starts listening for GitHub integration changes
   * Sets up a realtime subscription for the customer's integration
   * @param customerId - The customer ID to filter updates for
   */
  async start(customerId: string): Promise<void> {
    console.debug(`GitHubIntegrationChangesSupabase: start(${customerId})`);
    if (!customerId) {
      throw new Error('GitHubIntegrationChangesSupabase: customerId is required');
    }
    this.customerId = customerId;

    if (this.channel) {
      console.debug('GitHubIntegrationChangesSupabase: Already listening for changes');
      return;
    }

    console.debug(`GitHubIntegrationChangesSupabase: Starting listener for customer ${this.customerId}`);

    // Set auth for realtime authorization
    const session = await this.supabaseClient.auth.getSession();
    await this.supabaseClient.realtime.setAuth(session.data.session?.access_token ?? null);

    // Subscribe to GitHub integration changes for this customer
    this.channel = this.supabaseClient
      .channel(`github-integration-${customerId}`, {
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
          console.debug('GitHubIntegrationChangesSupabase: Integration created:', payload);
          this.handleIntegrationInsert(payload.new as Record<string, unknown>);
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
          console.debug('GitHubIntegrationChangesSupabase: Integration updated:', payload);
          this.handleIntegrationUpdate(payload.new as Record<string, unknown>);
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
          console.debug('GitHubIntegrationChangesSupabase: Integration deleted:', payload);
          this.handleIntegrationDelete(payload.old as Record<string, unknown>);
        }
      )
      .subscribe((status, error) => {
        console.debug('GitHubIntegrationChangesSupabase: Channel status:', status, ' error:', error);
      });
  }

  /**
   * Stops listening for GitHub integration changes
   * Unsubscribes from the Realtime channel
   */
  stop(): void {
    console.debug('GitHubIntegrationChangesSupabase: Stopping listener');

    if (this.channel) {
      this.supabaseClient.removeChannel(this.channel);
      this.channel = null;
    }
  }

  /**
   * Handles integration insert events
   * Maps the database row to a GitHubIntegration and emits the appropriate event
   */
  private handleIntegrationInsert(row: Record<string, unknown>): void {
    try {
      const integration = this.mapRowToIntegration(row);
      this.eventEmitter.emitGitHubIntegrationCreated(integration);
    } catch (error) {
      console.error('GitHubIntegrationChangesSupabase: Error handling integration insert:', error);
    }
  }

  /**
   * Handles integration update events
   * Maps the database row to a GitHubIntegration and emits the appropriate event
   */
  private handleIntegrationUpdate(row: Record<string, unknown>): void {
    try {
      const integration = this.mapRowToIntegration(row);
      this.eventEmitter.emitGitHubIntegrationUpdated(integration);
    } catch (error) {
      console.error('GitHubIntegrationChangesSupabase: Error handling integration update:', error);
    }
  }

  /**
   * Handles integration delete events
   * Emits the appropriate event with the integration ID
   */
  private handleIntegrationDelete(row: Record<string, unknown>): void {
    try {
      const integrationId = row.id as string;
      if (!integrationId) {
        throw new Error('Integration ID is required for delete event');
      }
      this.eventEmitter.emitGitHubIntegrationDeleted(integrationId);
    } catch (error) {
      console.error('GitHubIntegrationChangesSupabase: Error handling integration delete:', error);
    }
  }

  /**
   * Maps a database row to a GitHubIntegration object
   */
  private mapRowToIntegration(row: Record<string, unknown>): GitHubIntegration {
    return {
      id: row.id as string,
      customerId: row.customer_id as string,
      githubAccessToken: row.github_access_token as string,
      githubUsername: row.github_username as string,
      githubUserId: row.github_user_id as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
