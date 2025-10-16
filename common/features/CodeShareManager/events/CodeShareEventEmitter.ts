import {
  type GitHubIntegration,
  type ProjectRepository,
  type RepositoryCollaborator
} from '@common/types';

/**
 * Interface for code share event emission implementations
 * Defines the contract that all code share event emitter implementations must follow
 */
export interface CodeShareEventEmitter {
  /**
   * Emits a GitHub integration created event
   * @param integration - The created GitHub integration
   */
  emitGitHubIntegrationCreated(integration: GitHubIntegration): void;

  /**
   * Emits a GitHub integration updated event
   * @param integration - The updated GitHub integration
   */
  emitGitHubIntegrationUpdated(integration: GitHubIntegration): void;

  /**
   * Emits a GitHub integration deleted event
   * @param customerId - The customer ID whose integration was deleted
   */
  emitGitHubIntegrationDeleted(customerId: string): void;

  /**
   * Emits a project repository created event
   * @param repository - The created project repository
   */
  emitProjectRepositoryCreated(repository: ProjectRepository): void;

  /**
   * Emits a project repository updated event
   * @param repository - The updated project repository
   */
  emitProjectRepositoryUpdated(repository: ProjectRepository): void;

  /**
   * Emits a project repository deleted event
   * @param repositoryId - The ID of the deleted repository
   */
  emitProjectRepositoryDeleted(repositoryId: string): void;

  /**
   * Emits a repository collaborator created event
   * @param collaborator - The created repository collaborator
   */
  emitRepositoryCollaboratorCreated(collaborator: RepositoryCollaborator): void;

  /**
   * Emits a repository collaborator removed event
   * @param collaborator - The removed repository collaborator
   */
  emitRepositoryCollaboratorRemoved(collaborator: RepositoryCollaborator): void;

  /**
   * Emits a repository collaborator deleted event
   * @param collaboratorId - The ID of the deleted collaborator
   */
  emitRepositoryCollaboratorDeleted(collaboratorId: string): void;
}
