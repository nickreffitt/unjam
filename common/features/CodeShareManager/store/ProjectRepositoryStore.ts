import { type ProjectRepository } from '@common/types';

/**
 * Interface for project repository storage implementations
 * Frontend stores handle both queries and mutations (creation)
 * Other mutations (invites/removes) handled via CodeShareApiManager
 */
export interface ProjectRepositoryStore {
  /**
   * Creates a new project repository mapping
   * @param repository - The repository to create
   * @returns The created repository with generated ID
   */
  create(repository: ProjectRepository): Promise<ProjectRepository>;

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
  getByExternalUrl(customerId: string, externalProjectUrl: string): Promise<ProjectRepository | null>;

  /**
   * Gets all repositories for a customer
   * @param customerId - The customer profile ID
   * @returns Array of project repositories
   */
  getAllByCustomerId(customerId: string): Promise<ProjectRepository[]>;

  /**
   * Reloads repositories from storage
   * Used when we need to sync with changes made by other tabs/sources
   */
  reload(): void;
}
