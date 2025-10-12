/**
 * Interface for listening to screenshare session changes
 * Implementations should handle real-time updates to screenshare sessions (INSERT and UPDATE events)
 */
export interface ScreenShareSessionChanges {
  /**
   * Starts listening for screenshare session changes
   * Should set up subscriptions to receive real-time screenshare session changes
   */
  start(): Promise<void>;

  /**
   * Stops listening for screenshare session changes
   * Should clean up any active subscriptions
   */
  stop(): void;
}
