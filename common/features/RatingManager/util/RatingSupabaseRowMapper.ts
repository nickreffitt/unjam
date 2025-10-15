import { type CustomerProfile, type EngineerProfile, type Rating, type UserProfile } from '@common/types';
import { type Tables } from '@common/supabase.types';

/**
 * Database row representation of a rating with joined profile data
 */
interface RatingRowWithProfiles extends Tables<'ratings'> {
  created_by_profile?: Tables<'profiles'>; // Profile data from join
  rating_for_profile?: Tables<'profiles'>; // Profile data from join
}

/**
 * Maps between Rating domain objects and Supabase database rows
 */
export class RatingSupabaseRowMapper {
  /**
   * Maps a database row to a Rating domain object
   * @param row - The database row with joined profile data
   * @returns Rating domain object
   */
  static mapRowToRating(row: RatingRowWithProfiles): Rating {
    if (!row.created_by_profile) {
      throw new Error('RatingSupabaseRowMapper: created_by profile data is required');
    }
    if (!row.rating_for_profile) {
      throw new Error('RatingSupabaseRowMapper: rating_for profile data is required');
    }
    if (!row.created_at) {
      throw new Error('RatingSupabaseRowMapper: created_at is required');
    }

    return {
      id: row.id,
      ticketId: row.ticket_id,
      createdBy: this.mapProfileRowToUserProfile(row.created_by_profile),
      ratingFor: this.mapProfileRowToUserProfile(row.rating_for_profile),
      rating: row.rating,
      notes: row.notes ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: (row.updated_at) ? new Date(row.updated_at) : null,
    };
  }

  /**
   * Maps a Rating domain object to a database row (for insert/update)
   * @param rating - The Rating domain object
   * @returns Database row representation
   */
  static mapRatingToRow(rating: Rating): Partial<Tables<'ratings'>> {
    return {
      id: rating.id,
      ticket_id: rating.ticketId,
      created_by: rating.createdBy.id,
      rating_for: rating.ratingFor.id,
      rating: rating.rating,
      notes: rating.notes ?? null,
      // created_at and updated_at are handled by the database
    };
  }

  /**
   * Maps a profile database row to a UserProfile domain object
   * @param profileRow - The profile database row
   * @returns UserProfile domain object
   */
  private static mapProfileRowToUserProfile(profileRow: Tables<'profiles'>): UserProfile {
    const baseProfile = {
      id: profileRow.id,
      name: profileRow.name,
      email: profileRow.email ?? undefined,
      authId: profileRow.auth_id,
      extensionInstalledAt: profileRow.extension_installed_at
        ? new Date(profileRow.extension_installed_at)
        : undefined,
      extensionInstalledVersion: profileRow.extension_installed_version ?? undefined,
    };

    if (profileRow.type === 'customer') {
      return {
        ...baseProfile,
        type: 'customer',
      } as CustomerProfile;
    } else if (profileRow.type === 'engineer') {
      return {
        ...baseProfile,
        type: 'engineer',
        specialties: profileRow.specialties ?? [],
        githubUsername: profileRow.github_username ?? undefined,
      } as EngineerProfile;
    } else {
      throw new Error(`Unknown profile type: ${profileRow.type}`);
    }
  }
}
