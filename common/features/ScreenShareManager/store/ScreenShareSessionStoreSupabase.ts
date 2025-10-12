import { type SupabaseClient } from '@supabase/supabase-js';
import { type ScreenShareSession, type SessionStatus } from '@common/types';
import { type ScreenShareSessionStore } from './ScreenShareSessionStore';
import { type ScreenShareEventEmitter } from '@common/features/ScreenShareManager/events';
import { ScreenShareSessionSupabaseRowMapper } from '../util/ScreenShareSessionSupabaseRowMapper';

/**
 * Supabase implementation of the screen share session store
 * Uses Supabase PostgreSQL database for persistence with row-level security
 * Emits events for create and update operations for local same-tab event handling
 */
export class ScreenShareSessionStoreSupabase implements ScreenShareSessionStore {
  private supabaseClient: SupabaseClient;
  private eventEmitter: ScreenShareEventEmitter;
  private readonly tableName: string = 'screenshare_sessions';

  constructor(supabaseClient: SupabaseClient, eventEmitter: ScreenShareEventEmitter) {
    if (!supabaseClient) {
      throw new Error('ScreenShareSessionStoreSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('ScreenShareSessionStoreSupabase: eventEmitter is required');
    }
    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
    console.debug('ScreenShareSessionStoreSupabase: Initialized');
  }

  /**
   * Creates a new screen share session
   * @param session - The session to create (without id and timestamps)
   * @returns The created session
   */
  async create(session: Omit<ScreenShareSession, 'id' | 'startedAt' | 'lastActivityAt'>): Promise<ScreenShareSession> {
    // Validate required fields
    if (!session.ticketId) {
      throw new Error('ticketId is required for session creation');
    }
    if (!session.requestId) {
      throw new Error('requestId is required for session creation');
    }
    if (!session.publisher?.id) {
      throw new Error('publisher profile ID is required for session creation');
    }
    if (!session.subscriber?.id) {
      throw new Error('subscriber profile ID is required for session creation');
    }
    if (!session.status) {
      throw new Error('status is required for session creation');
    }

    console.debug('ScreenShareSessionStoreSupabase: Creating session for ticket', session.ticketId);

    // Set timestamps
    const now = new Date();
    const sessionWithTimestamps = {
      ...session,
      startedAt: now,
      lastActivityAt: now,
    };

    const sessionRow = ScreenShareSessionSupabaseRowMapper.mapSessionToRow(sessionWithTimestamps);

    // Omit the ID field to let the database generate its own UUID
    const { id, ...sessionRowWithoutId } = sessionRow;

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .insert([sessionRowWithoutId])
      .select(`
        *,
        publisher:profiles!screenshare_sessions_publisher_id_fkey(*),
        subscriber:profiles!screenshare_sessions_subscriber_id_fkey(*)
      `)
      .single();

    if (error) {
      console.error('ScreenShareSessionStoreSupabase: Create failed:', error);
      throw new Error(`Failed to create screen share session: ${error.message}`);
    }

    const createdSession = ScreenShareSessionSupabaseRowMapper.mapRowToSession(data);
    console.debug('ScreenShareSessionStoreSupabase: Created session successfully:', createdSession.id);

    // Emit event for session creation (for same-tab listeners)
    this.eventEmitter.emitScreenShareSessionCreated(createdSession);

    return createdSession;
  }

  /**
   * Gets a session by ID
   * @param sessionId - The session ID
   * @returns The session if found
   */
  async getById(sessionId: string): Promise<ScreenShareSession | undefined> {
    console.debug('ScreenShareSessionStoreSupabase: Getting session by ID', sessionId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        publisher:profiles!screenshare_sessions_publisher_id_fkey(*),
        subscriber:profiles!screenshare_sessions_subscriber_id_fkey(*)
      `)
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        console.debug('ScreenShareSessionStoreSupabase: Session not found:', sessionId);
        return undefined;
      }
      console.error('ScreenShareSessionStoreSupabase: Get by ID failed:', error);
      throw new Error(`Failed to get screen share session: ${error.message}`);
    }

    return ScreenShareSessionSupabaseRowMapper.mapRowToSession(data);
  }

  /**
   * Gets the active session for a ticket
   * @param ticketId - The ticket ID
   * @returns The active session if found
   */
  async getActiveByTicketId(ticketId: string): Promise<ScreenShareSession | undefined> {
    console.debug('ScreenShareSessionStoreSupabase: Getting active session for ticket', ticketId);

    const activeStatuses: SessionStatus[] = ['initializing', 'active'];

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        publisher:profiles!screenshare_sessions_publisher_id_fkey(*),
        subscriber:profiles!screenshare_sessions_subscriber_id_fkey(*)
      `)
      .eq('ticket_id', ticketId)
      .in('status', activeStatuses)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('ScreenShareSessionStoreSupabase: Get active by ticket ID failed:', error);
      throw new Error(`Failed to get active screen share session: ${error.message}`);
    }

    if (!data) {
      console.debug('ScreenShareSessionStoreSupabase: No active session found for ticket', ticketId);
      return undefined;
    }

    return ScreenShareSessionSupabaseRowMapper.mapRowToSession(data);
  }

