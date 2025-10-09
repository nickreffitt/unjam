import { type User } from '@common/types';
import { type AuthUserStore } from './AuthUserStore';
import { type AuthUserEventEmitter } from './AuthUserEventEmitter';

/**
 * Local storage implementation of the auth user store
 * Uses localStorage for persistence and is useful for testing and development
 * Simulates authentication without requiring external auth providers
 */
export class AuthUserStoreLocal implements AuthUserStore {
  private currentUser: User | null = null;
  private readonly storageKey: string = 'authUserStore-currentUser';
  private authUserEventEmitter: AuthUserEventEmitter;

  constructor(authUserEventEmitter: AuthUserEventEmitter) {
    this.authUserEventEmitter = authUserEventEmitter;
    this.loadUserFromStorage();

    // Emit initial auth state
    setTimeout(() => {
      this.authUserEventEmitter.emitAuthStateChanged(this.currentUser);
    }, 0);
  }
  
  signInWithOtp(email: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  verifyOtp(email: string, token: string): Promise<User> {
    throw new Error('Method not implemented.');
  }

  /**
   * Sign in user with magic link (simulated)
   * @param email - User's email address
   * @param _redirectUrl - URL to redirect to after clicking magic link (ignored in local implementation)
   */
  async signInWithMagicLink(email: string, _redirectUrl?: string): Promise<void> {
    console.debug('AuthUserStoreLocal: Simulating magic link send to:', email);
    // In local implementation, immediately simulate the user clicking the magic link
    const fakeToken = `fake-token-${Date.now()}`;
    await this.verifyMagicLink(fakeToken);
  }

  /**
   * Verify a magic link token and sign in the user (simulated)
   * @param tokenHash - The token hash from the magic link URL
   * @returns Promise that resolves with the authenticated user
   */
  async verifyMagicLink(tokenHash: string): Promise<User> {
    console.debug('AuthUserStoreLocal: Simulating magic link verification for token:', tokenHash);

    // Check if we already have a user stored, reuse it instead of creating a new one
    if (this.currentUser) {
      console.debug('AuthUserStoreLocal: Reusing existing user for magic link verification');
      this.authUserEventEmitter.emitUserSignedIn(this.currentUser);
      return this.currentUser;
    }

    // Create a fake user for testing only if no user exists
    const fakeUser: User = {
      id: `test-user-${Date.now()}`,
      email: 'test@example.com',
      createdAt: new Date()
    };

    this.setCurrentUser(fakeUser);
    this.authUserEventEmitter.emitUserSignedIn(fakeUser);

    return fakeUser;
  }

  /**
   * Sign in user with Google OAuth for web applications (simulated)
   * @param _redirectUrl - URL to redirect to after OAuth completion (ignored in local implementation)
   * @returns Promise that resolves with the authenticated user
   */
  async signInWithGoogleWeb(_redirectUrl?: string): Promise<User> {
    console.debug('AuthUserStoreLocal: Simulating Google web sign in');

    const fakeUser: User = {
      id: `google-user-${Date.now()}`,
      email: 'google.user@example.com',
      createdAt: new Date()
    };

    this.setCurrentUser(fakeUser);
    this.authUserEventEmitter.emitUserSignedIn(fakeUser);

    return fakeUser;
  }

  /**
   * Sign in user with Google OAuth for browser extension (simulated)
   * @returns Promise that resolves with the authenticated user
   */
  async signInWithGoogleExtension(): Promise<User> {
    console.debug('AuthUserStoreLocal: Simulating Google extension sign in');

    const fakeUser: User = {
      id: `extension-user-${Date.now()}`,
      email: 'extension.user@example.com',
      createdAt: new Date()
    };

    this.setCurrentUser(fakeUser);
    this.authUserEventEmitter.emitUserSignedIn(fakeUser);

    return fakeUser;
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    console.debug('AuthUserStoreLocal: Signing out user');

    this.setCurrentUser(null);
    this.authUserEventEmitter.emitUserSignedOut();
  }

  /**
   * Get the currently authenticated user
   * @returns Current user or null if not authenticated
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Set the current user (useful for testing)
   * @param user - The user to set as current, or null to clear
   */
  setCurrentUser(user: User | null): void {
    this.currentUser = user;
    this.saveUserToStorage();
    console.debug('AuthUserStoreLocal: Set current user:', user?.email || 'null');
  }

  /**
   * Create a fake signed-in user for testing purposes
   * @param userOverrides - Optional overrides for the user properties
   */
  createFakeSignedInUser(userOverrides: Partial<User> = {}): User {
    const fakeUser: User = {
      id: 'fake-user-' + Date.now(),
      email: 'fake.user@example.com',
      createdAt: new Date(),
      ...userOverrides
    };

    this.setCurrentUser(fakeUser);
    this.authUserEventEmitter.emitUserSignedIn(fakeUser);

    return fakeUser;
  }

  /**
   * Clear all stored authentication data
   */
  clear(): void {
    this.setCurrentUser(null);
    console.debug('AuthUserStoreLocal: Cleared all auth data');
  }

  /**
   * Loads user from localStorage
   */
  private loadUserFromStorage(): void {
    try {
      const storedUser = localStorage.getItem(this.storageKey);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // Deserialize Date objects
        if (parsedUser.createdAt) {
          parsedUser.createdAt = new Date(parsedUser.createdAt);
        }
        this.currentUser = parsedUser;
        console.debug('AuthUserStoreLocal: Loaded user from storage:', this.currentUser.email);
      } else {
        this.currentUser = null;
        console.debug('AuthUserStoreLocal: No user found in storage');
      }
    } catch (error) {
      console.error('AuthUserStoreLocal: Error loading user from storage:', error);
      this.currentUser = null;
    }
  }

  /**
   * Saves user to localStorage
   */
  private saveUserToStorage(): void {
    try {
      if (this.currentUser) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.currentUser));
        console.debug('AuthUserStoreLocal: Saved user to storage');
      } else {
        localStorage.removeItem(this.storageKey);
        console.debug('AuthUserStoreLocal: Removed user from storage');
      }
    } catch (error) {
      console.error('AuthUserStoreLocal: Error saving user to storage:', error);
    }
  }
}