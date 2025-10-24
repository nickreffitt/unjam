import type { GitHubWebhookEventConverter } from '@events/GitHubWebhookEventConverter.ts'
import type { ProjectRepositoryStore } from '@stores/ProjectRepository/index.ts'
import type { RepositoryCollaboratorStore } from '@stores/RepositoryCollaborator/index.ts'
import type { GitHubWebhookEvent } from '@types'

/**
 * GitHubWebhookHandler orchestrates the conversion and processing of GitHub webhook events
 * Uses dependency injection for converter and stores
 */
export class GitHubWebhookHandler {
  private readonly converter: GitHubWebhookEventConverter
  private readonly repositoryStore: ProjectRepositoryStore
  private readonly collaboratorStore: RepositoryCollaboratorStore

  constructor(
    converter: GitHubWebhookEventConverter,
    repositoryStore: ProjectRepositoryStore,
    collaboratorStore: RepositoryCollaboratorStore
  ) {
    this.converter = converter
    this.repositoryStore = repositoryStore
    this.collaboratorStore = collaboratorStore
  }

  /**
   * Handles a GitHub webhook event by converting and processing it
   * @param body - The raw request body as a string
   * @param signature - The X-Hub-Signature-256 header for verification
   * @param eventType - The X-GitHub-Event header value
   * @returns Promise that resolves on success or rejects with error
   */
  async handleEvent(body: string, signature: string, eventType: string): Promise<void> {
    console.info(`[GitHubWebhookHandler] Handling GitHub webhook event: ${eventType}`)

    // Convert the event using the converter
    const webhookEvent = await this.converter.convertEvent(body, signature, eventType)

    // Process the event based on its type
    if ('collaboratorRemoved' in webhookEvent) {
      await this.handleCollaboratorRemoved(webhookEvent)
    } else if ('repositoryDeleted' in webhookEvent) {
      await this.handleRepositoryDeleted(webhookEvent)
    } else {
      throw new Error('Unknown GitHub webhook event type')
    }

    console.info('[GitHubWebhookHandler] Successfully handled GitHub webhook event')
  }

  /**
   * Handles collaborator removed events
   * Deletes the collaborator from the repository_collaborators table
   */
  private async handleCollaboratorRemoved(event: GitHubWebhookEvent): Promise<void> {
    if (!('collaboratorRemoved' in event)) {
      throw new Error('Invalid event type for handleCollaboratorRemoved')
    }

    const { repositoryId, repositoryFullName, repositoryOwner, repositoryName, collaboratorLogin } = event.collaboratorRemoved

    console.info(
      `[GitHubWebhookHandler] Processing collaborator removed: ${collaboratorLogin} from ${repositoryFullName} (${repositoryId})`
    )

    // Find the repository by GitHub owner and repo name
    const repository = await this.repositoryStore.getByGitHubRepo(repositoryOwner, repositoryName)

    if (!repository) {
      console.warn(
        `[GitHubWebhookHandler] Repository not found for ${repositoryFullName} (${repositoryId}). Collaborator may have already been removed.`
      )
      return
    }

    // Get all active collaborators for this repository
    const collaborators = await this.collaboratorStore.getActiveByRepositoryId(repository.id)

    // Find the collaborator by GitHub username
    const collaborator = collaborators.find(c => c.githubUsername === collaboratorLogin)

    if (!collaborator) {
      console.warn(
        `[GitHubWebhookHandler] Collaborator ${collaboratorLogin} not found for repository ${repositoryFullName}. May have already been removed.`
      )
      return
    }

    // Delete the collaborator
    await this.collaboratorStore.delete(collaborator.id);

    console.info(
      `[GitHubWebhookHandler] Successfully deleted collaborator ${collaboratorLogin} from ${repositoryFullName}`
    )
  }

  /**
   * Handles repository deleted events
   * Deletes all collaborators and optionally the repository record
   */
  private async handleRepositoryDeleted(event: GitHubWebhookEvent): Promise<void> {
    if (!('repositoryDeleted' in event)) {
      throw new Error('Invalid event type for handleRepositoryDeleted')
    }

    const { repositoryId, repositoryFullName, repositoryOwner, repositoryName } = event.repositoryDeleted

    console.info(
      `[GitHubWebhookHandler] Processing repository deleted: ${repositoryFullName} (${repositoryId})`
    )

    // Find the repository by GitHub owner and repo name
    const repository = await this.repositoryStore.getByGitHubRepo(repositoryOwner, repositoryName)

    if (!repository) {
      console.warn(
        `[GitHubWebhookHandler] Repository not found for ${repositoryFullName} (${repositoryId}). May have already been deleted.`
      )
      return
    }

    // Get all active collaborators for this repository
    const collaborators = await this.collaboratorStore.getActiveByRepositoryId(repository.id)

    // Delete all collaborators
    for (const collaborator of collaborators) {
      await this.collaboratorStore.delete(collaborator.id)
      console.info(
        `[GitHubWebhookHandler] Collaborator ${collaborator.githubUsername} deleted from deleted repository ${repositoryFullName}`
      )
    }

    // Delete the repository record
    await this.repositoryStore.delete(repository.id)

    console.info(
      `[GitHubWebhookHandler] Successfully deleted repository ${repositoryFullName} and all its collaborators`
    )
  }
}
