import { type SupabaseClient } from 'supabase';
import { type RepositoryCollaborator } from '@types';
import { type RepositoryCollaboratorStore } from './RepositoryCollaboratorStore.ts';
import { GitHubSupabaseRowMapper } from '@util/GitHubSupabaseRowMapper.ts';
import { type TablesInsert } from '@supabase-types';

/**
 * Supabase implementation of the repository collaborator store
 * Uses Supabase database for persistence with row-level security
 */
export class RepositoryCollaboratorStoreSupabase implements RepositoryCollaboratorStore {
  private supabaseClient: SupabaseClient;
  private readonly tableName: string = 'repository_collaborators';

  constructor(supabaseClient: SupabaseClient) {
    if (!supabaseClient) {
      throw new Error('RepositoryCollaboratorStoreSupabase: supabaseClient is required');
    }
    this.supabaseClient = supabaseClient;
  }

  /**
   * Gets a repository collaborator by ID
   * @param id - The collaborator ID
   * @returns The repository collaborator if found, null otherwise
   */
  async getById(id: string): Promise<RepositoryCollaborator | null> {
    console.debug('RepositoryCollaboratorStoreSupabase: Getting collaborator by ID:', id);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('RepositoryCollaboratorStoreSupabase: Get by ID failed:', error);
      throw new Error(`Failed to get repository collaborator: ${error.message}`);
    }

    return data ? GitHubSupabaseRowMapper.mapRowToRepositoryCollaborator(data) : null;
  }

  /**
   * Gets all collaborators for a ticket
   * @param ticketId - The ticket ID
   * @returns Array of repository collaborators
   */
  async getAllByTicketId(ticketId: string): Promise<RepositoryCollaborator[]> {
    console.debug('RepositoryCollaboratorStoreSupabase: Getting all collaborators for ticket:', ticketId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('ticket_id', ticketId)
      .order('invited_at', { ascending: false });

    if (error) {
      console.error('RepositoryCollaboratorStoreSupabase: Get all by ticket ID failed:', error);
      throw new Error(`Failed to get collaborators: ${error.message}`);
    }

    return data.map(row => GitHubSupabaseRowMapper.mapRowToRepositoryCollaborator(row));
  }

  /**
   * Gets all active (not removed) collaborators for a repository
   * @param repositoryId - The repository ID
   * @returns Array of active repository collaborators
   */
  async getActiveByRepositoryId(repositoryId: string): Promise<RepositoryCollaborator[]> {
    console.debug('RepositoryCollaboratorStoreSupabase: Getting active collaborators for repository:', repositoryId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('repository_id', repositoryId)
      .is('removed_at', null)
      .order('invited_at', { ascending: false });

    if (error) {
      console.error('RepositoryCollaboratorStoreSupabase: Get active by repository ID failed:', error);
      throw new Error(`Failed to get active collaborators: ${error.message}`);
    }

    return data.map(row => GitHubSupabaseRowMapper.mapRowToRepositoryCollaborator(row));
  }

  /**
   * Creates a new repository collaborator record
   * @param collaborator - The collaborator data
   * @returns The created repository collaborator
   */
  async create(collaborator: Omit<RepositoryCollaborator, 'id' | 'invitedAt' | 'removedAt'>): Promise<RepositoryCollaborator> {
    console.debug('RepositoryCollaboratorStoreSupabase: Creating collaborator for ticket:', collaborator.ticketId);

    const insertData: TablesInsert<'repository_collaborators'> = {
      ticket_id: collaborator.ticketId,
      repository_id: collaborator.repositoryId,
      engineer_id: collaborator.engineerId,
      github_username: collaborator.githubUsername,
    };

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('RepositoryCollaboratorStoreSupabase: Create failed:', error);
      throw new Error(`Failed to create repository collaborator: ${error.message}`);
    }

    const result = GitHubSupabaseRowMapper.mapRowToRepositoryCollaborator(data);
    console.debug('RepositoryCollaboratorStoreSupabase: Created collaborator successfully:', result.id);
    return result;
  }

  /**
   * Marks a collaborator as removed
   * @param id - The collaborator ID
   */
  async markRemoved(id: string): Promise<void> {
    console.debug('RepositoryCollaboratorStoreSupabase: Marking collaborator as removed:', id);

    const { error } = await this.supabaseClient
      .from(this.tableName)
      .update({ removed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('RepositoryCollaboratorStoreSupabase: Mark removed failed:', error);
      throw new Error(`Failed to mark collaborator as removed: ${error.message}`);
    }

    console.debug('RepositoryCollaboratorStoreSupabase: Marked collaborator as removed successfully');
  }

  /**
   * Deletes a repository collaborator by ID
   * @param id - The collaborator ID
   */
  async delete(id: string): Promise<void> {
    console.debug('RepositoryCollaboratorStoreSupabase: Deleting collaborator:', id);

    const { error } = await this.supabaseClient
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('RepositoryCollaboratorStoreSupabase: Delete failed:', error);
      throw new Error(`Failed to delete repository collaborator: ${error.message}`);
    }

    console.debug('RepositoryCollaboratorStoreSupabase: Deleted collaborator successfully');
  }
}
