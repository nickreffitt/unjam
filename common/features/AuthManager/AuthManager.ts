import { type UserProfile, type User, type AuthUser } from '@common/types';
import { type AuthUserStore } from './store/AuthUserStore';
import { type AuthProfileStore } from './store/AuthProfileStore';
import { type AuthEventEmitter } from './events/AuthEventEmitter';
import { type AuthUserListener } from './events/AuthUserListener';

/**
 * AuthManager handles authentication using AuthUserStore abstraction
 * The AuthUserStore manages its own event emission internally
 */
export class AuthManager {
  private authUserStore: AuthUserStore;
  private authProfileStore: AuthProfileStore;
  private authEventEmitter: AuthEventEmitter;
  private authUserListener: AuthUserListener;
  private currentAuthUser: AuthUser;

  constructor(
    authUserStore: AuthUserStore,
    authProfileStore: AuthProfileStore,
    authEventEmitter: AuthEventEmitter,
    authUserListener: AuthUserListener,
  ) {
    if (!authUserStore) {
      throw new Error('AuthManager: authUserStore is required');
    }
    if (!authProfileStore) {
      throw new Error('AuthManager: authProfileStore is required');
    }
    if (!authEventEmitter) {
      throw new Error('AuthManager: authEventEmitter is required');
    }

    this.authUserStore = authUserStore;
    this.authProfileStore = authProfileStore;
    this.authEventEmitter = authEventEmitter;
    this.currentAuthUser = { status: 'loading' };

    // Set up AuthUserListener to bridge User events to UserProfile events
    this.authUserListener = authUserListener;

    // Start listening to events
    this.addAuthEventListenerCallbacks();
    this.authUserListener.startListening();
  }

  /**
   * Cleanup all event listeners
   * Call this when the AuthManager is being destroyed
   */
  cleanup(): void {
    console.debug('AuthManager: Cleaning up event listeners');
    this.authUserListener.stopListening();
  }

  /**
   * Sign in user with magic link
   * Sends a passwordless authentication email to the user
   *
   * @param email - User's email address
   * @throws Error if sign in fails
   */
  async signInWithMagicLink(email: string): Promise<void> {
    console.debug('AuthManager: Delegating magic link sign in to AuthUserStore');
    return this.authUserStore.signInWithMagicLink(email);
  }

  /**
   * Verify a magic link token and sign in the user
   * Verifies the token hash from the magic link URL and authenticates the user
   *
   * @param tokenHash - The token hash from the magic link URL
   * @returns Promise that resolves with the authenticated user profile
   * @throws Error if verification fails
   */
  async verifyMagicLink(tokenHash: string): Promise<User> {
    console.debug('AuthManager: Delegating magic link verification to AuthUserStore');
    const user = await this.authUserStore.verifyMagicLink(tokenHash);
    const userProfile = await this.convertUserToUserProfile(user);
    if (userProfile) {
      this.currentAuthUser = {
        status: 'signed-in',
        user,
        profile: userProfile
      };
    } else {
      this.currentAuthUser = {
        status: 'requires-profile',
        user
      };
      this.authEventEmitter.emitUserRequiresProfile(this.currentAuthUser);
    }
    return user;
  }

  /**
   * Sign in user with OTP (One-Time Password)
   * Sends a 6-digit code to the user's email for passwordless authentication
   *
   * @param email - User's email address
   * @throws Error if sign in fails
   */
  async signInWithOtp(email: string): Promise<void> {
    console.debug('AuthManager: Delegating OTP sign in to AuthUserStore');
    return this.authUserStore.signInWithOtp(email);
  }

  /**
   * Verify an OTP token and sign in the user
   * Verifies the 6-digit code from the email and authenticates the user
   *
   * @param email - User's email address
   * @param token - The 6-digit OTP code from the email
   * @returns Promise that resolves with the authenticated user
   * @throws Error if verification fails
   */
  async verifyOtp(email: string, token: string): Promise<User> {
    console.debug(`AuthManager: Delegating OTP verification to AuthUserStore. Email: ${email}, token: ${token}`);
    const user = await this.authUserStore.verifyOtp(email, token);
    const userProfile = await this.convertUserToUserProfile(user);
    if (userProfile) {
      this.currentAuthUser = {
        status: 'signed-in',
        user,
        profile: userProfile
      };
    } else {
      this.currentAuthUser = {
        status: 'requires-profile',
        user
      };
      this.authEventEmitter.emitUserRequiresProfile(this.currentAuthUser);
    }
    return user;
  }

