import { type ScreenShareRequest, type UserProfile, type ScreenShareStatus } from '@common/types';

/**
 * Database row representation of a screen share request
 */
interface ScreenShareRequestRow {
  id: string;
  ticket_id: string;
  sender_id: string;
  receiver_id: string;
  status: ScreenShareStatus;
  auto_accept: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
  sender?: any; // Profile data from join
  receiver?: any; // Profile data from join
}

/**
 * Maps between ScreenShareRequest domain objects and Supabase database rows
 */
export class ScreenShareRequestSupabaseRowMapper {
  /**
   * Maps a database row to a ScreenShareRequest domain object
   * @param row - The database row with joined profile data
   * @returns ScreenShareRequest domain object
   */
  static mapRowToRequest(row: ScreenShareRequestRow): ScreenShareRequest {
    if (!row.sender) {
      throw new Error('ScreenShareRequestSupabaseRowMapper: sender profile data is required');
    }
    if (!row.receiver) {
      throw new Error('ScreenShareRequestSupabaseRowMapper: receiver profile data is required');
    }

    return {
      id: row.id,
      ticketId: row.ticket_id,
      sender: this.mapProfileRowToUserProfile(row.sender),
      receiver: this.mapProfileRowToUserProfile(row.receiver),
      status: row.status,
      autoAccept: row.auto_accept,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Maps a ScreenShareRequest domain object to a database row (for insert/update)
   * @param request - The ScreenShareRequest domain object
   * @returns Database row representation
   */
  static mapRequestToRow(request: Partial<ScreenShareRequest>): Partial<ScreenShareRequestRow> {
    return {
      id: request.id,
      ticket_id: request.ticketId,
      sender_id: request.sender?.id,
      receiver_id: request.receiver?.id,
      status: request.status,
      auto_accept: request.autoAccept ?? false,
      expires_at: request.expiresAt?.toISOString(),
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
