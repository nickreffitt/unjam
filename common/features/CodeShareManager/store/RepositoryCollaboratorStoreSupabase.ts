import { type SupabaseClient } from '@supabase/supabase-js';
import { type RepositoryCollaborator } from '@common/types';
import { type RepositoryCollaboratorStore } from './RepositoryCollaboratorStore';
import { GitHubSupabaseRowMapper } from '../util/GitHubSupabaseRowMapper';

/**
 * Supabase implementation of the repository collaborator store
 * Read-only frontend store - all mutations handled via CodeShareApiManager
 * Uses Supabase PostgreSQL database for queries with row-level security
 */
export class RepositoryCollaboratorStoreSupabase implements RepositoryCollaboratorStore {
  private supabaseClient: SupabaseClient;
  private readonly tableName: string = 'repository_collaborators';

  constructor(supabaseClient: SupabaseClient) {
    if (!supabaseClient) {
      throw new Error('RepositoryCollaboratorStoreSupabase: supabaseClient is required');
    }
    this.supabaseClient = supabaseClient;
    console.debug('RepositoryCollaboratorStoreSupabase: Initialized');
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
      throw new Error(`Failed to get repository collaborator by ID: ${error.message}`);
    }

    return data ? GitHubSupabaseRowMapper.mapRowToRepositoryCollaborator(data) : null;
  }

  /**
   * Gets a collaborator by repository ID and engineer ID
   * @param repositoryId - The repository ID
   * @param engineerId - The engineer ID
   * @returns The repository collaborator if found, null otherwise
   */
  async getByRepositoryAndEngineer(repositoryId: string, engineerId: string): Promise<RepositoryCollaborator | null> {
    console.debug('RepositoryCollaboratorStoreSupabase: Getting collaborator for repository:', repositoryId, 'engineer:', engineerId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('repository_id', repositoryId)
      .eq('engineer_id', engineerId)
      .maybeSingle();

    if (error) {
      console.error('RepositoryCollaboratorStoreSupabase: Get by repository and engineer failed:', error);
      throw new Error(`Failed to get repository collaborator: ${error.message}`);
    }

    console.debug('RepositoryCollaboratorStoreSupabase: ', data)

    return data ? GitHubSupabaseRowMapper.mapRowToRepositoryCollaborator(data) : null;
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
      throw new Error(`Failed to get active repository collaborators by repository ID: ${error.message}`);
    }

    return data.map(row => GitHubSupabaseRowMapper.mapRowToRepositoryCollaborator(row));
  }

  /**
   * Reloads collaborators from storage
   * No-op for Supabase implementation as queries are always fresh
   */
  reload(): void {
    // No-op - Supabase queries are always fresh
    console.debug('RepositoryCollaboratorStoreSupabase: Reload called (no-op)');
  }
}
