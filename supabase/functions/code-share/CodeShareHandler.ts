import type { ProjectRepositoryStore } from '../_shared/stores/ProjectRepository/index.ts'
import type { RepositoryCollaboratorStore } from '../_shared/stores/RepositoryCollaborator/index.ts'
import type { CodeShareService } from '../_shared/services/CodeShare/index.ts'

export class CodeShareHandler {
  private readonly repositoryStore: ProjectRepositoryStore
  private readonly collaboratorStore: RepositoryCollaboratorStore
  private readonly codeShareService: CodeShareService

  constructor(
    repositoryStore: ProjectRepositoryStore,
    collaboratorStore: RepositoryCollaboratorStore,
    codeShareService: CodeShareService
  ) {
    this.repositoryStore = repositoryStore
    this.collaboratorStore = collaboratorStore
    this.codeShareService = codeShareService
  }

  async validateRepository(payload: { owner: string; repo: string }): Promise<{ valid: boolean }> {
    const { owner, repo } = payload
    const exists = await this.codeShareService.validateRepository(owner, repo)
    return { valid: exists }
  }

  async inviteCollaborator(payload: {
    owner: string;
    repo: string;
    username: string;
    ticket_id: string;
    repository_id: string;
    engineer_id: string;
  }): Promise<{ success: boolean; collaborator: {
    id: string;
    ticketId: string;
    repositoryId: string;
    engineerId: string;
    githubUsername: string;
    invitedAt: string;
  } }> {
    const { owner, repo, username, ticket_id, repository_id, engineer_id } = payload

    await this.codeShareService.inviteCollaborator(owner, repo, username)

    const collaborator = await this.collaboratorStore.create({
      ticketId: ticket_id,
      repositoryId: repository_id,
      engineerId: engineer_id,
      githubUsername: username
    })

    return {
      success: true,
      collaborator: {
        id: collaborator.id,
        ticketId: collaborator.ticketId,
        repositoryId: collaborator.repositoryId,
        engineerId: collaborator.engineerId,
        githubUsername: collaborator.githubUsername,
        invitedAt: collaborator.invitedAt.toISOString()
      }
    }
  }

  async removeCollaborator(payload: {
    owner: string;
    repo: string;
    username: string;
    collaborator_id: string;
  }): Promise<{ success: boolean }> {
    const { owner, repo, username, collaborator_id } = payload

    await this.codeShareService.removeCollaborator(owner, repo, username)

    await this.collaboratorStore.markRemoved(collaborator_id)

    return { success: true }
  }
}