  /**
   * Gets all sessions for a specific ticket
   * @param ticketId - The ticket ID
   * @returns Array of sessions for the ticket
   */
  async getByTicketId(ticketId: string): Promise<ScreenShareSession[]> {
    console.debug('ScreenShareSessionStoreSupabase: Getting sessions for ticket', ticketId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        publisher:profiles!screenshare_sessions_publisher_id_fkey(*),
        subscriber:profiles!screenshare_sessions_subscriber_id_fkey(*)
      `)
      .eq('ticket_id', ticketId)
      .order('started_at', { ascending: false }); // Newest first

    if (error) {
      console.error('ScreenShareSessionStoreSupabase: Get by ticket ID failed:', error);
      throw new Error(`Failed to get screen share sessions: ${error.message}`);
    }

    const sessions = data.map(row => ScreenShareSessionSupabaseRowMapper.mapRowToSession(row));
    console.debug(`ScreenShareSessionStoreSupabase: Retrieved ${sessions.length} sessions`);
    return sessions;
  }

  /**
   * Gets sessions by request ID
   * @param requestId - The request ID that initiated the session
   * @returns Array of sessions for the request
   */
  async getByRequestId(requestId: string): Promise<ScreenShareSession[]> {
    console.debug('ScreenShareSessionStoreSupabase: Getting sessions for request', requestId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        publisher:profiles!screenshare_sessions_publisher_id_fkey(*),
        subscriber:profiles!screenshare_sessions_subscriber_id_fkey(*)
      `)
      .eq('request_id', requestId)
      .order('started_at', { ascending: false }); // Newest first

    if (error) {
      console.error('ScreenShareSessionStoreSupabase: Get by request ID failed:', error);
      throw new Error(`Failed to get screen share sessions: ${error.message}`);
    }

    const sessions = data.map(row => ScreenShareSessionSupabaseRowMapper.mapRowToSession(row));
    console.debug(`ScreenShareSessionStoreSupabase: Retrieved ${sessions.length} sessions`);
    return sessions;
  }

  /**
   * Updates a session
   * @param sessionId - The session ID
   * @param updates - The updates to apply
   * @returns The updated session if found
   */
  async update(
    sessionId: string,
    updates: Partial<Pick<ScreenShareSession, 'status' | 'streamId' | 'errorMessage' | 'endedAt'>>
  ): Promise<ScreenShareSession | undefined> {
    console.debug('ScreenShareSessionStoreSupabase: Updating session', sessionId, 'with', updates);

    // Prepare the updates object
    const updateData: any = {
      last_activity_at: new Date().toISOString(),
    };

    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }
    if (updates.streamId !== undefined) {
      updateData.stream_id = updates.streamId;
    }
    if (updates.errorMessage !== undefined) {
      updateData.error_message = updates.errorMessage;
    }
    if (updates.endedAt !== undefined) {
      updateData.ended_at = updates.endedAt.toISOString();
    }

