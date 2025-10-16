import { type SupabaseClient } from '@supabase/supabase-js';
import { type GitHubIntegration } from '@common/types';
import { type GitHubIntegrationStore } from './GitHubIntegrationStore';
import { GitHubSupabaseRowMapper } from '../util/GitHubSupabaseRowMapper';

/**
 * Supabase implementation of the GitHub integration store
 * Read-only frontend store - all mutations handled via CodeShareApiManager
 * Uses Supabase PostgreSQL database for queries with row-level security
 */
export class GitHubIntegrationStoreSupabase implements GitHubIntegrationStore {
  private supabaseClient: SupabaseClient;
  private readonly tableName: string = 'github_integrations';

  constructor(supabaseClient: SupabaseClient) {
    if (!supabaseClient) {
      throw new Error('GitHubIntegrationStoreSupabase: supabaseClient is required');
    }
    this.supabaseClient = supabaseClient;
    console.debug('GitHubIntegrationStoreSupabase: Initialized');
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
      throw new Error(`Failed to get GitHub integration by customer ID: ${error.message}`);
    }

    return data ? GitHubSupabaseRowMapper.mapRowToGitHubIntegration(data) : null;
  }

  /**
   * Reloads integrations from storage
   * No-op for Supabase implementation as queries are always fresh
   */
  reload(): void {
    // No-op - Supabase queries are always fresh
    console.debug('GitHubIntegrationStoreSupabase: Reload called (no-op)');
  }
}
