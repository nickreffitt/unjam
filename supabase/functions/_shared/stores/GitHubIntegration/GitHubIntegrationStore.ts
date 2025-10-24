import { type GitHubIntegration } from '@types';

/**
 * Interface for GitHub integration storage implementations
 * Defines the contract that all GitHub integration store implementations must follow
 */
export interface GitHubIntegrationStore {
  /**
   * Gets a GitHub integration by customer ID
   * @param customerId - The customer profile ID
   * @returns The GitHub integration if found, null otherwise
   */
  getByCustomerId(customerId: string): Promise<GitHubIntegration | null>;

  /**
   * Creates or updates a GitHub integration
   * @param integration - The GitHub integration data
   * @returns The created/updated GitHub integration
   */
  upsert(integration: Omit<GitHubIntegration, 'id' | 'createdAt' | 'updatedAt'>): Promise<GitHubIntegration>;

  /**
   * Deletes a GitHub integration by customer ID
   * @param customerId - The customer profile ID
   */
  delete(customerId: string): Promise<void>;
}