    // If ending the session, set ended_at if not already set
    if (updates.status === 'ended' && !updates.endedAt) {
      updateData.ended_at = new Date().toISOString();
    }

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .update(updateData)
      .eq('id', sessionId)
      .select(`
        *,
        publisher:profiles!screenshare_sessions_publisher_id_fkey(*),
        subscriber:profiles!screenshare_sessions_subscriber_id_fkey(*)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        console.warn('ScreenShareSessionStoreSupabase: Session not found for update:', sessionId);
        return undefined;
      }
      console.error('ScreenShareSessionStoreSupabase: Update failed:', error);
      throw new Error(`Failed to update screen share session: ${error.message}`);
    }

    const updatedSession = ScreenShareSessionSupabaseRowMapper.mapRowToSession(data);
    console.debug('ScreenShareSessionStoreSupabase: Updated session successfully:', updatedSession.id);

    // Emit event for session update (for same-tab listeners)
    this.eventEmitter.emitScreenShareSessionUpdated(updatedSession);

    return updatedSession;
  }

  /**
   * Updates the last activity time for a session (for heartbeat/keepalive)
   * @param sessionId - The session ID
   * @returns True if updated, false if not found
   */
  async updateActivity(sessionId: string): Promise<boolean> {
    console.debug('ScreenShareSessionStoreSupabase: Updating activity for session', sessionId);

    const { error, count } = await this.supabaseClient
      .from(this.tableName)
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      console.error('ScreenShareSessionStoreSupabase: Update activity failed:', error);
      return false;
    }

    const updated = (count ?? 0) > 0;
    if (!updated) {
      console.warn('ScreenShareSessionStoreSupabase: Session not found for activity update:', sessionId);
    }

    return updated;
  }

  /**
   * Ends a session
   * @param sessionId - The session ID
   * @returns The ended session if found
   */
  async endSession(sessionId: string): Promise<ScreenShareSession | undefined> {
    console.debug('ScreenShareSessionStoreSupabase: Ending session', sessionId);

    // Update the session to ended status
    const updatedSession = await this.update(sessionId, {
      status: 'ended',
      endedAt: new Date(),
    });

    // Emit specific session ended event (in addition to the updated event from update())
    if (updatedSession) {
      console.debug('ScreenShareSessionStoreSupabase: Session ended, emitting screenShareSessionEnded event', sessionId);
      this.eventEmitter.emitScreenShareSessionEnded(updatedSession);
    }

    return updatedSession;
  }

  /**
   * Marks a session as having an error
   * @param sessionId - The session ID
   * @param errorMessage - The error message
   * @returns The updated session if found
   */
  async markError(sessionId: string, errorMessage: string): Promise<ScreenShareSession | undefined> {
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
  async getAll(): Promise<ScreenShareSession[]> {
    console.debug('ScreenShareSessionStoreSupabase: Getting all sessions');

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        publisher:profiles!screenshare_sessions_publisher_id_fkey(*),
        subscriber:profiles!screenshare_sessions_subscriber_id_fkey(*)
      `)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('ScreenShareSessionStoreSupabase: Get all failed:', error);
      throw new Error(`Failed to get all screen share sessions: ${error.message}`);
    }

    const sessions = data.map(row => ScreenShareSessionSupabaseRowMapper.mapRowToSession(row));
    console.debug(`ScreenShareSessionStoreSupabase: Retrieved ${sessions.length} sessions`);
    return sessions;
  }

  /**
   * Gets active sessions (initializing or active status)
   * @returns Array of active sessions
   */
  async getActiveSessions(): Promise<ScreenShareSession[]> {
    console.debug('ScreenShareSessionStoreSupabase: Getting active sessions');

    const activeStatuses: SessionStatus[] = ['initializing', 'active'];

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        publisher:profiles!screenshare_sessions_publisher_id_fkey(*),
        subscriber:profiles!screenshare_sessions_subscriber_id_fkey(*)
      `)
      .in('status', activeStatuses)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('ScreenShareSessionStoreSupabase: Get active sessions failed:', error);
      throw new Error(`Failed to get active screen share sessions: ${error.message}`);
    }

    const sessions = data.map(row => ScreenShareSessionSupabaseRowMapper.mapRowToSession(row));
    console.debug(`ScreenShareSessionStoreSupabase: Retrieved ${sessions.length} active sessions`);
    return sessions;
  }

  /**
   * Clears all sessions (mainly for testing purposes)
   * WARNING: This will delete all sessions from the database
   */
  async clear(): Promise<void> {
    console.warn('ScreenShareSessionStoreSupabase: Clearing all sessions');

    const { error } = await this.supabaseClient
      .from(this.tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (error) {
      console.error('ScreenShareSessionStoreSupabase: Clear failed:', error);
      throw new Error(`Failed to clear screen share sessions: ${error.message}`);
    }

    console.debug('ScreenShareSessionStoreSupabase: Cleared all sessions');
  }

  /**
   * Reloads sessions from storage
   * Used when we need to sync with changes made by other tabs
   * Note: For Supabase implementation, this is a no-op since data is always fresh
   */
  reload(): void {
    console.debug('ScreenShareSessionStoreSupabase: Reload called');
    // No-op for Supabase since data is always fresh from the database
  }
}
