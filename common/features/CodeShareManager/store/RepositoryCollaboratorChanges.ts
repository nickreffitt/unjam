/**
 * Interface for listening to repository collaborator changes
 * Implementations should handle real-time updates to repository collaborators (INSERT, UPDATE, and DELETE events)
 */
export interface RepositoryCollaboratorChanges {
  /**
   * Starts listening for repository collaborator changes
   * Should set up subscriptions to receive real-time changes
   * @param profileId - The profile ID (customer or engineer) to filter updates for
   */
  start(profileId: string): Promise<void>;

  /**
   * Stops listening for repository collaborator changes
   * Should clean up any active subscriptions
   */
  stop(): void;
}
