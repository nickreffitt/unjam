/**
 * Interface for listening to WebRTC signaling changes
 * Implementations should handle real-time updates to WebRTC signals (INSERT and UPDATE events)
 */
export interface WebRTCSignalingChanges {
  /**
   * Starts listening for WebRTC signaling changes for a specific session
   * Should set up subscriptions to receive real-time signal changes
   */
  start(): Promise<void>;

  /**
   * Stops listening for WebRTC signaling changes
   * Should clean up any active subscriptions
   */
  stop(): void;
}
