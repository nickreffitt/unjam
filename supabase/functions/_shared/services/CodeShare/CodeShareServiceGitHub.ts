import type { Octokit } from "octokit"
import type { CodeShareService } from "./CodeShareService.ts"

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
  async inviteCollaborator(owner: string, repo: string, username: string): Promise<void> {
    await this.octokit.rest.repos.addCollaborator({
      owner,
      repo,
      username,
      permission: 'push', // Grant push access for engineers to make changes
    })
  }

  /**
   * Removes a collaborator from a GitHub repository
   */
  async removeCollaborator(owner: string, repo: string, username: string): Promise<void> {
    await this.octokit.rest.repos.removeCollaborator({
      owner,
      repo,
      username,
    })
  }
}
