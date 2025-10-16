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
   * Gets all collaborators for a ticket
   * @param ticketId - The ticket ID
   * @returns Array of repository collaborators
   */
  getAllByTicketId(ticketId: string): Promise<RepositoryCollaborator[]>;

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
   * @param id - The collaborator ID
   */
  markRemoved(id: string): Promise<void>;

  /**
   * Deletes a repository collaborator by ID
   * @param id - The collaborator ID
   */
  delete(id: string): Promise<void>;
}
