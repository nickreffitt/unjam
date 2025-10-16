/**
 * Interface for listening to project repository changes
 * Implementations should handle real-time updates to project repositories (INSERT, UPDATE, and DELETE events)
 */
export interface ProjectRepositoryChanges {
  /**
   * Starts listening for project repository changes
   * Should set up subscriptions to receive real-time changes
   * @param customerId - The customer ID to filter updates for
   */
  start(customerId: string): Promise<void>;

  /**
   * Stops listening for project repository changes
   * Should clean up any active subscriptions
   */
  stop(): void;
}
