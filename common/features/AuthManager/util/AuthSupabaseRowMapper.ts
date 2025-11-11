import { type UserProfile, type UserType } from '@common/types';

/**
 * Utility class for mapping Supabase database rows to UserProfile objects
 */
export class AuthSupabaseRowMapper {
  /**
   * Maps a database row to a UserProfile object
   */
  static mapRowToProfile(row: Record<string, unknown>): UserProfile {
    const baseProfile = {
      id: row.id as string,
      name: row.name as string,
      email: row.email as string | undefined,
      authId: row.auth_id as string,
      country: row.country as string | undefined,
      extensionInstalledAt: row.extension_installed_at ? new Date(row.extension_installed_at as string) : undefined,
      extensionInstalledVersion: row.extension_installed_version as string | undefined,
    };

    const userType = row.type as UserType;

    if (userType === 'engineer') {
      return {
        ...baseProfile,
        type: 'engineer',
        githubUsername: row.github_username as string | undefined,
        specialties: (row.specialties as string[]) || [],
      };
    } else {
      return {
        ...baseProfile,
        type: 'customer',
      };
    }
  }
}
