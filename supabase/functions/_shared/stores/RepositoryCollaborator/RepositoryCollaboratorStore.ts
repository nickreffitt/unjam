import { type RepositoryCollaborator } from '@types';

/**
 * Interface for repository collaborator storage implementations
 * Defines the contract that all repository collaborator store implementations must follow
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
   * Creates a new repository collaborator record
   * @param collaborator - The collaborator data
   * @returns The created repository collaborator
   */
  create(collaborator: Omit<RepositoryCollaborator, 'id' | 'invitedAt' | 'removedAt'>): Promise<RepositoryCollaborator>;

  /**
   * Marks a collaborator as removed
   * @param repositoryId - The repository ID
   * @param engineerId - The engineer ID
   */
  markRemoved(repositoryId: string, engineerId: string): Promise<void>;

  /**
   * Deletes a repository collaborator by ID
   * @param id - The collaborator ID
   */
  delete(id: string): Promise<void>;

  /**
   * Deletes a repository collaborator by repository and engineer
   * @param repositoryId - The repository ID
   * @param engineerId - The engineer ID
   */
  deleteByRepositoryAndEngineer(repositoryId: string, engineerId: string): Promise<void>;
}
