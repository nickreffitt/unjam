import type { Octokit } from "octokit"
import type { CodeShareService } from "./CodeShareService.ts"
import { type ProjectRepository } from "@types";

/**
 * CodeShareServiceGitHub - GitHub implementation of CodeShareService
 *
 * Provides GitHub-specific operations for repository management
 * using the Octokit library.
 */
export class CodeShareServiceGitHub implements CodeShareService {
  private readonly octokit: Octokit

  constructor(octokit: Octokit) {
    this.octokit = octokit
  }

  /**
   * Validates that a GitHub repository exists and is accessible
   */
  async validateRepository(owner: string, repo: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({
        owner,
        repo,
      })
      return true
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error) {
        const statusError = error as { status: number }
        // 404 means repo doesn't exist or not accessible
        if (statusError.status === 404) {
          return false
        }
      }
      // Re-throw other errors (auth issues, network problems, etc.)
      throw error
    }
  }

  /**
   * Invites a collaborator to a GitHub repository with push access
   */
  async inviteCollaborator(repo: ProjectRepository, username: string): Promise<void> {
    try {
      const owner = repo.githubOwner
      const gitRepo = repo.githubRepo
      console.debug(`[CodeShareServiceGithub] About to invite collaborator '${username}' to repo '${gitRepo} for owner ${owner}'.`)
      
      await this.octokit.rest.repos.addCollaborator({
        owner,
        repo: gitRepo,
        username,
        permission: 'push', // Grant push access for engineers to make changes
      })
    } catch (error: unknown) {
      if (error && typeof error === 'object') {
        console.error(`An error occurred adding a collaborator to a repo ${JSON.stringify(error)}`)
        throw error;
      }
    }
  }

  /**
   * Removes a collaborator from a GitHub repository
   * If the user hasn't accepted the invitation (404 error), deletes the pending invitation instead
   */
  async removeCollaborator(repo: ProjectRepository, username: string): Promise<void> {
    try {
      const owner = repo.githubOwner
      const gitRepo = repo.githubRepo
      console.debug(`[CodeShareServiceGithub] About to remove collaborator '${username}' from repo '${gitRepo} for owner ${owner}'.`)

      await this.octokit.rest.repos.removeCollaborator({
        owner,
        repo: gitRepo,
        username,
      })
      await this.deleteInvitation(repo, username)
    } catch (error: unknown) {
      console.error(`An error occurred removing a collaborator from a repo ${JSON.stringify(error)}`)
      throw error;
    }
  }

  /**
   * Creates a webhook for repository events
   * Listens for member and repository events to track collaborator changes
   */
  async createWebhook(repo: ProjectRepository, webhookUrl: string, webhookSecret: string): Promise<void> {
    try {
      const owner = repo.githubOwner
      const gitRepo = repo.githubRepo

      console.debug(`[CodeShareServiceGithub] Creating webhook for repo '${gitRepo}' owned by '${owner}'`)

      // Check if webhook already exists
      const { data: existingHooks } = await this.octokit.rest.repos.listWebhooks({
        owner,
        repo: gitRepo,
      })

      const existingHook = existingHooks.find(hook => hook.config.url === webhookUrl)

      if (existingHook) {
        console.debug(`[CodeShareServiceGithub] Webhook already exists for ${webhookUrl}`)
        return
      }

      // Create the webhook
      await this.octokit.rest.repos.createWebhook({
        owner,
        repo: gitRepo,
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret: webhookSecret,
          insecure_ssl: '0'
        },
        events: ['member', 'repository'], // Listen for collaborator and repository events
        active: true
      })

      console.debug(`[CodeShareServiceGithub] Successfully created webhook for repo '${gitRepo}'`)
    } catch (error: unknown) {
      console.error(`An error occurred creating webhook: ${JSON.stringify(error)}`)
      throw error
    }
  }

  /**
   * Deletes a pending invitation for a user who hasn't accepted yet
   */
  private async deleteInvitation(repo: ProjectRepository, username: string): Promise<void> {
    try {
      const owner = repo.githubOwner
      const gitRepo = repo.githubRepo

      // Get all pending invitations for the repository
      const { data: invitations } = await this.octokit.rest.repos.listInvitations({
        owner,
        repo: gitRepo,
      })

      // Find the invitation for this username
      const invitation = invitations.find(inv => inv.invitee?.login === username)

      if (invitation) {
        console.debug(`[CodeShareServiceGithub] Deleting invitation ${invitation.id} for user '${username}'`)
        await this.octokit.rest.repos.deleteInvitation({
          owner,
          repo: gitRepo,
          invitation_id: invitation.id,
        })
      } else {
        console.debug(`[CodeShareServiceGithub] No pending invitation found for user '${username}'`)
      }
    } catch (error: unknown) {
      console.error(`An error occurred deleting invitation for user '${username}': ${JSON.stringify(error)}`)
      throw error;
    }
  }
}
