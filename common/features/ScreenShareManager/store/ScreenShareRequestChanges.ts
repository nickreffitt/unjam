/**
 * Interface for listening to screenshare request changes
 * Implementations should handle real-time updates to screenshare requests (INSERT and UPDATE events)
 */
export interface ScreenShareRequestChanges {
  /**
   * Starts listening for screenshare request changes
   * Should set up subscriptions to receive real-time screenshare request changes
   */
  start(): Promise<void>;

  /**
   * Stops listening for screenshare request changes
   * Should clean up any active subscriptions
   */
  stop(): void;
}
