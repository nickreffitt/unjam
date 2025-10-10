/**
 * Interface for listening to ticket changes
 * Implementations should handle real-time updates to tickets (INSERT and UPDATE events)
 */
export interface TicketChanges {
  /**
   * Starts listening for ticket changes (both inserts and updates)
   * Should set up subscriptions to receive real-time ticket changes
   * @param profileId - The profile ID of the logged-in user to filter updates
   */
  start(profileId: string): Promise<void>;

  /**
   * Stops listening for ticket changes
   * Should clean up any active subscriptions
   */
  stop(): void;
}
