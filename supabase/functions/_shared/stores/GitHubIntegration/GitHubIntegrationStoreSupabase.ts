import { type SupabaseClient } from 'supabase';
import { type GitHubIntegration } from '@types';
import { type GitHubIntegrationStore } from './GitHubIntegrationStore.ts';
import { GitHubSupabaseRowMapper } from '@util/GitHubSupabaseRowMapper.ts';
import { type TablesInsert } from '@supabase-types';

/**
 * Supabase implementation of the GitHub integration store
 * Uses Supabase database for persistence with row-level security
 */
export class GitHubIntegrationStoreSupabase implements GitHubIntegrationStore {
  private supabaseClient: SupabaseClient;
  private readonly tableName: string = 'github_integrations';

  constructor(supabaseClient: SupabaseClient) {
    if (!supabaseClient) {
      throw new Error('GitHubIntegrationStoreSupabase: supabaseClient is required');
    }
    this.supabaseClient = supabaseClient;
  }

  /**
   * Gets a GitHub integration by customer ID
   * @param customerId - The customer profile ID
   * @returns The GitHub integration if found, null otherwise
   */
  async getByCustomerId(customerId: string): Promise<GitHubIntegration | null> {
    console.debug('GitHubIntegrationStoreSupabase: Getting integration for customer:', customerId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (error) {
      console.error('GitHubIntegrationStoreSupabase: Get by customer ID failed:', error);
      throw new Error(`Failed to get GitHub integration: ${error.message}`);
    }

    return data ? GitHubSupabaseRowMapper.mapRowToGitHubIntegration(data) : null;
  }

  /**
   * Creates or updates a GitHub integration
   * @param integration - The GitHub integration data
   * @returns The created/updated GitHub integration
   */
  async upsert(integration: Omit<GitHubIntegration, 'id' | 'createdAt' | 'updatedAt'>): Promise<GitHubIntegration> {
    console.debug('GitHubIntegrationStoreSupabase: Upserting integration for customer:', integration.customerId);

    const insertData: TablesInsert<'github_integrations'> = {
      customer_id: integration.customerId,
      github_access_token: integration.githubAccessToken,
      github_username: integration.githubUsername,
      github_user_id: integration.githubUserId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .upsert(insertData, {
        onConflict: 'customer_id'
      })
      .select()
      .single();

    if (error) {
      console.error('GitHubIntegrationStoreSupabase: Upsert failed:', error);
      throw new Error(`Failed to upsert GitHub integration: ${error.message}`);
    }

    const result = GitHubSupabaseRowMapper.mapRowToGitHubIntegration(data);
    console.debug('GitHubIntegrationStoreSupabase: Upserted integration successfully:', result.id);
    return result;
  }

  /**
   * Deletes a GitHub integration by customer ID
   * @param customerId - The customer profile ID
   */
  async delete(customerId: string): Promise<void> {
    console.debug('GitHubIntegrationStoreSupabase: Deleting integration for customer:', customerId);

    const { error } = await this.supabaseClient
      .from(this.tableName)
      .delete()
      .eq('customer_id', customerId);

    if (error) {
      console.error('GitHubIntegrationStoreSupabase: Delete failed:', error);
      throw new Error(`Failed to delete GitHub integration: ${error.message}`);
    }

    console.debug('GitHubIntegrationStoreSupabase: Deleted integration successfully');
  }
}
