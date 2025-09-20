import { type ScreenShareSession, type SessionStatus } from '@common/types';
import { ScreenShareEventEmitter } from '../events/ScreenShareEventEmitter';

export class ScreenShareSessionStore {
  private sessions: Map<string, ScreenShareSession> = new Map();
  private readonly storageKey = 'screenShareSessions';
  private readonly eventEmitter: ScreenShareEventEmitter;

  constructor() {
    this.eventEmitter = new ScreenShareEventEmitter();
    this.loadSessionsFromStorage();
  }

  /**
   * Creates a new screen share session
   * @param session - The session to create (without id and timestamps)
   * @returns The created session
   */
  create(session: Omit<ScreenShareSession, 'id' | 'startedAt' | 'lastActivityAt'>): ScreenShareSession {
    const newSession: ScreenShareSession = {
      ...session,
      id: this.generateId(),
      startedAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.sessions.set(newSession.id, newSession);
    this.saveSessionsToStorage();

    console.debug('ScreenShareSessionStore: Created session', newSession.id, 'for ticket', newSession.ticketId);

    // Emit the session created event
    this.eventEmitter.emitScreenShareSessionCreated(newSession);

    return { ...newSession };
  }

  /**
   * Gets a session by ID
   * @param sessionId - The session ID
   * @returns The session if found
   */
  getById(sessionId: string): ScreenShareSession | undefined {
    const session = this.sessions.get(sessionId);
    return session ? { ...session } : undefined;
  }

  /**
   * Gets the active session for a ticket
   * @param ticketId - The ticket ID
   * @returns The active session if found
   */
  getActiveByTicketId(ticketId: string): ScreenShareSession | undefined {
    const activeStatuses: SessionStatus[] = ['initializing', 'active'];

    for (const session of this.sessions.values()) {
      if (session.ticketId === ticketId && activeStatuses.includes(session.status)) {
        return { ...session };
      }
    }

    return undefined;
  }

  /**
   * Gets all sessions for a specific ticket
   * @param ticketId - The ticket ID
   * @returns Array of sessions for the ticket
   */
  getByTicketId(ticketId: string): ScreenShareSession[] {
    const sessions: ScreenShareSession[] = [];

    this.sessions.forEach(session => {
      if (session.ticketId === ticketId) {
        sessions.push({ ...session });
      }
    });

    return sessions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  /**
   * Gets sessions by request ID
   * @param requestId - The request ID that initiated the session
   * @returns Array of sessions for the request
   */
  getByRequestId(requestId: string): ScreenShareSession[] {
    const sessions: ScreenShareSession[] = [];

    this.sessions.forEach(session => {
      if (session.requestId === requestId) {
        sessions.push({ ...session });
      }
    });

    return sessions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  /**
   * Updates a session (for customer/publisher only)
   * @param sessionId - The session ID
   * @param updates - The updates to apply
   * @returns The updated session if found
   */
  update(
    sessionId: string,
    updates: Partial<Pick<ScreenShareSession, 'status' | 'streamId' | 'errorMessage' | 'endedAt'>>
  ): ScreenShareSession | undefined {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.warn('ScreenShareSessionStore: Session not found for update', sessionId);
      return undefined;
    }

    // Apply updates
    if (updates.status !== undefined) {
      session.status = updates.status;
    }
    if (updates.streamId !== undefined) {
      session.streamId = updates.streamId;
    }
    if (updates.errorMessage !== undefined) {
      session.errorMessage = updates.errorMessage;
    }
    if (updates.endedAt !== undefined) {
      session.endedAt = updates.endedAt;
    }

    // Update last activity timestamp
    session.lastActivityAt = new Date();

    // If ending the session, set endedAt if not already set
    if (updates.status === 'ended' && !session.endedAt) {
      session.endedAt = new Date();
    }

    this.saveSessionsToStorage();
    console.debug('ScreenShareSessionStore: Updated session', sessionId, 'with', updates);

    // Emit the session updated event
    this.eventEmitter.emitScreenShareSessionUpdated(session);

    return { ...session };
  }

  /**
   * Updates the last activity time for a session (for heartbeat/keepalive)
   * @param sessionId - The session ID
   * @returns True if updated, false if not found
   */
  updateActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.warn('ScreenShareSessionStore: Session not found for activity update', sessionId);
      return false;
    }

    session.lastActivityAt = new Date();
    this.saveSessionsToStorage();

    console.debug('ScreenShareSessionStore: Updated activity for session', sessionId);
    return true;
  }

