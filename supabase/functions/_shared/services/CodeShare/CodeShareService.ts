import { type ProjectRepository } from '@types';

/**
 * CodeShareService - Interface for code sharing operations
 *
 * Defines the contract for integrating with code hosting platforms
 * to enable repository access sharing between customers and engineers.
 */
export interface CodeShareService {
  /**
   * Validates that a repository exists and is accessible
   *
   * @param owner - Repository owner username
   * @param repo - Repository name
   * @returns Promise resolving to true if repository exists and is accessible
   */
  validateRepository(owner: string, repo: string): Promise<boolean>

  /**
   * Invites a collaborator to a repository
   *
   * @param repo - The ProjectRepository object
   * @param username - Username to invite as collaborator
   * @returns Promise that resolves when invitation is sent
   */
  inviteCollaborator(repo: ProjectRepository, username: string): Promise<void>

  /**
   * Removes a collaborator from a repository
   *
   * @param repo - The ProjectRepository object
   * @param username - Username to remove as collaborator
   * @returns Promise that resolves when collaborator is removed
   */
  removeCollaborator(repo: ProjectRepository, username: string): Promise<void>

  /**
   * Creates a webhook for repository events
   *
   * @param repo - The ProjectRepository object
   * @param webhookUrl - The URL to send webhook events to
   * @param webhookSecret - The secret for webhook signature verification
   * @returns Promise that resolves when webhook is created
   */
  createWebhook(repo: ProjectRepository, webhookUrl: string, webhookSecret: string): Promise<void>
}
