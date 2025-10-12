import { type ScreenShareSession, type UserProfile, type SessionStatus } from '@common/types';

/**
 * Database row representation of a screen share session
 */
interface ScreenShareSessionRow {
  id: string;
  ticket_id: string;
  request_id: string;
  publisher_id: string;
  subscriber_id: string;
  status: SessionStatus;
  stream_id?: string;
  error_message?: string;
  started_at: string;
  ended_at?: string;
  last_activity_at: string;
  publisher?: any; // Profile data from join
  subscriber?: any; // Profile data from join
}

/**
 * Maps between ScreenShareSession domain objects and Supabase database rows
 */
export class ScreenShareSessionSupabaseRowMapper {
  /**
   * Maps a database row to a ScreenShareSession domain object
   * @param row - The database row with joined profile data
   * @returns ScreenShareSession domain object
   */
  static mapRowToSession(row: ScreenShareSessionRow): ScreenShareSession {
    if (!row.publisher) {
      throw new Error('ScreenShareSessionSupabaseRowMapper: publisher profile data is required');
    }
    if (!row.subscriber) {
      throw new Error('ScreenShareSessionSupabaseRowMapper: subscriber profile data is required');
    }

    return {
      id: row.id,
      ticketId: row.ticket_id,
      requestId: row.request_id,
      publisher: this.mapProfileRowToUserProfile(row.publisher),
      subscriber: this.mapProfileRowToUserProfile(row.subscriber),
      status: row.status,
      streamId: row.stream_id,
      errorMessage: row.error_message,
      startedAt: new Date(row.started_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      lastActivityAt: new Date(row.last_activity_at),
    };
  }

  /**
   * Maps a ScreenShareSession domain object to a database row (for insert/update)
   * @param session - The ScreenShareSession domain object
   * @returns Database row representation
   */
  static mapSessionToRow(session: Partial<ScreenShareSession>): Partial<ScreenShareSessionRow> {
    return {
      id: session.id,
      ticket_id: session.ticketId,
      request_id: session.requestId,
      publisher_id: session.publisher?.id,
      subscriber_id: session.subscriber?.id,
      status: session.status,
      stream_id: session.streamId,
      error_message: session.errorMessage,
      started_at: session.startedAt?.toISOString(),
      ended_at: session.endedAt?.toISOString(),
      last_activity_at: session.lastActivityAt?.toISOString(),
    };
  }

  /**
   * Maps a profile database row to a UserProfile domain object
   * @param profileRow - The profile database row
   * @returns UserProfile domain object
   */
  private static mapProfileRowToUserProfile(profileRow: any): UserProfile {
    const baseProfile = {
      id: profileRow.id,
      name: profileRow.name,
      email: profileRow.email,
      authId: profileRow.auth_id,
      extensionInstalledAt: profileRow.extension_installed_at
        ? new Date(profileRow.extension_installed_at)
        : undefined,
      extensionInstalledVersion: profileRow.extension_installed_version,
    };

    if (profileRow.type === 'customer') {
      return {
        ...baseProfile,
        type: 'customer',
      };
    } else if (profileRow.type === 'engineer') {
      return {
        ...baseProfile,
        type: 'engineer',
        specialties: profileRow.specialties,
        githubUsername: profileRow.github_username,
      };
    } else {
      throw new Error(`Unknown profile type: ${profileRow.type}`);
    }
  }
}
