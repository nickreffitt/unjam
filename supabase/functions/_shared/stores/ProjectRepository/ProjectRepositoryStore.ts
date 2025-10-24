import { type ProjectRepository } from '@types';

/**
 * Interface for project repository storage implementations
 * Defines the contract that all project repository store implementations must follow
 */
export interface ProjectRepositoryStore {
  /**
   * Gets a project repository by ID
   * @param id - The repository ID
   * @returns The project repository if found, null otherwise
   */
  getById(id: string): Promise<ProjectRepository | null>;

  /**
   * Gets a project repository by customer ID and external project URL
   * @param customerId - The customer profile ID
   * @param externalProjectUrl - The external project URL
   * @returns The project repository if found, null otherwise
   */
  getByCustomerAndExternalUrl(customerId: string, externalProjectUrl: string): Promise<ProjectRepository | null>;

  /**
   * Gets a project repository by GitHub owner and repository name
   * @param owner - The GitHub repository owner
   * @param repo - The GitHub repository name
   * @returns The project repository if found, null otherwise
   */
  getByGitHubRepo(owner: string, repo: string): Promise<ProjectRepository | null>;

  /**
   * Gets all repositories for a customer
   * @param customerId - The customer profile ID
   * @returns Array of project repositories
   */
  getAllByCustomerId(customerId: string): Promise<ProjectRepository[]>;

  /**
   * Creates or updates a project repository mapping
   * @param repository - The repository data
   * @returns The created/updated project repository
   */
  upsert(repository: Omit<ProjectRepository, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectRepository>;

  /**
   * Deletes a project repository by ID
   * @param id - The repository ID
   */
  delete(id: string): Promise<void>;
}
