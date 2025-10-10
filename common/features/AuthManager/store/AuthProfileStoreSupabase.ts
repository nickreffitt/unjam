import { type SupabaseClient } from '@supabase/supabase-js';
import { type UserProfile, type UserType } from '@common/types';
import { type AuthProfileStore } from './AuthProfileStore';
import { AuthSupabaseRowMapper } from '../util/AuthSupabaseRowMapper';

/**
 * Supabase implementation of the auth profile store
 * Uses Supabase database for persistence with row-level security
 */
export class AuthProfileStoreSupabase implements AuthProfileStore {
  private supabaseClient: SupabaseClient;
  private readonly tableName: string = 'profiles';

  constructor(supabaseClient: SupabaseClient) {
    if (!supabaseClient) {
      throw new Error('AuthProfileStoreSupabase: supabaseClient is required');
    }
    this.supabaseClient = supabaseClient;
  }

  /**
   * Creates a new user profile
   * @param profile - The user profile to create
   * @returns The created user profile with any modifications
   */
  async create(profile: UserProfile): Promise<UserProfile> {
    // Validate required fields
    if (!profile.authId) {
      throw new Error('authId is required for profile creation');
    }

    // Validate required fields for engineers
    if (profile.type === 'engineer' && !profile.githubUsername?.trim()) {
      throw new Error('GitHub username is required for engineer profiles');
    }

    console.debug('AuthProfileStoreSupabase: Creating profile', profile.id);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .insert([{
        auth_id: profile.authId,
        type: profile.type,
        name: profile.name,
        email: profile.email,
        github_username: profile.type === 'engineer' ? profile.githubUsername : undefined,
        specialties: profile.type === 'engineer' ? profile.specialties || [] : [],
        extension_installed_at: (profile.extensionInstalledAt) ? profile.extensionInstalledAt.toISOString() : null,
        extension_installed_version: profile.extensionInstalledVersion,
      }])
      .select()
      .single();

    if (error) {
      console.error('AuthProfileStoreSupabase: Create failed:', error);
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    const createdProfile = AuthSupabaseRowMapper.mapRowToProfile(data);
    console.debug('AuthProfileStoreSupabase: Created profile successfully:', createdProfile.id);
    return createdProfile;
  }

  /**
   * Gets a user profile by profile ID
   * @param profileId - The profile ID to retrieve
   * @returns The user profile if found, null otherwise
   */
  async getByProfileId(profileId: string): Promise<UserProfile | null> {
    console.debug('AuthProfileStoreSupabase: Getting profile by ID:', profileId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    if (error) {
      console.error('AuthProfileStoreSupabase: Get by profile ID failed:', error);
      throw new Error(`Failed to get profile by ID: ${error.message}`);
    }

    return data ? AuthSupabaseRowMapper.mapRowToProfile(data) : null;
  }

  /**
   * Gets a user profile by auth system ID
   * @param authId - The auth system ID to retrieve
   * @returns The user profile if found, null otherwise
   */
  async getByAuthId(authId: string): Promise<UserProfile | null> {
    console.debug('AuthProfileStoreSupabase: Getting profile by auth ID:', authId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('auth_id', authId)
      .maybeSingle();

    if (error) {
      console.error('AuthProfileStoreSupabase: Get by auth ID failed:', error);
      throw new Error(`Failed to get profile by auth ID: ${error.message}`);
    }

    return data ? AuthSupabaseRowMapper.mapRowToProfile(data) : null;
  }

  /**
   * Gets a user profile by email address
   * @param email - The email address to search for
   * @returns The user profile if found, null otherwise
   */
  async getByEmail(email: string): Promise<UserProfile | null> {
    if (!email) return null;

    console.debug('AuthProfileStoreSupabase: Getting profile by email:', email);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .ilike('email', email) // Case-insensitive search
      .maybeSingle();

    if (error) {
      console.error('AuthProfileStoreSupabase: Get by email failed:', error);
      throw new Error(`Failed to get profile by email: ${error.message}`);
    }

    return data ? AuthSupabaseRowMapper.mapRowToProfile(data) : null;
  }

  /**
   * Updates an existing user profile
   * @param profileId - The profile ID to update
   * @param updatedProfile - The updated profile data
   * @returns The updated user profile
   * @throws Error if profile is not found
   */
  async update(profileId: string, updatedProfile: UserProfile): Promise<UserProfile> {
    // Validate required fields for engineers
    if (updatedProfile.type === 'engineer' && !updatedProfile.githubUsername?.trim()) {
      throw new Error('GitHub username is required for engineer profiles');
    }

    console.debug('AuthProfileStoreSupabase: Updating profile:', profileId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .update({
        auth_id: updatedProfile.authId,
        type: updatedProfile.type,
        name: updatedProfile.name,
        email: updatedProfile.email,
        github_username: updatedProfile.type === 'engineer' ? updatedProfile.githubUsername : undefined,
        specialties: updatedProfile.type === 'engineer' ? updatedProfile.specialties || [] : [],
        extension_installed_at: (updatedProfile.extensionInstalledAt) ? updatedProfile.extensionInstalledAt.toISOString() : null,
        extension_installed_version: updatedProfile.extensionInstalledVersion,
      })
      .eq('id', profileId)
      .select()
      .single();

    if (error) {
      console.error('AuthProfileStoreSupabase: Update failed:', error);
      if (error.code === 'PGRST116') {
        throw new Error(`Profile with ID ${profileId} not found`);
      }
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    const profile = AuthSupabaseRowMapper.mapRowToProfile(data);
    console.debug('AuthProfileStoreSupabase: Updated profile successfully:', profileId);
    return profile;
  }

  /**
   * Gets all user profiles by type
   * @param type - The user type to filter by
   * @param size - Number of profiles to return (page size)
   * @param offset - Number of profiles to skip (for pagination)
   * @returns Array of user profiles matching the type
   */
  async getAllByType(type: UserType, size: number, offset: number = 0): Promise<UserProfile[]> {
    console.debug(`AuthProfileStoreSupabase: Getting ${type} profiles (size: ${size}, offset: ${offset})`);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('type', type)
      .range(offset, offset + size - 1)
      .order('name');

    if (error) {
      console.error('AuthProfileStoreSupabase: Get all by type failed:', error);
      throw new Error(`Failed to get profiles by type: ${error.message}`);
    }

    const profiles = data.map(row => AuthSupabaseRowMapper.mapRowToProfile(row));
    console.debug(`AuthProfileStoreSupabase: Retrieved ${profiles.length} ${type} profiles`);
    return profiles;
  }

  /**
   * Gets the total count of profiles by type
   * @param type - The user type to count
   * @returns Number of profiles with that type
   */
  async getCountByType(type: UserType): Promise<number> {
    console.debug(`AuthProfileStoreSupabase: Getting count of ${type} profiles`);

    const { count, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('type', type);

    if (error) {
      console.error('AuthProfileStoreSupabase: Get count by type failed:', error);
      throw new Error(`Failed to get count by type: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Gets all user profiles
   * @returns All user profiles in the store
   */
  async getAll(): Promise<UserProfile[]> {
    console.debug('AuthProfileStoreSupabase: Getting all profiles');

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .order('name');

    if (error) {
      console.error('AuthProfileStoreSupabase: Get all failed:', error);
      throw new Error(`Failed to get all profiles: ${error.message}`);
    }

    const profiles = data.map(row => AuthSupabaseRowMapper.mapRowToProfile(row));
    console.debug(`AuthProfileStoreSupabase: Retrieved ${profiles.length} profiles`);
    return profiles;
  }

  /**
   * Reloads profiles from storage
   * Note: For Supabase implementation, this is a no-op since data is always fresh
   */
  reload(): void {
    console.debug('AuthProfileStoreSupabase: Reload called (no-op for Supabase implementation)');
    // No-op for Supabase since data is always fresh from the database
  }

  /**
   * Clears all user profiles
   * WARNING: This will delete all profiles from the database
   */
  async clear(): Promise<void> {
    console.warn('AuthProfileStoreSupabase: Clearing all profiles from database');

    const { error } = await this.supabaseClient
      .from(this.tableName)
      .delete()
      .neq('id', 'impossible-id'); // Delete all rows

    if (error) {
      console.error('AuthProfileStoreSupabase: Clear failed:', error);
      throw new Error(`Failed to clear profiles: ${error.message}`);
    }

    console.debug('AuthProfileStoreSupabase: Cleared all profiles');
  }

}