  /**
   * Sign in user with Google OAuth for web applications
   * Opens Google OAuth flow in the current window/tab
   *
   * @returns Promise that resolves with the authenticated user profile
   * @throws Error if Google sign in fails
   */
  async signInWithGoogleWeb(): Promise<UserProfile | null> {
    console.debug('AuthManager: Delegating Google web sign in to AuthUserStore');
    const user = await this.authUserStore.signInWithGoogleWeb(`${window.location.origin}/auth/callback`);
    return this.convertUserToUserProfile(user);
  }

  /**
   * Sign in user with Google OAuth for browser extension
   * Uses Chrome extension identity API for authentication
   * Note: This requires additional setup in the Chrome extension manifest
   *
   * @returns Promise that resolves with the authenticated user profile
   * @throws Error if Google extension sign in fails or not in extension context
   */
  async signInWithGoogleExtension(): Promise<UserProfile | null> {
    console.debug('AuthManager: Delegating Google extension sign in to AuthUserStore');
    const user = await this.authUserStore.signInWithGoogleExtension();
    return this.convertUserToUserProfile(user);
  }

  /**
   * Sign out the current user
   * Clears the session and emits sign out event
   *
   * @throws Error if sign out fails
   */
  async signOut(): Promise<void> {
    console.debug('AuthManager: Delegating sign out to AuthUserStore');
    await this.authUserStore.signOut();
  }

  /**
   * Get the current authentication state
   *
   * @returns Current AuthUser with status, user, and profile
   */
  getCurrentAuthUser(): AuthUser {
    return this.currentAuthUser;
  }

  /**
   * Get the currently authenticated user profile
   *
   * @returns Current user profile or null if not authenticated or requires profile
   */
  getCurrentUser(): UserProfile | null {
    return this.currentAuthUser.status === 'signed-in' ? this.currentAuthUser.profile || null : null;
  }

  /**
   * Create a user profile for the currently authenticated user
   * @param profileData - The profile data to create
   * @returns Promise that resolves with the created user profile
   * @throws Error if profile creation fails
   */
  async createProfile(profileData: { name: string; type: 'customer' | 'engineer'; email?: string; githubUsername?: string; specialties?: string[] }): Promise<UserProfile> {
    console.debug('AuthManager: Creating profile');

    // Get current user from auth store
    const currentUser = this.authUserStore.getCurrentUser();
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    // Create profile data with auth ID
    const profileId = crypto.randomUUID();
    const fullProfileData = {
      id: profileId, // For UserProfile compatibility
      authId: currentUser.id,
      name: profileData.name,
      type: profileData.type,
      email: profileData.email || currentUser.email || '',
      githubUsername: profileData.githubUsername,
      specialties: profileData.specialties || [],
    };

    // Save to profile store
    const createdProfile = await this.authProfileStore.create(fullProfileData);

    // Create complete UserProfile (only EngineerProfile supports user reference)
    const userProfile: UserProfile = createdProfile.type === 'engineer'
      ? { ...createdProfile, user: currentUser }
      : createdProfile;

    // Update current auth user to signed-in state
    this.currentAuthUser = {
      status: 'signed-in',
      user: currentUser,
      profile: userProfile
    };

    // Emit profile created event
    this.authEventEmitter.emitUserProfileCreated(this.currentAuthUser);

    return userProfile;
  }

  /**
   * Mark the extension as installed for the current user
   * Updates the user's profile with installation timestamp and version
   *
   * @param version - The extension version being installed
   * @throws Error if no user is signed in or profile update fails
   */
  async markExtensionInstalled(version: string): Promise<void> {
    console.debug('AuthManager: Marking extension as installed, version:', version);

    // Verify user is signed in
    if (this.currentAuthUser.status !== 'signed-in') {
      throw new Error('Cannot mark extension installed: No user is signed in');
    }

    const { profile } = this.currentAuthUser;
    if (!profile) {
      throw new Error("No profile set");
    }

    // Update profile with extension installation details
    const updatedProfile = {
      ...profile,
      extensionInstalledAt: new Date(),
      extensionInstalledVersion: version,
    };

    // Save updated profile to store
    await this.authProfileStore.update(profile.id, updatedProfile);

    // Update current auth user state
    this.currentAuthUser = {
      ...this.currentAuthUser,
      profile: updatedProfile,
    };

    // Emit profile updated event
    this.authEventEmitter.emitUserProfileUpdated(this.currentAuthUser);

    console.debug('AuthManager: Extension installation marked successfully');
  }

