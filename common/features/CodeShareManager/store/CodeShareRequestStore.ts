import { type CodeShareStatus, type CodeShareRequest } from '@common/types';

/**
 * Interface for code share request storage
 * Supports asynchronous (Supabase) implementation
 */
export interface CodeShareRequestStore {
  /**
   * Creates a new code share request
   * @param request - The request to create
   * @returns The created request
   */
  create(request: Omit<CodeShareRequest, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt'>): Promise<CodeShareRequest>;

  /**
   * Gets a code share request by ID
   * @param requestId - The request ID
   * @returns The request if found
   */
  getById(requestId: string): Promise<CodeShareRequest | undefined>;

  /**
   * Gets all requests for a specific user (as sender or receiver)
   * @param userId - The user profile ID
   * @returns Array of requests for the user
   */
  getByUserId(userId: string): Promise<CodeShareRequest[]>;

  /**
   * Gets the active request for a user (pending status, not expired)
   * @param userId - The user profile ID
   * @returns The active request if found
   */
  getActiveByUserId(userId: string): Promise<CodeShareRequest | undefined>;

  /**
   * Updates the status of a code share request
   * @param requestId - The request ID
   * @param status - The new status
   * @returns The updated request if found
   */
  updateStatus(requestId: string, status: CodeShareStatus): Promise<CodeShareRequest | undefined>;

  /**
   * Deletes a code share request (for cancellation)
   * @param requestId - The request ID to delete
   * @returns True if deleted, false if not found
   */
  delete(requestId: string): Promise<boolean>;

  /**
   * Reloads repositories from storage
   * Used when we need to sync with changes made by other tabs/sources
   */
  reload(): void;
}
