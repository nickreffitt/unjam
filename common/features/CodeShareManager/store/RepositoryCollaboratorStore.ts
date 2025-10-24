import { type RepositoryCollaborator } from '@common/types';

/**
 * Interface for repository collaborator storage implementations
 * Frontend stores are read-only - all mutations handled via CodeShareApiManager
 */
export interface RepositoryCollaboratorStore {
  /**
   * Gets a repository collaborator by ID
   * @param id - The collaborator ID
   * @returns The repository collaborator if found, null otherwise
   */
  getById(id: string): Promise<RepositoryCollaborator | null>;

  /**
   * Gets a collaborator by repository ID and engineer ID
   * @param repositoryId - The repository ID
   * @param engineerId - The engineer ID
   * @returns The repository collaborator if found, null otherwise
   */
  getByRepositoryAndEngineer(repositoryId: string, engineerId: string): Promise<RepositoryCollaborator | null>;

  /**
   * Gets all active (not removed) collaborators for a repository
   * @param repositoryId - The repository ID
   * @returns Array of active repository collaborators
   */
  getActiveByRepositoryId(repositoryId: string): Promise<RepositoryCollaborator[]>;

  /**
   * Reloads collaborators from storage
   * Used when we need to sync with changes made by other tabs/sources
   */
  reload(): void;
}
