import { type SupabaseClient } from '@supabase/supabase-js';
import { type Ticket } from '@common/types';


/**
 * Response from OAuth callback endpoint
 */
export interface OAuthCallbackResponse {
  success: boolean;
  integration: {
    id: string;
    customerId: string;
    githubUsername: string;
    githubUserId: string;
  };
}

/**
 * Response from validate repository endpoint
 */
export interface ValidateRepositoryResponse {
  valid: boolean;
  owner: string;
  repo: string;
}

/**
 * Response from invite collaborator endpoint
 */
export interface InviteCollaboratorResponse {
  success: boolean;
  collaborator: {
    id: string;
    repositoryId: string;
    engineerId: string;
    githubUsername: string;
    invitedAt: string;
  };
}

/**
 * Response from remove collaborator endpoint
 */
export interface RemoveCollaboratorResponse {
  success: boolean;
}

/**
 * CodeShareApiManager handles communication with the code-share edge function
 * Manages GitHub OAuth, repository validation, and collaborator management
 */
export class CodeShareApiManager {
  private supabaseClient: SupabaseClient;
  private apiUrl: string;

  constructor(supabaseClient: SupabaseClient, apiUrl: string) {
    if (!supabaseClient) {
      throw new Error('CodeShareApiManager: supabaseClient is required');
    }
    if (!apiUrl) {
      throw new Error('CodeShareApiManager: apiUrl is required');
    }
    this.supabaseClient = supabaseClient;
    this.apiUrl = apiUrl;
  }

  /**
   * Handles GitHub OAuth callback after user authorizes
   * @param code - OAuth authorization code from GitHub
   * @param customerId - The customer profile ID
   * @returns OAuth callback response with integration details
   * @throws Error if the request fails or OAuth exchange fails
   */
  async handleOAuthCallback(code: string, customerId: string): Promise<OAuthCallbackResponse> {
    console.info(`[CodeShareApiManager] Handling OAuth callback for customer: ${customerId}`);

    try {
      const response = await this.makeAuthenticatedRequest<OAuthCallbackResponse>(
        'code-share',
        {
          action_type: 'oauth_callback',
          payload: {
            code,
            customer_id: customerId
          }
        },
        'Failed to handle OAuth callback'
      );

      console.info(`[CodeShareApiManager] Successfully handled OAuth callback`);
      return response;

    } catch (err) {
      const error = err as Error;
      console.error('[CodeShareApiManager] Error handling OAuth callback:', error.message);
      throw error;
    }
  }

  /**
   * Validates that a GitHub repository exists and user has access
   * @param githubRepoUrl - Full GitHub repository URL
   * @returns Validation response with owner and repo extracted
   * @throws Error if the request fails or repository is invalid
   */
  async validateRepository(githubRepoUrl: string, customerId: string): Promise<ValidateRepositoryResponse> {
    console.info(`[CodeShareApiManager] Validating repository: ${githubRepoUrl} with customerId: ${customerId}`);

    try {
      const response = await this.makeAuthenticatedRequest<ValidateRepositoryResponse>(
        'code-share',
        {
          action_type: 'validate_repository',
          payload: {
            github_repo_url: githubRepoUrl,
            customer_id: customerId
          }
        },
        'Failed to validate repository'
      );

      console.info(`[CodeShareApiManager] Repository validation result: ${response.valid}`);
      return response;  

    } catch (err) {
      const error = err as Error;
      console.error('[CodeShareApiManager] Error validating repository:', error.message);
      throw error;
    }
  }

  /**
   * Invites an engineer as a collaborator to a GitHub repository
   * @param repositoryId - The project repository ID
   * @param ticket - The active ticket
   * @returns Invite response with collaborator details
   * @throws Error if the request fails or invite cannot be sent
   */
  async inviteCollaborator(
    repositoryId: string,
    ticket: Ticket,
  ): Promise<InviteCollaboratorResponse> {
    console.info(
      `[CodeShareApiManager] Inviting collaborator ${ticket.assignedTo?.githubUsername} to repository ${repositoryId}`
    );

    try {
      const response = await this.makeAuthenticatedRequest<InviteCollaboratorResponse>(
        'code-share',
        {
          action_type: 'invite_collaborator',
          payload: {
            customer_id: ticket.createdBy.id,
            repository_id: repositoryId,
            engineer_id: ticket.assignedTo?.id,
            engineer_github_username: ticket.assignedTo?.githubUsername
          }
        },
        'Failed to invite collaborator'
      );

      console.info(`[CodeShareApiManager] Successfully invited collaborator`);
      return response;

    } catch (err) {
      const error = err as Error;
      console.error('[CodeShareApiManager] Error inviting collaborator:', error.message);
      throw error;
    }
  }

  /**
   * Removes an engineer as a collaborator from a GitHub repository
   * @param repositoryId - The project repository ID
   * @param ticket - The active ticket
   * @returns Remove response
   * @throws Error if the request fails or removal cannot be processed
   */
  async removeCollaborator(
    repositoryId: string,
    ticket: Ticket,
  ): Promise<RemoveCollaboratorResponse> {
    console.info(
      `[CodeShareApiManager] Removing collaborator ${ticket.assignedTo?.githubUsername} from repository ${repositoryId}`
    );

    try {
      const response = await this.makeAuthenticatedRequest<RemoveCollaboratorResponse>(
        'code-share',
        {
          action_type: 'remove_collaborator',
          payload: {
            customer_id: ticket.createdBy.id,
            repository_id: repositoryId,
            engineer_id: ticket.assignedTo?.id,
            engineer_github_username: ticket.assignedTo?.githubUsername
          }
        },
        'Failed to remove collaborator'
      );

      console.info(`[CodeShareApiManager] Successfully removed collaborator`);
      return response;

    } catch (err) {
      const error = err as Error;
      console.error('[CodeShareApiManager] Error removing collaborator:', error.message);
      throw error;
    }
  }

  /**
   * Makes an authenticated POST request to an edge function
   * @param endpoint - The edge function endpoint (e.g., 'code-share')
   * @param body - The request body
   * @param errorContext - Context string for error messages
   * @returns The response data
   * @throws Error if authentication fails or request fails
   */
  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    body: unknown,
    errorContext: string
  ): Promise<T> {
    // Get the current session to access the auth token
    const { data: { session }, error: sessionError } = await this.supabaseClient.auth.getSession();

    if (sessionError || !session) {
      throw new Error('No active session found. Please sign in.');
    }

    // Make request to edge function
    const response = await fetch(`${this.apiUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `${errorContext}: ${response.statusText}`);
    }

    return await response.json();
  }
}
