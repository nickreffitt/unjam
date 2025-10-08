import { type UserProfile, type UserType } from '@common/types';
import { type AuthProfileStore } from './AuthProfileStore';

/**
 * Local storage implementation of the auth profile store
 * Uses localStorage for persistence and is useful for testing and development
 */
export class AuthProfileStoreLocal implements AuthProfileStore {
  private profiles: UserProfile[] = [];
  private readonly storageKey: string = 'authProfileStore-profiles';

  constructor() {
    this.loadProfilesFromStorage();
  }

  /**
   * Creates a new user profile
   * @param profile - The user profile to create
   * @returns The created user profile with any modifications
   */
  create(profile: UserProfile): UserProfile {
    // Validate required fields for engineers
    if (profile.type === 'engineer' && !profile.githubUsername?.trim()) {
      throw new Error('GitHub username is required for engineer profiles');
    }

    const newProfile = { ...profile };

    // Validate required fields
    if (!newProfile.id) {
      throw new Error('id is required for profile creation');
    }
    if (!newProfile.authId) {
      throw new Error('authId is required for profile creation');
    }

    // Check for duplicate profileId
    if (this.getByProfileId(newProfile.id)) {
      throw new Error(`Profile with ID ${newProfile.id} already exists`);
    }

    // Check for duplicate authId
    if (this.getByAuthId(newProfile.authId)) {
      throw new Error(`Profile with auth ID ${newProfile.authId} already exists`);
    }

    // Add to the profiles array
    this.profiles.push(newProfile);
    this.saveProfilesToStorage();

    console.debug('AuthProfileStoreLocal: Created profile', newProfile.id);
    return newProfile;
  }

  /**
   * Gets a user profile by profile ID
   * @param profileId - The profile ID to retrieve
   * @returns The user profile if found, null otherwise
   */
  getByProfileId(profileId: string): UserProfile | null {
    return this.profiles.find(profile => profile.id === profileId) || null;
  }

  /**
   * Gets a user profile by auth system ID
   * @param authId - The auth system ID to retrieve
   * @returns The user profile if found, null otherwise
   */
  getByAuthId(authId: string): UserProfile | null {
    return this.profiles.find(profile => profile.authId === authId) || null;
  }

  /**
   * Gets a user profile by email address
   * @param email - The email address to search for
   * @returns The user profile if found, null otherwise
   */
  getByEmail(email: string): UserProfile | null {
    if (!email) return null;
    return this.profiles.find(profile => profile.email?.toLowerCase() === email.toLowerCase()) || null;
  }

  /**
   * Updates an existing user profile
   * @param profileId - The profile ID to update
   * @param updatedProfile - The updated profile data
   * @returns The updated user profile
   * @throws Error if profile is not found
   */
  update(profileId: string, updatedProfile: UserProfile): UserProfile {
    const profileIndex = this.profiles.findIndex(profile => profile.id === profileId);

    if (profileIndex === -1) {
      throw new Error(`Profile with ID ${profileId} not found`);
    }

    // Validate required fields for engineers
    if (updatedProfile.type === 'engineer' && !updatedProfile.githubUsername?.trim()) {
      throw new Error('GitHub username is required for engineer profiles');
    }

    // Update the profile
    this.profiles[profileIndex] = { ...updatedProfile };
    this.saveProfilesToStorage();

    console.debug('AuthProfileStoreLocal: Updated profile', profileId);
    return this.profiles[profileIndex];
  }

  /**
   * Gets all user profiles by type
   * @param type - The user type to filter by
   * @param size - Number of profiles to return (page size)
   * @param offset - Number of profiles to skip (for pagination)
   * @returns Array of user profiles matching the type
   */
  getAllByType(type: UserType, size: number, offset: number = 0): UserProfile[] {
    const filteredProfiles = this.profiles.filter(profile => profile.type === type);
    const paginatedProfiles = filteredProfiles.slice(offset, offset + size);

    console.debug(`AuthProfileStoreLocal: Retrieved ${paginatedProfiles.length} ${type} profiles (offset: ${offset}, size: ${size})`);
    return paginatedProfiles;
  }

  /**
   * Gets the total count of profiles by type
   * @param type - The user type to count
   * @returns Number of profiles with that type
   */
  getCountByType(type: UserType): number {
    return this.profiles.filter(profile => profile.type === type).length;
  }

  /**
   * Gets all user profiles
   * @returns All user profiles in the store
   */
  getAll(): UserProfile[] {
    return [...this.profiles];
  }

  /**
   * Reloads profiles from storage
   */
  reload(): void {
    console.debug('AuthProfileStoreLocal: Reloading profiles from storage');
    this.loadProfilesFromStorage();
  }

  /**
   * Clears all user profiles
   */
  clear(): void {
    this.profiles = [];
    this.saveProfilesToStorage();
    console.debug('AuthProfileStoreLocal: Cleared all profiles');
  }

  /**
   * Loads profiles from localStorage
   */
  private loadProfilesFromStorage(): void {
    try {
      const storedProfiles = localStorage.getItem(this.storageKey);
      if (storedProfiles) {
        const parsedProfiles = JSON.parse(storedProfiles);
        // Convert date strings back to Date objects
        this.profiles = parsedProfiles.map((profile: UserProfile) => ({
          ...profile,
          extensionInstalledAt: profile.extensionInstalledAt ? new Date(profile.extensionInstalledAt) : undefined,
        }));
        console.debug(`AuthProfileStoreLocal: Loaded ${this.profiles.length} profiles from storage`);
      } else {
        this.profiles = [];
        console.debug('AuthProfileStoreLocal: No profiles found in storage, starting with empty array');
      }
    } catch (error) {
      console.error('AuthProfileStoreLocal: Error loading profiles from storage:', error);
      this.profiles = [];
    }
  }

  /**
   * Saves profiles to localStorage
   */
  private saveProfilesToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.profiles));
      console.debug(`AuthProfileStoreLocal: Saved ${this.profiles.length} profiles to storage`);
    } catch (error) {
      console.error('AuthProfileStoreLocal: Error saving profiles to storage:', error);
    }
  }
}