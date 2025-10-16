import {
  type GitHubIntegration,
  type ProjectRepository,
  type RepositoryCollaborator,
  type UserProfile
} from '@common/types';
import { isCustomerProfile } from '@common/util';
import { type CodeShareApiManager } from '@common/features/CodeShareApiManager/CodeShareApiManager';
import {
  type GitHubIntegrationStore,
  type ProjectRepositoryStore,
  type RepositoryCollaboratorStore,
  type GitHubIntegrationChanges,
  type ProjectRepositoryChanges,
  type RepositoryCollaboratorChanges
} from './store';

/**
 * CodeShareManager handles GitHub repository sharing for tickets
 * Manages OAuth flow, repository validation, and collaborator invitations
 */
export class CodeShareManager {
  private userProfile: UserProfile;
  private githubIntegrationStore: GitHubIntegrationStore;
  private projectRepositoryStore: ProjectRepositoryStore;
  private repositoryCollaboratorStore: RepositoryCollaboratorStore;
  private githubIntegrationChanges: GitHubIntegrationChanges;
  private projectRepositoryChanges: ProjectRepositoryChanges;
  private repositoryCollaboratorChanges: RepositoryCollaboratorChanges;
  private codeShareApiManager: CodeShareApiManager;
  private githubClientId: string;

  constructor(
    userProfile: UserProfile,
    githubIntegrationStore: GitHubIntegrationStore,
    projectRepositoryStore: ProjectRepositoryStore,
    repositoryCollaboratorStore: RepositoryCollaboratorStore,
    githubIntegrationChanges: GitHubIntegrationChanges,
    projectRepositoryChanges: ProjectRepositoryChanges,
    repositoryCollaboratorChanges: RepositoryCollaboratorChanges,
    codeShareApiManager: CodeShareApiManager,
    githubClientId: string
  ) {
    if (!githubClientId) {
      throw new Error('GitHub client ID is required for CodeShareManager');
    }

    this.userProfile = userProfile;
    this.githubIntegrationStore = githubIntegrationStore;
    this.projectRepositoryStore = projectRepositoryStore;
    this.repositoryCollaboratorStore = repositoryCollaboratorStore;
    this.githubIntegrationChanges = githubIntegrationChanges;
    this.projectRepositoryChanges = projectRepositoryChanges;
    this.repositoryCollaboratorChanges = repositoryCollaboratorChanges;
    this.codeShareApiManager = codeShareApiManager;
    this.githubClientId = githubClientId;

    // Start listening for changes
    this.githubIntegrationChanges.start(userProfile.id);
    this.projectRepositoryChanges.start(userProfile.id);
    this.repositoryCollaboratorChanges.start(userProfile.id);
    console.debug('CodeShareManager: Started listening for code share changes');
  }

