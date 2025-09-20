import { type ScreenShareStatus, type ScreenShareRequest } from '@common/types';
import { ScreenShareEventEmitter } from '../events';

export class ScreenShareRequestStore {
  private requests: Map<string, ScreenShareRequest> = new Map();
  private readonly storageKey = 'screenShareRequests';
  private readonly eventEmitter: ScreenShareEventEmitter;

  constructor() {
    this.eventEmitter = new ScreenShareEventEmitter();
    this.loadRequestsFromStorage();
  }

  /**
   * Creates a new screen share request
   * @param request - The request to create
   * @returns The created request
   */
  create(request: Omit<ScreenShareRequest, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt'>): ScreenShareRequest {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 1000); // 10 seconds from now

    const newRequest: ScreenShareRequest = {
      ...request,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    this.requests.set(newRequest.id, newRequest);
    this.saveRequestsToStorage();

    console.debug('ScreenShareRequestStore: Created request', newRequest.id, 'for ticket', newRequest.ticketId);

    // Emit event for cross-tab communication
    this.eventEmitter.emitScreenShareRequestCreated(newRequest);

    return { ...newRequest };
  }

  /**
   * Gets a screen share request by ID
   * @param requestId - The request ID
   * @returns The request if found
   */
  getById(requestId: string): ScreenShareRequest | undefined {
    const request = this.requests.get(requestId);
    return request ? { ...request } : undefined;
  }

  /**
   * Gets all requests for a specific ticket
   * @param ticketId - The ticket ID
   * @returns Array of requests for the ticket
   */
  getByTicketId(ticketId: string): ScreenShareRequest[] {
    const requests: ScreenShareRequest[] = [];

    this.requests.forEach(request => {
      if (request.ticketId === ticketId) {
        requests.push({ ...request });
      }
    });

    return requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Gets the active request for a ticket (pending, accepted, or active status)
   * @param ticketId - The ticket ID
   * @returns The active request if found and not expired
   */
  getActiveByTicketId(ticketId: string): ScreenShareRequest | undefined {
    const activeStatuses: ScreenShareStatus[] = ['pending', 'accepted', 'active'];
    const now = new Date();

    for (const request of this.requests.values()) {
      if (request.ticketId === ticketId && activeStatuses.includes(request.status)) {
        // Check if request has expired
        if (request.expiresAt && request.expiresAt <= now) {
          console.debug('ScreenShareRequestStore: Request', request.id, 'has expired');
          continue; // Skip expired requests
        }
        return { ...request };
      }
    }

    return undefined;
  }

  /**
   * Updates the status of a screen share request
   * @param requestId - The request ID
   * @param status - The new status
   * @returns The updated request if found
   */
  updateStatus(requestId: string, status: ScreenShareStatus): ScreenShareRequest | undefined {
    const request = this.requests.get(requestId);

    if (!request) {
      console.warn('ScreenShareRequestStore: Request not found for update', requestId);
      return undefined;
    }

    request.status = status;
    request.updatedAt = new Date();

    this.saveRequestsToStorage();
    console.debug('ScreenShareRequestStore: Updated request', requestId, 'status to', status);

    // Emit event for cross-tab communication
    this.eventEmitter.emitScreenShareRequestUpdated(request);

    return { ...request };
  }

  /**
   * Deletes a screen share request (for cancellation)
   * @param requestId - The request ID to delete
   * @returns True if deleted, false if not found
   */
  delete(requestId: string): boolean {
    const deleted = this.requests.delete(requestId);

    if (deleted) {
      this.saveRequestsToStorage();
      console.debug('ScreenShareRequestStore: Deleted request', requestId);
    } else {
      console.warn('ScreenShareRequestStore: Request not found for deletion', requestId);
    }

    return deleted;
  }

  /**
   * Gets all requests
   * @returns All screen share requests
   */
  getAll(): ScreenShareRequest[] {
    return Array.from(this.requests.values()).map(request => ({ ...request }));
  }

  /**
   * Clears all requests (mainly for testing purposes)
   */
  clear(): void {
    this.requests.clear();
    this.saveRequestsToStorage();
    console.debug('ScreenShareRequestStore: Cleared all requests');
  }

  /**
   * Reloads requests from localStorage
   * Used when we need to sync with changes made by other tabs
   */
  reload(): void {
    this.loadRequestsFromStorage();
    console.debug('ScreenShareRequestStore: Reloaded requests from storage');
  }

  /**
   * Loads requests from localStorage
   */
  private loadRequestsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);

      if (stored) {
        const parsedRequests = JSON.parse(stored) as ScreenShareRequest[];
        this.requests.clear();

        parsedRequests.forEach(request => {
          // Convert date strings back to Date objects
          this.requests.set(request.id, {
            ...request,
            createdAt: new Date(request.createdAt),
            updatedAt: new Date(request.updatedAt),
            expiresAt: new Date(request.expiresAt),
          });
        });

        console.debug(`ScreenShareRequestStore: Loaded ${this.requests.size} requests from localStorage`);
      } else {
        this.requests.clear();
        console.debug('ScreenShareRequestStore: No requests found in localStorage, initialized empty');
      }
    } catch (error) {
      console.error('ScreenShareRequestStore: Error loading requests from localStorage', error);
      this.requests.clear();
    }
  }

  /**
   * Saves requests to localStorage
   */
  private saveRequestsToStorage(): void {
    try {
      const requestsArray = Array.from(this.requests.values());
      localStorage.setItem(this.storageKey, JSON.stringify(requestsArray));
      console.debug(`ScreenShareRequestStore: Saved ${requestsArray.length} requests to localStorage`);
    } catch (error) {
      console.error('ScreenShareRequestStore: Error saving requests to localStorage:', error);
    }
  }

  /**
   * Generates a unique ID for requests
   */
  private generateId(): string {
    return `ssr-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}