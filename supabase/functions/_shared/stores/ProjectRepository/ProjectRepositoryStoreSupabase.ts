import { type SupabaseClient } from 'supabase';
import { type ProjectRepository } from '@types';
import { type ProjectRepositoryStore } from './ProjectRepositoryStore.ts';
import { GitHubSupabaseRowMapper } from '@util/GitHubSupabaseRowMapper.ts';
import { type TablesInsert } from '@supabase-types';

/**
 * Supabase implementation of the project repository store
 * Uses Supabase database for persistence with row-level security
 */
export class ProjectRepositoryStoreSupabase implements ProjectRepositoryStore {
  private supabaseClient: SupabaseClient;
  private readonly tableName: string = 'project_repositories';

  constructor(supabaseClient: SupabaseClient) {
    if (!supabaseClient) {
      throw new Error('ProjectRepositoryStoreSupabase: supabaseClient is required');
    }
    this.supabaseClient = supabaseClient;
  }

  /**
   * Gets a project repository by ID
   * @param id - The repository ID
   * @returns The project repository if found, null otherwise
   */
  async getById(id: string): Promise<ProjectRepository | null> {
    console.debug('ProjectRepositoryStoreSupabase: Getting repository by ID:', id);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('ProjectRepositoryStoreSupabase: Get by ID failed:', error);
      throw new Error(`Failed to get project repository: ${error.message}`);
    }

    return data ? GitHubSupabaseRowMapper.mapRowToProjectRepository(data) : null;
  }

  /**
   * Gets a project repository by customer ID and external project URL
   * @param customerId - The customer profile ID
   * @param externalProjectUrl - The external project URL
   * @returns The project repository if found, null otherwise
   */
  async getByCustomerAndExternalUrl(customerId: string, externalProjectUrl: string): Promise<ProjectRepository | null> {
    console.debug('ProjectRepositoryStoreSupabase: Getting repository for customer:', customerId, 'and URL:', externalProjectUrl);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('customer_id', customerId)
      .eq('external_project_url', externalProjectUrl)
      .maybeSingle();

    if (error) {
      console.error('ProjectRepositoryStoreSupabase: Get by customer and URL failed:', error);
      throw new Error(`Failed to get project repository: ${error.message}`);
    }

    return data ? GitHubSupabaseRowMapper.mapRowToProjectRepository(data) : null;
  }

  /**
   * Gets all repositories for a customer
   * @param customerId - The customer profile ID
   * @returns Array of project repositories
   */
  async getAllByCustomerId(customerId: string): Promise<ProjectRepository[]> {
    console.debug('ProjectRepositoryStoreSupabase: Getting all repositories for customer:', customerId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('ProjectRepositoryStoreSupabase: Get all by customer ID failed:', error);
      throw new Error(`Failed to get repositories: ${error.message}`);
    }

    return data.map(row => GitHubSupabaseRowMapper.mapRowToProjectRepository(row));
  }

  /**
   * Creates or updates a project repository mapping
   * @param repository - The repository data
   * @returns The created/updated project repository
   */
  async upsert(repository: Omit<ProjectRepository, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectRepository> {
    console.debug('ProjectRepositoryStoreSupabase: Upserting repository for customer:', repository.customerId);

    const insertData: TablesInsert<'project_repositories'> = {
      customer_id: repository.customerId,
      external_project_url: repository.externalProjectUrl,
      external_platform: repository.externalPlatform,
      external_project_id: repository.externalProjectId,
      github_repo_url: repository.githubRepoUrl,
      github_owner: repository.githubOwner,
      github_repo: repository.githubRepo,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .upsert(insertData, {
        onConflict: 'customer_id,external_project_url'
      })
      .select()
      .single();

    if (error) {
      console.error('ProjectRepositoryStoreSupabase: Upsert failed:', error);
      throw new Error(`Failed to upsert project repository: ${error.message}`);
    }

    const result = GitHubSupabaseRowMapper.mapRowToProjectRepository(data);
    console.debug('ProjectRepositoryStoreSupabase: Upserted repository successfully:', result.id);
    return result;
  }

  /**
   * Deletes a project repository by ID
   * @param id - The repository ID
   */
  async delete(id: string): Promise<void> {
    console.debug('ProjectRepositoryStoreSupabase: Deleting repository:', id);

    const { error } = await this.supabaseClient
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('ProjectRepositoryStoreSupabase: Delete failed:', error);
      throw new Error(`Failed to delete project repository: ${error.message}`);
    }

    console.debug('ProjectRepositoryStoreSupabase: Deleted repository successfully');
  }
}
