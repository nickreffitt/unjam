import type { ProjectRepositoryStore } from '../_shared/stores/ProjectRepository/index.ts'
import type { RepositoryCollaboratorStore } from '../_shared/stores/RepositoryCollaborator/index.ts'
import type { CodeShareService } from '../_shared/services/CodeShare/index.ts'

export class CodeShareHandler {
  private readonly repositoryStore: ProjectRepositoryStore
  private readonly collaboratorStore: RepositoryCollaboratorStore
  private readonly codeShareService: CodeShareService
  private readonly webhookUrl: string
  private readonly webhookSecret: string

  constructor(
    repositoryStore: ProjectRepositoryStore,
    collaboratorStore: RepositoryCollaboratorStore,
    codeShareService: CodeShareService,
    webhookUrl: string,
    webhookSecret: string
  ) {
    this.repositoryStore = repositoryStore
    this.collaboratorStore = collaboratorStore
    this.codeShareService = codeShareService
    this.webhookUrl = webhookUrl
    this.webhookSecret = webhookSecret
  }

  async validateRepository(payload: { github_repo_url: string }): Promise<{ valid: boolean; owner: string; repo: string }> {
    const { github_repo_url } = payload

    // Parse GitHub URL to extract owner and repo
    const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/
    const match = github_repo_url.match(urlPattern)

    if (!match) {
      throw new Error('Invalid GitHub repository URL format')
    }

    const owner = match[1]
    const repo = match[2].replace(/\.git$/, '') // Remove .git suffix if present

    const exists = await this.codeShareService.validateRepository(owner, repo)
    console.log(`is valid? ${(exists) ? "Yes" : "No"}`);
    return { valid: exists, owner, repo }
  }

  async inviteCollaborator(payload: {
    customer_id: string;
    repository_id: string;
    engineer_id: string;
    engineer_github_username: string;
  }): Promise<{ success: boolean; collaborator: {
    id: string;
    repositoryId: string;
    engineerId: string;
    githubUsername: string;
    invitedAt: string;
  } }> {
    const {
      repository_id,
      engineer_id,
      engineer_github_username,
     } = payload

    const repository = await this.repositoryStore.getById(repository_id)
    if (!repository) {
      throw new Error('Repository not found in database')
    }

    // Check if collaborator already exists
    const existingCollaborator = await this.collaboratorStore.getByRepositoryAndEngineer(repository_id, engineer_id)
    if (existingCollaborator && !existingCollaborator.removedAt) {
      // Return existing collaborator if still active
      return {
        success: true,
        collaborator: {
          id: existingCollaborator.id,
          repositoryId: existingCollaborator.repositoryId,
          engineerId: existingCollaborator.engineerId,
          githubUsername: existingCollaborator.githubUsername,
          invitedAt: existingCollaborator.invitedAt.toISOString()
        }
      }
    }

    // Invite collaborator to the repository
    await this.codeShareService.inviteCollaborator(repository, engineer_github_username)

    // Create webhook to track repository events (only if this is the first collaborator)
    const existingCollaborators = await this.collaboratorStore.getActiveByRepositoryId(repository_id)
    if (existingCollaborators.length === 0) {
      console.info(`[CodeShareHandler] Creating webhook for repository ${repository.githubRepo}`)
      await this.codeShareService.createWebhook(repository, this.webhookUrl, this.webhookSecret)
    }

    const collaborator = await this.collaboratorStore.create({
      repositoryId: repository_id,
      engineerId: engineer_id,
      githubUsername: engineer_github_username
    })

    return {
      success: true,
      collaborator: {
        id: collaborator.id,
        repositoryId: collaborator.repositoryId,
        engineerId: collaborator.engineerId,
        githubUsername: collaborator.githubUsername,
        invitedAt: collaborator.invitedAt.toISOString()
      }
    }
  }

  async removeCollaborator(payload: {
    customer_id: string;
    repository_id: string;
    engineer_id: string;
    engineer_github_username: string;
  }): Promise<{ success: boolean }> {
    const { repository_id, engineer_id, engineer_github_username} = payload

    const repository = await this.repositoryStore.getById(repository_id)
    if (!repository) {
      throw new Error('Repository not found in database')
    }

    await this.codeShareService.removeCollaborator(repository, engineer_github_username)

    await this.collaboratorStore.deleteByRepositoryAndEngineer(repository_id, engineer_id)

    return { success: true }
  }
}
