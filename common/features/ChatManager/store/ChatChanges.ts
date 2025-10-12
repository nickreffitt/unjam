/**
 * Interface for listening to chat message changes
 * Implementations should handle real-time updates to messages (INSERT and UPDATE events)
 */
export interface ChatChanges {
  /**
   * Starts listening for message changes
   * Should set up subscriptions to receive real-time message changes
   */
  start(): Promise<void>;

  /**
   * Stops listening for message changes
   * Should clean up any active subscriptions
   */
  stop(): void;
}