  private addAuthEventListenerCallbacks(): void {
    console.debug('[AuthManager] addAuthEventListenerCallbacks');
    this.authUserListener.updateCallbacks({
      onUserSignedIn: async (user: User) => {
        console.debug('[AuthManager] User signed in event received, converting to UserProfile');
        try {
          const userProfile = await this.convertUserToUserProfile(user);
          console.debug('AuthManager: userProfile', userProfile);
          if (userProfile) {
            this.currentAuthUser = {
              status: 'signed-in',
              user,
              profile: userProfile
            };
            this.authEventEmitter.emitUserSignedIn(this.currentAuthUser);
            console.debug('[AuthManager]: Emitted UserProfile signed in event');
          } else {
            // User signed in but doesn't have a profile - emit user requires profile event
            this.currentAuthUser = {
              status: 'requires-profile',
              user
            };
            this.authEventEmitter.emitUserRequiresProfile(this.currentAuthUser);
            console.debug('[AuthManager] Emitted UserRequiresProfile event');
          }
        } catch (error) {
          console.error('[AuthManager] Error fetching user profile on sign in:', error);
          // Don't change auth state on profile fetch errors - keep loading state
          console.debug('[AuthManager] Keeping current auth state due to profile fetch error');
        }
      },
      onUserSignedOut: () => {
        console.debug('[AuthManager] User signed out event received');
        this.currentAuthUser = { status: 'not-signed-in' };
        this.authEventEmitter.emitUserSignedOut();
        console.debug('[AuthManager] Emitted UserProfile signed out event');
      },
      onAuthStateChanged: async (user: User | null) => {
        console.debug('[AuthManager] Auth state changed event received with user', user);
        console.debug('[AuthManager] Call stack:', new Error().stack);
        try {
          if (user) {
            const userProfile = await this.convertUserToUserProfile(user);
            console.debug('userProfile', userProfile);
            if (userProfile) {
              this.currentAuthUser = {
                status: 'signed-in',
                user,
                profile: userProfile
              };
              this.authEventEmitter.emitAuthStateChanged(this.currentAuthUser);
              console.debug('[AuthManager] Emitted UserProfile auth state changed event');
            } else {
              // User exists but doesn't have a profile - emit user requires profile event
              this.currentAuthUser = {
                status: 'requires-profile',
                user
              };
              this.authEventEmitter.emitUserRequiresProfile(this.currentAuthUser);
              console.debug('[AuthManager] Emitted UserRequiresProfile event from auth state change');
            }
          } else {
            this.currentAuthUser = { status: 'not-signed-in' };
            this.authEventEmitter.emitAuthStateChanged(this.currentAuthUser);
            console.debug('[AuthManager] Emitted UserProfile auth state changed event (null)');
          }
        } catch (error) {
          console.error('[AuthManager] Error fetching user profile on auth state change:', error);
          // Don't change auth state on profile fetch errors - keep loading state
          console.debug('[AuthManager] Keeping current auth state due to profile fetch error');
        }
      }
    });
  } 

  /**
   * Converts a User object to UserProfile
   * This handles the mapping from auth system User to application domain UserProfile
   * Looks up the user profile from AuthProfileStore to get the complete profile information
   * @throws Error if there's an error fetching the profile (network, permission, etc.)
   * @returns UserProfile if found, null if user has no profile yet
   */
  private async convertUserToUserProfile(user: User): Promise<UserProfile | null> {
    console.debug(`[AuthManager] convertUserToUserProfile: Looking for profile with authId: ${user.id}`);

    // Try to get the existing profile from the store using auth ID
    // This will throw an error if there's a network/permission issue
    const existingProfile = await this.authProfileStore.getByAuthId(user.id);
    console.debug(`[AuthManager] convertUserToUserProfile: Found profile:`, existingProfile);

    if (existingProfile) {
      // Set the user property to establish 1:1 mapping (only for EngineerProfile)
      if (existingProfile.type === 'engineer') {
        existingProfile.user = user;
      }
      console.debug(`[AuthManager] convertUserToUserProfile: Returning profile with user attached`);
      return existingProfile;
    }

    console.debug(`[AuthManager] convertUserToUserProfile: No profile found, returning null`);
    return null;
  }
}