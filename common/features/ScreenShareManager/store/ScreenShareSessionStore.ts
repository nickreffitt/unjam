import { type ScreenShareSession } from '@common/types';

/**
 * Interface for screen share session storage
 * Supports both synchronous (localStorage) and asynchronous (Supabase) implementations
 */
export interface ScreenShareSessionStore {
  /**
   * Creates a new screen share session
   * @param session - The session to create (without id and timestamps)
   * @returns The created session
   */
  create(session: Omit<ScreenShareSession, 'id' | 'startedAt' | 'lastActivityAt'>): Promise<ScreenShareSession>;

  /**
   * Gets a session by ID
   * @param sessionId - The session ID
   * @returns The session if found
   */
  getById(sessionId: string): Promise<ScreenShareSession | undefined>;

  /**
   * Gets the active session for a ticket
   * @param ticketId - The ticket ID
   * @returns The active session if found
   */
  getActiveByTicketId(ticketId: string): Promise<ScreenShareSession | undefined>;

  /**
   * Gets all sessions for a specific ticket
   * @param ticketId - The ticket ID
   * @returns Array of sessions for the ticket
   */
  getByTicketId(ticketId: string): Promise<ScreenShareSession[]>;

  /**
   * Gets sessions by request ID
   * @param requestId - The request ID that initiated the session
   * @returns Array of sessions for the request
   */
  getByRequestId(requestId: string): Promise<ScreenShareSession[]>;

  /**
   * Updates a session
   * @param sessionId - The session ID
   * @param updates - The updates to apply
   * @returns The updated session if found
   */
  update(
    sessionId: string,
    updates: Partial<Pick<ScreenShareSession, 'status' | 'streamId' | 'errorMessage' | 'endedAt'>>
  ): Promise<ScreenShareSession | undefined>;

  /**
   * Updates the last activity time for a session (for heartbeat/keepalive)
   * @param sessionId - The session ID
   * @returns True if updated, false if not found
   */
  updateActivity(sessionId: string): Promise<boolean>;

  /**
   * Ends a session
   * @param sessionId - The session ID
   * @returns The ended session if found
   */
  endSession(sessionId: string): Promise<ScreenShareSession | undefined>;

  /**
   * Marks a session as having an error
   * @param sessionId - The session ID
   * @param errorMessage - The error message
   * @returns The updated session if found
   */
  markError(sessionId: string, errorMessage: string): Promise<ScreenShareSession | undefined>;

  /**
   * Gets all sessions
   * @returns All screen share sessions
   */
  getAll(): Promise<ScreenShareSession[]>;

  /**
   * Gets active sessions (initializing or active status)
   * @returns Array of active sessions
   */
  getActiveSessions(): Promise<ScreenShareSession[]>;

  /**
   * Clears all sessions (mainly for testing purposes)
   */
  clear(): Promise<void>;

  /**
   * Reloads sessions from storage
   * Used when we need to sync with changes made by other tabs
   */
  reload(): void;
}