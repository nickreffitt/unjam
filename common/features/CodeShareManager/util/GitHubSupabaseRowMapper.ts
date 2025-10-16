import {
  type GitHubIntegration,
  type ProjectRepository,
  type RepositoryCollaborator
} from '@common/types';
import { type Tables } from '@common/supabase.types';

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
      ticketId: row.ticket_id,
      repositoryId: row.repository_id,
      engineerId: row.engineer_id,
      githubUsername: row.github_username,
      invitedAt: new Date(row.invited_at!),
      removedAt: row.removed_at ? new Date(row.removed_at) : undefined,
    };
  }
}
