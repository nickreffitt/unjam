/**
 * Interface for listening to authentication profile changes
 * Implementations should handle real-time updates to user profiles
 */
export interface AuthChanges {
  /**
   * Starts listening for profile updates
   * Should set up subscriptions to receive real-time profile changes
   */
  start(profileId: string): void;

  /**
   * Stops listening for profile updates
   * Should clean up any active subscriptions
   */
  stop(): void;
}
