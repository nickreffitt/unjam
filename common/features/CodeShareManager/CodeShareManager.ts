import {
  type Ticket,
  type GitHubIntegration,
  type ProjectRepository,
  type RepositoryCollaborator,
  type UserProfile,
  type CodeShareRequest
} from '@common/types';
import { isCustomerProfile, isEngineerProfile } from '@common/util';
import { type CodeShareApiManager } from '@common/features/CodeShareApiManager/CodeShareApiManager';
import {
  type GitHubIntegrationStore,
  type ProjectRepositoryStore,
  type RepositoryCollaboratorStore,
  type GitHubIntegrationChanges,
  type ProjectRepositoryChanges,
  type RepositoryCollaboratorChanges,
  type CodeShareRequestStore
} from './store';
import { type CodeShareRequestChanges } from './store/CodeShareRequestChanges';

/**
 * CodeShareManager handles GitHub repository sharing and code share requests
 * Manages OAuth flow, repository validation, collaborator invitations, and code share requests
 */
export class CodeShareManager {
  private userProfile: UserProfile;
  private githubIntegrationStore: GitHubIntegrationStore;
  private codeShareRequestStore: CodeShareRequestStore;
  private projectRepositoryStore: ProjectRepositoryStore;
  private repositoryCollaboratorStore: RepositoryCollaboratorStore;
  private githubIntegrationChanges: GitHubIntegrationChanges;
  private codeShareRequestChanges: CodeShareRequestChanges;
  private projectRepositoryChanges: ProjectRepositoryChanges;
  private repositoryCollaboratorChanges: RepositoryCollaboratorChanges;
  private codeShareApiManager: CodeShareApiManager;
  private githubClientId: string;

  constructor(
    userProfile: UserProfile,
    githubIntegrationStore: GitHubIntegrationStore,
    codeShareRequestStore: CodeShareRequestStore,
    projectRepositoryStore: ProjectRepositoryStore,
    repositoryCollaboratorStore: RepositoryCollaboratorStore,
    githubIntegrationChanges: GitHubIntegrationChanges,
    codeShareRequestChanges: CodeShareRequestChanges,
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
    this.codeShareRequestStore = codeShareRequestStore;
    this.projectRepositoryStore = projectRepositoryStore;
    this.repositoryCollaboratorStore = repositoryCollaboratorStore;
    this.githubIntegrationChanges = githubIntegrationChanges;
    this.codeShareRequestChanges = codeShareRequestChanges;
    this.projectRepositoryChanges = projectRepositoryChanges;
    this.repositoryCollaboratorChanges = repositoryCollaboratorChanges;

    this.codeShareApiManager = codeShareApiManager;
    this.githubClientId = githubClientId;

    // Start listening for changes
    this.githubIntegrationChanges.start(userProfile.id);
    this.codeShareRequestChanges.start(userProfile.id);
    this.projectRepositoryChanges.start(userProfile.id);
    this.repositoryCollaboratorChanges.start(userProfile.id);
    console.debug('CodeShareManager: Started listening for code share changes');
  }

  // ===== GitHub OAuth Methods =====

