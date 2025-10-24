import {
  type GitHubIntegration,
  type ProjectRepository,
  type RepositoryCollaborator,
  type CodeShareRequest
} from '@common/types';
import { type Tables } from '@common/supabase.types.ts';

/**
 * Utility class for mapping Supabase database rows to GitHub domain objects
 */
export class GitHubSupabaseRowMapper {
  /**
   * Maps a database row to a GitHubIntegration object
   */
  static mapRowToGitHubIntegration(row: Tables<'github_integrations'>): GitHubIntegration {
    return {
      id: row.id,
      customerId: row.customer_id,
      githubAccessToken: row.github_access_token,
      githubUsername: row.github_username,
      githubUserId: row.github_user_id,
      createdAt: new Date(row.created_at!),
      updatedAt: new Date(row.updated_at!),
    };
  }

  /**
   * Maps a database row to a ProjectRepository object
   */
  static mapRowToProjectRepository(row: Tables<'project_repositories'>): ProjectRepository {
    return {
      id: row.id,
      customerId: row.customer_id,
      externalProjectUrl: row.external_project_url,
      externalPlatform: row.external_platform,
      externalProjectId: row.external_project_id,
      githubRepoUrl: row.github_repo_url,
      githubOwner: row.github_owner,
      githubRepo: row.github_repo,
      createdAt: new Date(row.created_at!),
      updatedAt: new Date(row.updated_at!),
    };
  }

  /**
   * Maps a database row to a RepositoryCollaborator object
   */
  static mapRowToRepositoryCollaborator(row: Tables<'repository_collaborators'>): RepositoryCollaborator {
    return {
      id: row.id,
      repositoryId: row.repository_id,
      engineerId: row.engineer_id,
      githubUsername: row.github_username,
      invitedAt: new Date(row.invited_at!),
      removedAt: row.removed_at ? new Date(row.removed_at) : undefined,
    };
  }

  /**
   * Maps a database row to a CodeShareRequest object
   * Expects row to have sender and receiver objects populated via Supabase joins
   */
  static mapRowToCodeShareRequest(row: any): CodeShareRequest {
    // Extract sender and receiver objects
    const sender = row.sender as Record<string, unknown>;
    const receiver = row.receiver as Record<string, unknown>;

    return {
      id: row.id as string,
      sender: {
        id: sender.id as string,
        name: sender.name as string,
        type: sender.type as 'engineer' | 'customer',
        email: sender.email as string,
        authId: sender.auth_id as string,
      },
      receiver: {
        id: receiver.id as string,
        name: receiver.name as string,
        type: receiver.type as 'engineer' | 'customer',
        email: receiver.email as string,
        authId: receiver.auth_id as string,
      },
      status: row.status as 'pending' | 'accepted' | 'rejected' | 'expired',
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      expiresAt: new Date(row.expires_at as string),
    };
  }
}
