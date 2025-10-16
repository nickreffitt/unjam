import { type GitHubIntegration } from '@common/types';

/**
 * Interface for GitHub integration storage implementations
 * Frontend stores are read-only - all mutations handled via CodeShareApiManager
 */
export interface GitHubIntegrationStore {
  /**
   * Gets a GitHub integration by customer ID
   * @param customerId - The customer profile ID
   * @returns The GitHub integration if found, null otherwise
   */
  getByCustomerId(customerId: string): Promise<GitHubIntegration | null>;

  /**
   * Reloads integrations from storage
   * Used when we need to sync with changes made by other tabs/sources
   */
  reload(): void;
}
