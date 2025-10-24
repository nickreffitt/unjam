import { type GitHubIntegration, type ProjectRepository, type RepositoryCollaborator, type CodeShareRequest } from '@common/types';

/**
 * Interface for objects that listen to code share store events
 * All methods are optional to allow listeners to subscribe to only the events they care about
 */
export interface CodeShareListenerCallbacks {
  /**
   * Called when a new GitHub integration is created
   * @param integration - The newly created GitHub integration
   */
  onGitHubIntegrationCreated?(integration: GitHubIntegration): void;

  /**
   * Called when a GitHub integration is updated
   * @param integration - The updated GitHub integration
   */
  onGitHubIntegrationUpdated?(integration: GitHubIntegration): void;

  /**
   * Called when a GitHub integration is deleted
   * @param customerId - The customer ID whose integration was deleted
   */
  onGitHubIntegrationDeleted?(customerId: string): void;

  /**
   * Called when a new project repository is created
   * @param repository - The newly created project repository
   */
  onProjectRepositoryCreated?(repository: ProjectRepository): void;

  /**
   * Called when a project repository is updated
   * @param repository - The updated project repository
   */
  onProjectRepositoryUpdated?(repository: ProjectRepository): void;

  /**
   * Called when a project repository is deleted
   * @param repositoryId - The ID of the deleted repository
   */
  onProjectRepositoryDeleted?(repositoryId: string): void;

  /**
   * Called when a new repository collaborator is created
   * @param collaborator - The newly created repository collaborator
   */
  onRepositoryCollaboratorCreated?(collaborator: RepositoryCollaborator): void;

  /**
   * Called when a repository collaborator is updated
   * @param collaborator - The updated repository collaborator
   */
  onRepositoryCollaboratorUpdated?(collaborator: RepositoryCollaborator): void;
  
  /**
   * Called when a repository collaborator is deleted
   * @param collaboratorId - The ID of the deleted collaborator
   * @param engineerId - The engineer ID from the deleted collaborator
   */
  onRepositoryCollaboratorDeleted?(collaboratorId: string, engineerId: string): void;

  /**
   * Called when a code share request is created
   * @param request - The newly created code share request
   */
  onCodeShareRequestCreated?(request: CodeShareRequest): void;

  /**
   * Called when a code share request is updated
   * @param request - The updated code share request
   */
  onCodeShareRequestUpdated?(request: CodeShareRequest): void;
}

/**
 * Interface for code share listener implementations
 * Defines the contract that all code share listener implementations must follow
 */
export interface CodeShareListener {
  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<CodeShareListenerCallbacks>): void;

  /**
   * Starts listening to code share events for cross-tab/cross-client communication
   */
  startListening(): void;

  /**
   * Stops listening to code share events
   */
  stopListening(): void;

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean;
}
