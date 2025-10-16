/**
 * Interface for listening to GitHub integration changes
 * Implementations should handle real-time updates to GitHub integrations (INSERT, UPDATE, and DELETE events)
 */
export interface GitHubIntegrationChanges {
  /**
   * Starts listening for GitHub integration changes
   * Should set up subscriptions to receive real-time changes
   * @param customerId - The customer ID to filter updates for
   */
  start(customerId: string): Promise<void>;

  /**
   * Stops listening for GitHub integration changes
   * Should clean up any active subscriptions
   */
  stop(): void;
}