  /**
   * Ends a session
   * @param sessionId - The session ID
   * @returns The ended session if found
   */
  endSession(sessionId: string): ScreenShareSession | undefined {
    return this.update(sessionId, {
      status: 'ended',
      endedAt: new Date(),
    });
  }

  /**
   * Marks a session as having an error
   * @param sessionId - The session ID
   * @param errorMessage - The error message
   * @returns The updated session if found
   */
  markError(sessionId: string, errorMessage: string): ScreenShareSession | undefined {
    return this.update(sessionId, {
      status: 'error',
      errorMessage,
      endedAt: new Date(),
    });
  }

  /**
   * Gets all sessions
   * @returns All screen share sessions
   */
  getAll(): ScreenShareSession[] {
    return Array.from(this.sessions.values()).map(session => ({ ...session }));
  }

  /**
   * Gets active sessions (initializing or active status)
   * @returns Array of active sessions
   */
  getActiveSessions(): ScreenShareSession[] {
    const activeStatuses: SessionStatus[] = ['initializing', 'active'];
    const sessions: ScreenShareSession[] = [];

    this.sessions.forEach(session => {
      if (activeStatuses.includes(session.status)) {
        sessions.push({ ...session });
      }
    });

    return sessions;
  }

  /**
   * Clears all sessions (mainly for testing purposes)
   */
  clear(): void {
    this.sessions.clear();
    this.saveSessionsToStorage();
    console.debug('ScreenShareSessionStore: Cleared all sessions');
  }

  /**
   * Reloads sessions from localStorage
   * Used when we need to sync with changes made by other tabs
   */
  reload(): void {
    this.loadSessionsFromStorage();
    console.debug('ScreenShareSessionStore: Reloaded sessions from storage');
  }

  /**
   * Loads sessions from localStorage
   */
  private loadSessionsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);

      if (stored) {
        const parsedSessions = JSON.parse(stored) as ScreenShareSession[];
        this.sessions.clear();

        parsedSessions.forEach(session => {
          // Convert date strings back to Date objects
          this.sessions.set(session.id, {
            ...session,
            startedAt: new Date(session.startedAt),
            endedAt: session.endedAt ? new Date(session.endedAt) : undefined,
            lastActivityAt: new Date(session.lastActivityAt),
          });
        });

        console.debug(`ScreenShareSessionStore: Loaded ${this.sessions.size} sessions from localStorage`);
      } else {
        this.sessions.clear();
        console.debug('ScreenShareSessionStore: No sessions found in localStorage, initialized empty');
      }
    } catch (error) {
      console.error('ScreenShareSessionStore: Error loading sessions from localStorage', error);
      this.sessions.clear();
    }
  }

  /**
   * Saves sessions to localStorage
   */
  private saveSessionsToStorage(): void {
    try {
      const sessionsArray = Array.from(this.sessions.values());
      localStorage.setItem(this.storageKey, JSON.stringify(sessionsArray));
      console.debug(`ScreenShareSessionStore: Saved ${sessionsArray.length} sessions to localStorage`);
    } catch (error) {
      console.error('ScreenShareSessionStore: Error saving sessions to localStorage:', error);
    }
  }

  /**
   * Generates a unique ID for sessions
   */
  private generateId(): string {
    return `sss-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}