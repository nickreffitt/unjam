import { type WebRTCSignal, type UserProfile } from '@common/types';

/**
 * Database row representation of a WebRTC signal
 */
interface WebRTCSignalRow {
  id: string;
  ticket_id: string;
  session_id: string;
  from_id: string;
  to_id: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
  processed: boolean;
  created_at: string;
  updated_at: string;
  from?: any; // Profile data from join
  to?: any; // Profile data from join
}

/**
 * Maps between WebRTCSignal domain objects and Supabase database rows
 */
export class WebRTCSignalSupabaseRowMapper {
  /**
   * Maps a database row to a WebRTCSignal domain object
   * @param row - The database row with joined profile data
   * @returns WebRTCSignal domain object
   */
  static mapRowToSignal(row: WebRTCSignalRow): WebRTCSignal {
    if (!row.from) {
      throw new Error('WebRTCSignalSupabaseRowMapper: from profile data is required');
    }
    if (!row.to) {
      throw new Error('WebRTCSignalSupabaseRowMapper: to profile data is required');
    }

    return {
      id: row.id,
      ticketId: row.ticket_id,
      sessionId: row.session_id,
      from: this.mapProfileRowToUserProfile(row.from),
      to: this.mapProfileRowToUserProfile(row.to),
      type: row.type,
      payload: row.payload,
      createdAt: new Date(row.created_at),
      processed: row.processed ?? false,
    };
  }

  /**
   * Maps a WebRTCSignal domain object to a database row (for insert/update)
   * @param signal - The WebRTCSignal domain object
   * @returns Database row representation
   */
  static mapSignalToRow(signal: Partial<WebRTCSignal>): Partial<WebRTCSignalRow> {
    return {
      id: signal.id,
      ticket_id: signal.ticketId,
      session_id: signal.sessionId,
      from_id: signal.from?.id,
      to_id: signal.to?.id,
      type: signal.type,
      payload: signal.payload,
      processed: signal.processed ?? false,
      // created_at and updated_at are handled by the database
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
