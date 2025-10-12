import { type ChatMessage, type UserProfile } from '@common/types';

/**
 * Database row representation of a chat message
 */
interface ChatMessageRow {
  id: string;
  ticket_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender?: any; // Profile data from join
  receiver?: any; // Profile data from join
}

/**
 * Maps between ChatMessage domain objects and Supabase database rows
 */
export class ChatMessageSupabaseRowMapper {
  /**
   * Maps a database row to a ChatMessage domain object
   * @param row - The database row with joined profile data
   * @returns ChatMessage domain object
   */
  static mapRowToMessage(row: ChatMessageRow): ChatMessage {
    if (!row.sender) {
      throw new Error('ChatMessageSupabaseRowMapper: sender profile data is required');
    }
    if (!row.receiver) {
      throw new Error('ChatMessageSupabaseRowMapper: receiver profile data is required');
    }

    return {
      id: row.id,
      ticketId: row.ticket_id,
      sender: this.mapProfileRowToUserProfile(row.sender),
      receiver: this.mapProfileRowToUserProfile(row.receiver),
      content: row.content,
      isRead: row.is_read,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Maps a ChatMessage domain object to a database row (for insert/update)
   * @param message - The ChatMessage domain object
   * @returns Database row representation
   */
  static mapMessageToRow(message: ChatMessage): Partial<ChatMessageRow> {
    return {
      id: message.id,
      ticket_id: message.ticketId,
      sender_id: message.sender.id,
      receiver_id: message.receiver.id,
      content: message.content,
      is_read: message.isRead ?? false,
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
