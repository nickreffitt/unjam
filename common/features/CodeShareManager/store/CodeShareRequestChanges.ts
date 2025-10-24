/**
 * Interface for listening to code share request changes
 * Implementations should handle real-time updates to code share requests (INSERT, UPDATE, and DELETE events)
 */
export interface CodeShareRequestChanges {
  /**
   * Starts listening for code share request changes for a specific user
   * Should set up subscriptions to receive real-time changes
   * @param userId - The user profile ID to filter updates for
   */
  start(userId: string): Promise<void>;

  /**
   * Stops listening for code share request changes
   * Should clean up any active subscriptions
   */
  stop(): void;
}
