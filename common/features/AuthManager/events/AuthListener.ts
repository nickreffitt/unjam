import { type AuthUser } from '@common/types';

/**
 * Interface for objects that listen to auth events
 * All methods are optional to allow listeners to subscribe to only the events they care about
 */
export interface AuthListenerCallbacks {

  /**
   * Called when a user signs in but requires profile creation
   * @param authUser - The AuthUser who needs to complete their profile
   */
  onUserRequiresProfile?(authUser: AuthUser): void;

  /**
   * Called when a user profile is created
   * @param authUser - The AuthUser with newly created profile
   */
  onUserProfileCreated?(authUser: AuthUser): void;

  /**
   * Called when a user signs in
   * @param authUser - The AuthUser who signed in
   */
  onUserSignedIn?(authUser: AuthUser): void;

  /**
   * Called when a user signs out
   */
  onUserSignedOut?(): void;

  /**
   * Called when auth state changes (sign in or sign out)
   * @param authUser - The current AuthUser
   */
  onAuthStateChanged?(authUser: AuthUser): void;
}

/**
 * Interface for auth listener implementations
 * Defines the contract that all auth listener implementations must follow
 */
export interface AuthListener {
  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<AuthListenerCallbacks>): void;

  /**
   * Starts listening to auth events for cross-tab/cross-client communication
   */
  startListening(): void;

  /**
   * Stops listening to auth events
   */
  stopListening(): void;

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean;
}