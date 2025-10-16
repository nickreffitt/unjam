import { type GitHubIntegration, type ProjectRepository, type RepositoryCollaborator, type CodeShareEventType } from '@common/types';
import { type CodeShareListener, type CodeShareListenerCallbacks } from './CodeShareListener';

/**
 * Local storage implementation of code share listener
 * Uses window events and localStorage for cross-tab communication
 */
export class CodeShareListenerLocal implements CodeShareListener {
  private callbacks: Partial<CodeShareListenerCallbacks>;
  private isListening: boolean = false;
  private handleStorageEvent: ((event: StorageEvent) => void) | null = null;
  private handleWindowEvent: ((event: CustomEvent) => void) | null = null;

  constructor(callbacks: Partial<CodeShareListenerCallbacks>) {
    this.callbacks = callbacks;
  }

  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<CodeShareListenerCallbacks>): void {
    this.callbacks = callbacks;
  }

  /**
   * Starts listening to both storage events (cross-tab) and window events (same-tab)
   */
  startListening(): void {
    if (this.isListening || typeof window === 'undefined') return;

    // Listen for storage events (cross-tab communication)
    this.handleStorageEvent = (event: StorageEvent) => {
      // Only process events for our specific key
      if (event.key !== 'codesharestore-event' || !event.newValue) return;

      try {
        const eventData = JSON.parse(event.newValue);
        this.processEventData(eventData);
      } catch (error) {
        console.error('CodeShareListenerLocal: Error parsing storage event data:', error);
      }
    };

    // Listen for window events (same-tab communication)
    this.handleWindowEvent = (event: CustomEvent) => {
      try {
        this.processEventData(event.detail);
      } catch (error) {
        console.error('CodeShareListenerLocal: Error processing window event data:', error);
      }
    };

    window.addEventListener('storage', this.handleStorageEvent);
    window.addEventListener('code-share-event', this.handleWindowEvent as EventListener);
    this.isListening = true;

    console.debug('CodeShareListenerLocal: Started listening to global code share events via storage and window events');
  }

  /**
   * Processes event data from either storage or window events
   */
  private processEventData(eventData: any): void {
    try {
      if (!eventData || typeof eventData !== 'object') {
        console.warn('CodeShareListenerLocal: Invalid event data received:', eventData);
        return;
      }

      const { type, integration, customerId, repository, repositoryId, collaborator, collaboratorId } = eventData;

      // Deserialize Date objects if present
      let deserializedIntegration = integration;
      if (integration) {
        deserializedIntegration = {
          ...integration,
          createdAt: integration.createdAt ? new Date(integration.createdAt) : new Date(),
          updatedAt: integration.updatedAt ? new Date(integration.updatedAt) : new Date(),
        };
      }

      let deserializedRepository = repository;
      if (repository) {
        deserializedRepository = {
          ...repository,
          createdAt: repository.createdAt ? new Date(repository.createdAt) : new Date(),
          updatedAt: repository.updatedAt ? new Date(repository.updatedAt) : new Date(),
        };
      }

      let deserializedCollaborator = collaborator;
      if (collaborator) {
        deserializedCollaborator = {
          ...collaborator,
          invitedAt: collaborator.invitedAt ? new Date(collaborator.invitedAt) : new Date(),
          removedAt: collaborator.removedAt ? new Date(collaborator.removedAt) : null,
        };
      }

      switch (type as CodeShareEventType) {
        case 'gitHubIntegrationCreated':
          if (this.callbacks.onGitHubIntegrationCreated && deserializedIntegration) {
            try {
              this.callbacks.onGitHubIntegrationCreated(deserializedIntegration);
            } catch (error) {
              console.error('CodeShareListenerLocal: Error in onGitHubIntegrationCreated:', error);
            }
          }
          break;
        case 'gitHubIntegrationUpdated':
          if (this.callbacks.onGitHubIntegrationUpdated && deserializedIntegration) {
            try {
              this.callbacks.onGitHubIntegrationUpdated(deserializedIntegration);
            } catch (error) {
              console.error('CodeShareListenerLocal: Error in onGitHubIntegrationUpdated:', error);
            }
          }
          break;
        case 'gitHubIntegrationDeleted':
          if (this.callbacks.onGitHubIntegrationDeleted && customerId) {
            try {
              this.callbacks.onGitHubIntegrationDeleted(customerId);
            } catch (error) {
              console.error('CodeShareListenerLocal: Error in onGitHubIntegrationDeleted:', error);
            }
          }
          break;
        case 'projectRepositoryCreated':
          if (this.callbacks.onProjectRepositoryCreated && deserializedRepository) {
            try {
              this.callbacks.onProjectRepositoryCreated(deserializedRepository);
            } catch (error) {
              console.error('CodeShareListenerLocal: Error in onProjectRepositoryCreated:', error);
            }
          }
          break;
        case 'projectRepositoryUpdated':
          if (this.callbacks.onProjectRepositoryUpdated && deserializedRepository) {
            try {
              this.callbacks.onProjectRepositoryUpdated(deserializedRepository);
            } catch (error) {
              console.error('CodeShareListenerLocal: Error in onProjectRepositoryUpdated:', error);
            }
          }
          break;
        case 'projectRepositoryDeleted':
          if (this.callbacks.onProjectRepositoryDeleted && repositoryId) {
            try {
              this.callbacks.onProjectRepositoryDeleted(repositoryId);
            } catch (error) {
              console.error('CodeShareListenerLocal: Error in onProjectRepositoryDeleted:', error);
            }
          }
          break;
        case 'repositoryCollaboratorCreated':
          if (this.callbacks.onRepositoryCollaboratorCreated && deserializedCollaborator) {
            try {
              this.callbacks.onRepositoryCollaboratorCreated(deserializedCollaborator);
            } catch (error) {
              console.error('CodeShareListenerLocal: Error in onRepositoryCollaboratorCreated:', error);
            }
          }
          break;
        case 'repositoryCollaboratorUpdated':
          if (this.callbacks.onRepositoryCollaboratorUpdated && deserializedCollaborator) {
            try {
              this.callbacks.onRepositoryCollaboratorUpdated(deserializedCollaborator);
            } catch (error) {
              console.error('CodeShareListenerLocal: Error in onRepositoryCollaboratorUpdated:', error);
            }
          }
          break;
        case 'repositoryCollaboratorRemoved':
          if (this.callbacks.onRepositoryCollaboratorRemoved && deserializedCollaborator) {
            try {
              this.callbacks.onRepositoryCollaboratorRemoved(deserializedCollaborator);
            } catch (error) {
              console.error('CodeShareListenerLocal: Error in onRepositoryCollaboratorRemoved:', error);
            }
          }
          break;
        case 'repositoryCollaboratorDeleted':
          if (this.callbacks.onRepositoryCollaboratorDeleted && collaboratorId) {
            try {
              this.callbacks.onRepositoryCollaboratorDeleted(collaboratorId);
            } catch (error) {
              console.error('CodeShareListenerLocal: Error in onRepositoryCollaboratorDeleted:', error);
            }
          }
          break;
      }
    } catch (error) {
      console.error('CodeShareListenerLocal: Error processing event data:', error);
    }
  }

  /**
   * Stops listening to both storage and window events
   */
  stopListening(): void {
    if (!this.isListening) return;

    if (this.handleStorageEvent) {
      window.removeEventListener('storage', this.handleStorageEvent);
      this.handleStorageEvent = null;
    }

    if (this.handleWindowEvent) {
      window.removeEventListener('code-share-event', this.handleWindowEvent as EventListener);
      this.handleWindowEvent = null;
    }

    this.isListening = false;
    console.debug('CodeShareListenerLocal: Stopped listening to global code share events');
  }

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}
