import {
  type GitHubIntegration,
  type ProjectRepository,
  type RepositoryCollaborator,
  type CodeShareRequest,
  type CodeShareEventType
} from '@common/types';
import { type CodeShareEventEmitter } from './CodeShareEventEmitter';

/**
 * Local storage implementation of the code share event emitter
 * Uses window events and localStorage for cross-tab communication
 */
export class CodeShareEventEmitterLocal implements CodeShareEventEmitter {
  constructor() {
    // No need for local listeners - everything goes through window events
  }

  /**
   * Emits a GitHub integration created event
   * @param integration - The created GitHub integration
   */
  emitGitHubIntegrationCreated(integration: GitHubIntegration): void {
    this.emitWindowEvent('gitHubIntegrationCreated', { integration });
  }

  /**
   * Emits a GitHub integration updated event
   * @param integration - The updated GitHub integration
   */
  emitGitHubIntegrationUpdated(integration: GitHubIntegration): void {
    this.emitWindowEvent('gitHubIntegrationUpdated', { integration });
  }

  /**
   * Emits a GitHub integration deleted event
   * @param customerId - The customer ID whose integration was deleted
   */
  emitGitHubIntegrationDeleted(customerId: string): void {
    this.emitWindowEvent('gitHubIntegrationDeleted', { customerId });
  }

  /**
   * Emits a project repository created event
   * @param repository - The created project repository
   */
  emitProjectRepositoryCreated(repository: ProjectRepository): void {
    this.emitWindowEvent('projectRepositoryCreated', { repository });
  }

  /**
   * Emits a project repository updated event
   * @param repository - The updated project repository
   */
  emitProjectRepositoryUpdated(repository: ProjectRepository): void {
    this.emitWindowEvent('projectRepositoryUpdated', { repository });
  }

  /**
   * Emits a project repository deleted event
   * @param repositoryId - The ID of the deleted repository
   */
  emitProjectRepositoryDeleted(repositoryId: string): void {
    this.emitWindowEvent('projectRepositoryDeleted', { repositoryId });
  }

  /**
   * Emits a repository collaborator created event
   * @param collaborator - The created repository collaborator
   */
  emitRepositoryCollaboratorCreated(collaborator: RepositoryCollaborator): void {
    this.emitWindowEvent('repositoryCollaboratorCreated', { collaborator });
  }

  /**
   * Emits a repository collaborator updated event
   * @param collaborator - The updated repository collaborator
   */
  emitRepositoryCollaboratorUpdated(collaborator: RepositoryCollaborator): void {
    this.emitWindowEvent('repositoryCollaboratorUpdated', { collaborator });
  }

  /**
   * Emits a repository collaborator deleted event
   * @param collaboratorId - The ID of the deleted collaborator
   * @param engineerId - The engineer ID from the deleted collaborator
   */
  emitRepositoryCollaboratorDeleted(collaboratorId: string, engineerId: string): void {
    this.emitWindowEvent('repositoryCollaboratorDeleted', { collaboratorId, engineerId });
  }

  /**
   * Emits a code share request created event
   * @param request - The created code share request
   */
  emitCodeShareRequestCreated(request: CodeShareRequest): void {
    this.emitWindowEvent('codeShareRequestCreated', { request });
  }

  /**
   * Emits a code share request updated event
   * @param request - The updated code share request
   */
  emitCodeShareRequestUpdated(request: CodeShareRequest): void {
    this.emitWindowEvent('codeShareRequestUpdated', { request });
  }

  /**
   * Emits a code share request deleted event
   * @param requestId - The ID of the deleted code share request
   */
  emitCodeShareRequestDeleted(requestId: string): void {
    this.emitWindowEvent('codeShareRequestDeleted', { requestId });
  }

  /**
   * Emits events for both same-tab and cross-tab communication
   */
  private emitWindowEvent(type: CodeShareEventType, data: Record<string, unknown>): void {
    if (typeof window === 'undefined') return; // Skip in non-browser environments

    const eventPayload = {
      type,
      ...data,
      timestamp: Date.now()
    };

    // 1. Emit custom window event for same-tab communication
    const customEvent = new CustomEvent('code-share-event', {
      detail: eventPayload
    });
    window.dispatchEvent(customEvent);

    // 2. Use localStorage to trigger storage events for cross-tab communication
    const eventKey = 'codesharestore-event';
    localStorage.setItem(eventKey, JSON.stringify(eventPayload));

    // Clean up immediately to avoid cluttering localStorage
    localStorage.removeItem(eventKey);

    console.debug('CodeShareEventEmitterLocal: Emitting both window and storage events:', type, data);
  }
}
