import { type ScreenShareStatus, type ScreenShareRequest } from '@common/types';

/**
 * Interface for screen share request storage
 * Supports both synchronous (localStorage) and asynchronous (Supabase) implementations
 */
export interface ScreenShareRequestStore {
  /**
   * Creates a new screen share request
   * @param request - The request to create
   * @returns The created request
   */
  create(request: Omit<ScreenShareRequest, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt'>): Promise<ScreenShareRequest>;

  /**
   * Gets a screen share request by ID
   * @param requestId - The request ID
   * @returns The request if found
   */
  getById(requestId: string): Promise<ScreenShareRequest | undefined>;

  /**
   * Gets all requests for a specific ticket
   * @param ticketId - The ticket ID
   * @returns Array of requests for the ticket
   */
  getByTicketId(ticketId: string): Promise<ScreenShareRequest[]>;

  /**
   * Gets the active request for a ticket (pending, accepted, or active status)
   * @param ticketId - The ticket ID
   * @returns The active request if found and not expired
   */
  getActiveByTicketId(ticketId: string): Promise<ScreenShareRequest | undefined>;

  /**
   * Updates the status of a screen share request
   * @param requestId - The request ID
   * @param status - The new status
   * @returns The updated request if found
   */
  updateStatus(requestId: string, status: ScreenShareStatus): Promise<ScreenShareRequest | undefined>;

  /**
   * Deletes a screen share request (for cancellation)
   * @param requestId - The request ID to delete
   * @returns True if deleted, false if not found
   */
  delete(requestId: string): Promise<boolean>;

  /**
   * Gets all requests
   * @returns All screen share requests
   */
  getAll(): Promise<ScreenShareRequest[]>;

  /**
   * Clears all requests (mainly for testing purposes)
   */
  clear(): Promise<void>;

  /**
   * Reloads requests from storage
   * Used when we need to sync with changes made by other tabs
   */
  reload(): void;
}