import { type SupabaseClient } from '@supabase/supabase-js';
import { type ProjectRepository } from '@common/types';
import { type ProjectRepositoryStore } from './ProjectRepositoryStore';
import { GitHubSupabaseRowMapper } from '../util/GitHubSupabaseRowMapper';

/**
 * Supabase implementation of the project repository store
 * Frontend store handles queries and creation - mutations via CodeShareApiManager
 * Uses Supabase PostgreSQL database with row-level security
 */
export class ProjectRepositoryStoreSupabase implements ProjectRepositoryStore {
  private supabaseClient: SupabaseClient;
  private readonly tableName: string = 'project_repositories';

  constructor(supabaseClient: SupabaseClient) {
    if (!supabaseClient) {
      throw new Error('ProjectRepositoryStoreSupabase: supabaseClient is required');
    }
    this.supabaseClient = supabaseClient;
    console.debug('ProjectRepositoryStoreSupabase: Initialized');
  }
  
  /**
   * Creates a new project repository mapping
   * @param repository - The repository to create
   * @returns The created repository with generated ID
   */
  async create(repository: ProjectRepository): Promise<ProjectRepository> {
    console.debug('ProjectRepositoryStoreSupabase: Creating repository:', repository);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .insert({
        customer_id: repository.customerId,
        external_project_url: repository.externalProjectUrl,
        external_platform: repository.externalPlatform,
        external_project_id: repository.externalProjectId,
        github_repo_url: repository.githubRepoUrl,
        github_owner: repository.githubOwner,
        github_repo: repository.githubRepo
      })
      .select()
      .single();

    if (error) {
      console.error('ProjectRepositoryStoreSupabase: Create failed:', error);
      throw new Error(`Failed to create project repository: ${error.message}`);
    }

    return GitHubSupabaseRowMapper.mapRowToProjectRepository(data);
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
      throw new Error(`Failed to get project repository by ID: ${error.message}`);
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
    console.debug('ProjectRepositoryStoreSupabase: Getting repository for customer:', customerId, 'url:', externalProjectUrl);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('customer_id', customerId)
      .eq('external_project_url', externalProjectUrl)
      .maybeSingle();

    if (error) {
      console.error('ProjectRepositoryStoreSupabase: Get by customer and external URL failed:', error);
      throw new Error(`Failed to get project repository by customer and external URL: ${error.message}`);
    }

    return data ? GitHubSupabaseRowMapper.mapRowToProjectRepository(data) : null;
  }

  /**
   * Gets a project repository by GitHub owner and repository name
   * @param owner - The GitHub repository owner
   * @param repo - The GitHub repository name
   * @returns The project repository if found, null otherwise
   */
  async getByGitHubRepo(owner: string, repo: string): Promise<ProjectRepository | null> {
    console.debug('ProjectRepositoryStoreSupabase: Getting repository by GitHub owner/repo:', owner, repo);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('github_owner', owner)
      .eq('github_repo', repo)
      .maybeSingle();

    if (error) {
      console.error('ProjectRepositoryStoreSupabase: Get by GitHub repo failed:', error);
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
      throw new Error(`Failed to get project repositories by customer ID: ${error.message}`);
    }

    return data.map(row => GitHubSupabaseRowMapper.mapRowToProjectRepository(row));
  }

  /**
   * Creates or updates a project repository mapping
   * @param repository - The repository data
   * @returns The created/updated project repository
   */
  async upsert(repository: Omit<ProjectRepository, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectRepository> {
    console.debug('ProjectRepositoryStoreSupabase: Upserting repository:', repository);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .upsert(
        {
          customer_id: repository.customerId,
          external_project_url: repository.externalProjectUrl,
          external_platform: repository.externalPlatform,
          external_project_id: repository.externalProjectId,
          github_repo_url: repository.githubRepoUrl,
          github_owner: repository.githubOwner,
          github_repo: repository.githubRepo
        },
        {
          onConflict: 'customer_id,external_project_url',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();

    if (error) {
      console.error('ProjectRepositoryStoreSupabase: Upsert failed:', error);
      throw new Error(`Failed to upsert project repository: ${error.message}`);
    }

    return GitHubSupabaseRowMapper.mapRowToProjectRepository(data);
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
  }

  /**
   * Reloads repositories from storage
   * No-op for Supabase implementation as queries are always fresh
   */
  reload(): void {
    // No-op - Supabase queries are always fresh
    console.debug('ProjectRepositoryStoreSupabase: Reload called (no-op)');
  }
}
