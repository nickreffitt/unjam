import { type UserProfile, type UserType } from '@common/types';

/**
 * Interface for user profile storage implementations
 * Defines the contract that all user profile store implementations must follow
 * Methods return Promises to support both sync (Local) and async (Supabase) implementations
 */
export interface AuthProfileStore {
  /**
   * Creates a new user profile
   * @param profile - The user profile to create
   * @returns The created user profile with any modifications
   */
  create(profile: UserProfile): Promise<UserProfile> | UserProfile;

  /**
   * Gets a user profile by profile ID
   * @param profileId - The profile ID to retrieve
   * @returns The user profile if found, null otherwise
   */
  getByProfileId(profileId: string): Promise<UserProfile | null> | UserProfile | null;

  /**
   * Gets a user profile by auth system ID (e.g., Supabase Auth user ID)
   * @param authId - The auth system ID to retrieve
   * @returns The user profile if found, null otherwise
   */
  getByAuthId(authId: string): Promise<UserProfile | null> | UserProfile | null;

  /**
   * Gets a user profile by email address
   * @param email - The email address to search for
   * @returns The user profile if found, null otherwise
   */
  getByEmail(email: string): Promise<UserProfile | null> | UserProfile | null;

  /**
   * Updates an existing user profile
   * @param profileId - The profile ID to update
   * @param updatedProfile - The updated profile data
   * @returns The updated user profile
   * @throws Error if profile is not found
   */
  update(profileId: string, updatedProfile: UserProfile): Promise<UserProfile> | UserProfile;

  /**
   * Gets all user profiles by type (engineer or customer)
   * @param type - The user type to filter by
   * @param size - Number of profiles to return (page size)
   * @param offset - Number of profiles to skip (for pagination)
   * @returns Array of user profiles matching the type
   */
  getAllByType(type: UserType, size: number, offset?: number): Promise<UserProfile[]> | UserProfile[];

  /**
   * Gets the total count of profiles by type
   * Useful for pagination to know total pages
   * @param type - The user type to count
   * @returns Number of profiles with that type
   */
  getCountByType(type: UserType): Promise<number> | number;

  /**
   * Gets all user profiles (mainly for testing purposes)
   * @returns All user profiles in the store
   */
  getAll(): Promise<UserProfile[]> | UserProfile[];

  /**
   * Reloads profiles from storage
   * Used when we need to sync with changes made by other sources
   */
  reload(): void;

  /**
   * Clears all user profiles (mainly for testing purposes)
   */
  clear(): void;
}