  /**
   * Gets the GitHub OAuth authorization URL
   * @returns The full GitHub OAuth URL for authorization
   * @throws Error if GitHub client ID is not configured
   */
  getAuthorizationUrl(): string {
    const redirectUri = `${import.meta.env.VITE_APP_URL}/github/callback`;
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

  // ===== Repository Management Methods =====

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
    const customerProfile = this.userProfile;

    console.info(`[CodeShareManager] Validating repository: ${githubRepoUrl}`);
    return await this.codeShareApiManager.validateRepository(githubRepoUrl, customerProfile.id);
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
    return await this.projectRepositoryStore.getByCustomerAndExternalUrl(customerProfile.id, externalProjectUrl);
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
   * Gets all project repositories for a specific customer
   * Engineers can access this for customers whose tickets they are assigned to
   * @param customerId - The customer profile ID
   * @returns Array of project repositories
   */
  async getRepositoriesForCustomer(customerId: string): Promise<ProjectRepository[]> {
    return await this.projectRepositoryStore.getAllByCustomerId(customerId);
  }

  /**
   * Creates a repository mapping and invites an engineer as collaborator
   * @param externalProjectUrl - Normalized external project URL
   * @param externalPlatform - Platform name (e.g., 'Lovable', 'Replit')
   * @param externalProjectId - Extracted project ID
   * @param githubRepoUrl - Full GitHub repository URL
   * @param ticket - The active ticket
   * @returns The created project repository and collaborator
   * @throws Error if user is not a customer, validation fails, or invite fails
   */
  async createRepositoryAndInvite(
    externalProjectUrl: string,
    externalPlatform: string,
    externalProjectId: string,
    githubRepoUrl: string,
    ticket: Ticket,
  ): Promise<{ repository: ProjectRepository; collaborator: RepositoryCollaborator }> {
    if (!isCustomerProfile(this.userProfile)) {
      throw new Error('Only customers can create repository mappings');
    }

    const customerProfile = this.userProfile;

    console.info(`[CodeShareManager] Creating repository mapping for: ${externalProjectUrl}`);

    // Validate repository first
    const validation = await this.codeShareApiManager.validateRepository(githubRepoUrl, customerProfile.id);
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

    const repository = await this.projectRepositoryStore.upsert(newRepository);

    console.info(`[CodeShareManager] Repository created: ${repository.id}`);

    // Invite engineer as collaborator
    const inviteResponse = await this.codeShareApiManager.inviteCollaborator(
      repository.id,
      ticket,
    );

    // Convert API response to RepositoryCollaborator
    const collaborator: RepositoryCollaborator = {
      id: inviteResponse.collaborator.id,
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
   * @param ticket - The active ticket
   * @returns The created collaborator
   * @throws Error if user is not a customer or invite fails
   */
  async inviteCollaborator(
    repositoryId: string,
    ticket: Ticket,
  ): Promise<RepositoryCollaborator> {
    if (!isCustomerProfile(this.userProfile)) {
      throw new Error('Only customers can invite collaborators');
    }

    console.info(`[CodeShareManager] Inviting collaborator to repository: ${repositoryId}`);
    const inviteResponse = await this.codeShareApiManager.inviteCollaborator(
      repositoryId,
      ticket);

    // Convert API response to RepositoryCollaborator
    const collaborator: RepositoryCollaborator = {
      id: inviteResponse.collaborator.id,
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
   * @param ticket - The active ticket
   * @throws Error if user is not a customer or removal fails
   */
  async removeCollaborator(
    repositoryId: string,
    ticket: Ticket,
  ): Promise<void> {
    if (!isCustomerProfile(this.userProfile)) {
      throw new Error('Only customers can remove collaborators');
    }

    console.info(`[CodeShareManager] Removing collaborator from repository: ${repositoryId}`);
    await this.codeShareApiManager.removeCollaborator(
      repositoryId,
      ticket);

    // The collaborator removal will be synced via real-time changes
  }

  /**
   * Gets a collaborator by repository and engineer ID
   * @param repositoryId - The repository ID
   * @param engineerId - The engineer ID
   * @returns The repository collaborator if found, null otherwise
   */
  async getCollaboratorByRepositoryAndEngineer(repositoryId: string, engineerId: string): Promise<RepositoryCollaborator | null> {
    return await this.repositoryCollaboratorStore.getByRepositoryAndEngineer(repositoryId, engineerId);
  }

  // ===== Code Share Request Methods =====

  /**
   * Engineer requests code share from a customer
   * @param engineer - The engineer requesting code share
   * @param customer - The customer being requested
   * @returns The created request
   */
  async requestCodeShare(engineer: UserProfile, customer: UserProfile): Promise<CodeShareRequest> {
    if (!isEngineerProfile(this.userProfile)) {
      throw new Error('Only engineers can request code share');
    }
    
    // Check if there's already an active request for this ticket
    const existingRequest = await this.codeShareRequestStore.getActiveByUserId(engineer.id);
    if (existingRequest) {
      throw new Error('There is already an active code share request for this ticket');
    }

    // Validate user types
    if (engineer.type !== 'engineer') {
      throw new Error('Only engineers can request code sharing');
    }
    if (customer.type !== 'customer') {
      throw new Error('Code sharing can only be requested from customers');
    }

    const request = await this.codeShareRequestStore.create({
      sender: engineer,
      receiver: customer,
      status: 'pending',
    });

    console.debug('CodeShareManager: Engineer requested code share', request.id);
    return request;
  }

  /**
   * Get the active code share request for a ticket
   * @param ticketId - The ticket ID
   * @returns The active request or undefined
   */
  async getActiveCodeShareRequest(): Promise<CodeShareRequest | undefined> {
    if (!isEngineerProfile(this.userProfile)) {
      throw new Error('Only engineers can request code share');
    }
    return await this.codeShareRequestStore.getActiveByUserId(this.userProfile.id);
  }

  /**
   * Get all code share requests for a ticket
   * @param ticketId - The ticket ID
   * @returns Array of requests
   */
  async getAllCodeShareRequests(): Promise<CodeShareRequest[]> {
    if (!isEngineerProfile(this.userProfile)) {
      throw new Error('Only engineers can request code share');
    }
    return await this.codeShareRequestStore.getByUserId(this.userProfile.id);
  }

  /**
   * Mark a code share request as expired
   * @param requestId - The request ID to expire
   * @returns The updated request
   */
  async expireCodeShareRequest(requestId: string): Promise<CodeShareRequest | undefined> {
    const request = await this.codeShareRequestStore.getById(requestId);
    if (!request) {
      console.warn('CodeShareManager: Cannot expire request - not found:', requestId);
      return undefined;
    }

    // Only expire pending requests
    if (request.status !== 'pending') {
      console.debug('CodeShareManager: Request is not pending, skipping expiration:', requestId, 'status:', request.status);
      return request;
    }

    const updatedRequest = await this.codeShareRequestStore.updateStatus(requestId, 'expired');
    console.debug('CodeShareManager: Expired request', requestId);
    return updatedRequest;
  }

  /**
   * Update a code share request status
   * @param requestId - The request ID to update
   * @param status - The new status
   * @returns The updated request
   */
  async updateCodeShareRequestStatus(requestId: string, status: 'pending' | 'accepted' | 'rejected' | 'expired'): Promise<CodeShareRequest | undefined> {
    const request = await this.codeShareRequestStore.getById(requestId);
    if (!request) {
      console.warn('CodeShareManager: Cannot update request - not found:', requestId);
      return undefined;
    }

    const updatedRequest = await this.codeShareRequestStore.updateStatus(requestId, status);
    console.debug('CodeShareManager: Updated request status', requestId, status);
    return updatedRequest;
  }

  /**
   * Reloads data from storage to sync with other tabs
   */
  reload(): void {
    this.githubIntegrationStore.reload();
    this.codeShareRequestStore.reload();
    this.projectRepositoryStore.reload();
    this.repositoryCollaboratorStore.reload();
  }

  /**
   * Stops listening for changes and cleans up resources
   * Should be called when the manager is no longer needed
   */
  destroy(): void {
    this.githubIntegrationChanges.stop();
    this.codeShareRequestChanges.stop()
    this.projectRepositoryChanges.stop();
    this.repositoryCollaboratorChanges.stop();
    console.debug('CodeShareManager: Stopped listening for code share changes');
  }
}
