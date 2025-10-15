/**
 * Interface for listening to rating changes
 * Implementations should handle real-time updates to ratings (INSERT and UPDATE events)
 */
export interface RatingChanges {
  /**
   * Starts listening for rating changes
   * Should set up subscriptions to receive real-time rating changes
   */
  start(): Promise<void>;

  /**
   * Stops listening for rating changes
   * Should clean up any active subscriptions
   */
  stop(): void;
}