  /**
   * Gets the GitHub OAuth authorization URL
   * @returns The full GitHub OAuth URL for authorization
   * @throws Error if GitHub client ID is not configured
   */
  getAuthorizationUrl(): string {
    const redirectUri = `${import.meta.env.VITE_APP_URL}/app/github-callback`;
    const scope = 'repo';
    return `https://github.com/login/oauth/authorize?client_id=${this.githubClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
  }

  /**
   * Handles GitHub OAuth callback after user authorizes
   * @param code - OAuth authorization code from GitHub
   * @returns The created GitHub integration
   * @throws Error if user is not a customer or OAuth exchange fails
   */
  async handleOAuthCallback(code: string): Promise<GitHubIntegration> {
    if (!isCustomerProfile(this.userProfile)) {
      throw new Error('Only customers can authenticate with GitHub');
    }

    const customerProfile = this.userProfile;

    console.info(`[CodeShareManager] Handling OAuth callback for customer: ${customerProfile.id}`);

    await this.codeShareApiManager.handleOAuthCallback(code, customerProfile.id);

    const integration = await this.githubIntegrationStore.getByCustomerId(customerProfile.id);
    if (!integration) {
      throw new Error('Failed to retrieve GitHub integration after OAuth');
    }

    return integration;
  }

  /**
   * Gets the GitHub integration for the current user
   * @returns The GitHub integration or null if not found
   * @throws Error if user is not a customer
   */
  async getIntegration(): Promise<GitHubIntegration | null> {
    if (!isCustomerProfile(this.userProfile)) {
      throw new Error('Only customers can access GitHub integrations');
    }

    const customerProfile = this.userProfile;
    return await this.githubIntegrationStore.getByCustomerId(customerProfile.id);
  }

  /**
   * Validates a GitHub repository URL and checks if user has access
   * @param githubRepoUrl - Full GitHub repository URL
   * @returns Validation response with owner and repo extracted
   * @throws Error if user is not a customer or validation fails
   */
  async validateRepository(githubRepoUrl: string): Promise<{ valid: boolean; owner: string; repo: string }> {
    if (!isCustomerProfile(this.userProfile)) {
      throw new Error('Only customers can validate repositories');
    }

    console.info(`[CodeShareManager] Validating repository: ${githubRepoUrl}`);
    return await this.codeShareApiManager.validateRepository(githubRepoUrl);
  }

  /**
   * Gets a project repository by external URL
   * @param externalProjectUrl - Normalized external project URL
   * @returns The project repository or null if not found
   * @throws Error if user is not a customer
   */
  async getRepositoryByExternalUrl(externalProjectUrl: string): Promise<ProjectRepository | null> {
    if (!isCustomerProfile(this.userProfile)) {
      throw new Error('Only customers can access project repositories');
    }

    const customerProfile = this.userProfile;
    return await this.projectRepositoryStore.getByExternalUrl(customerProfile.id, externalProjectUrl);
  }

  /**
   * Gets all project repositories for the current customer
   * @returns Array of project repositories
   * @throws Error if user is not a customer
   */
  async getAllRepositories(): Promise<ProjectRepository[]> {
    if (!isCustomerProfile(this.userProfile)) {
      throw new Error('Only customers can access project repositories');
    }

    const customerProfile = this.userProfile;
    return await this.projectRepositoryStore.getAllByCustomerId(customerProfile.id);
  }

  /**
   * Creates a repository mapping and invites an engineer as collaborator
   * @param externalProjectUrl - Normalized external project URL
   * @param externalPlatform - Platform name (e.g., 'Lovable', 'Replit')
   * @param externalProjectId - Extracted project ID
   * @param githubRepoUrl - Full GitHub repository URL
   * @param ticketId - The ticket ID for which to invite the engineer
   * @param engineerGithubUsername - Engineer's GitHub username
   * @returns The created project repository and collaborator
   * @throws Error if user is not a customer, validation fails, or invite fails
   */
  async createRepositoryAndInvite(
    externalProjectUrl: string,
    externalPlatform: string,
    externalProjectId: string,
    githubRepoUrl: string,
    ticketId: string,
    engineerGithubUsername: string
  ): Promise<{ repository: ProjectRepository; collaborator: RepositoryCollaborator }> {
    if (!isCustomerProfile(this.userProfile)) {
      throw new Error('Only customers can create repository mappings');
    }

    const customerProfile = this.userProfile;

    console.info(`[CodeShareManager] Creating repository mapping for: ${externalProjectUrl}`);

    // Validate repository first
    const validation = await this.codeShareApiManager.validateRepository(githubRepoUrl);
    if (!validation.valid) {
      throw new Error('Invalid GitHub repository or insufficient access');
    }

    // Create project repository mapping (this is done client-side via store)
    const newRepository: ProjectRepository = {
      id: '', // Will be generated by database
      customerId: customerProfile.id,
      externalProjectUrl,
      externalPlatform,
      externalProjectId,
      githubRepoUrl,
      githubOwner: validation.owner,
      githubRepo: validation.repo,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const repository = await this.projectRepositoryStore.create(newRepository);

    console.info(`[CodeShareManager] Repository created: ${repository.id}`);

    // Invite engineer as collaborator
    const inviteResponse = await this.codeShareApiManager.inviteCollaborator(
      repository.id,
      ticketId,
      engineerGithubUsername
    );

    // Convert API response to RepositoryCollaborator
    const collaborator: RepositoryCollaborator = {
      id: inviteResponse.collaborator.id,
      ticketId: inviteResponse.collaborator.ticketId,
      repositoryId: inviteResponse.collaborator.repositoryId,
      engineerId: inviteResponse.collaborator.engineerId,
      githubUsername: inviteResponse.collaborator.githubUsername,
      invitedAt: new Date(inviteResponse.collaborator.invitedAt),
    };

    return { repository, collaborator };
  }

  /**
   * Invites an engineer as collaborator to an existing repository
   * @param repositoryId - The project repository ID
   * @param ticketId - The ticket ID
   * @param engineerGithubUsername - Engineer's GitHub username
   * @returns The created collaborator
   * @throws Error if user is not a customer or invite fails
   */
  async inviteCollaborator(
    repositoryId: string,
    ticketId: string,
    engineerGithubUsername: string
  ): Promise<RepositoryCollaborator> {
    if (!isCustomerProfile(this.userProfile)) {
      throw new Error('Only customers can invite collaborators');
    }

    console.info(`[CodeShareManager] Inviting collaborator to repository: ${repositoryId}`);

    const inviteResponse = await this.codeShareApiManager.inviteCollaborator(
      repositoryId,
      ticketId,
      engineerGithubUsername
    );

    // Convert API response to RepositoryCollaborator
    const collaborator: RepositoryCollaborator = {
      id: inviteResponse.collaborator.id,
      ticketId: inviteResponse.collaborator.ticketId,
      repositoryId: inviteResponse.collaborator.repositoryId,
      engineerId: inviteResponse.collaborator.engineerId,
      githubUsername: inviteResponse.collaborator.githubUsername,
      invitedAt: new Date(inviteResponse.collaborator.invitedAt),
    };

    return collaborator;
  }

  /**
   * Removes an engineer as collaborator from a repository
   * @param repositoryId - The project repository ID
   * @param ticketId - The ticket ID
   * @param engineerGithubUsername - Engineer's GitHub username
   * @throws Error if user is not a customer or removal fails
   */
  async removeCollaborator(
    repositoryId: string,
    ticketId: string,
    engineerGithubUsername: string
  ): Promise<void> {
    if (!isCustomerProfile(this.userProfile)) {
      throw new Error('Only customers can remove collaborators');
    }

    console.info(`[CodeShareManager] Removing collaborator from repository: ${repositoryId}`);

    await this.codeShareApiManager.removeCollaborator(repositoryId, ticketId, engineerGithubUsername);

    // The collaborator removal will be synced via real-time changes
  }

  /**
   * Gets repository collaborators for a ticket
   * @param ticketId - The ticket ID
   * @returns Array of repository collaborators
   */
  async getCollaboratorsByTicket(ticketId: string): Promise<RepositoryCollaborator[]> {
    return await this.repositoryCollaboratorStore.getAllByTicketId(ticketId);
  }

  /**
   * Reloads data from storage to sync with other tabs
   */
  reload(): void {
    this.githubIntegrationStore.reload();
    this.projectRepositoryStore.reload();
    this.repositoryCollaboratorStore.reload();
  }

  /**
   * Stops listening for changes and cleans up resources
   * Should be called when the manager is no longer needed
   */
  destroy(): void {
    this.githubIntegrationChanges.stop();
    this.projectRepositoryChanges.stop();
    this.repositoryCollaboratorChanges.stop();
    console.debug('CodeShareManager: Stopped listening for code share changes');
  }
}
