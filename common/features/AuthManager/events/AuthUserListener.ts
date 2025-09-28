import { type User } from '@common/types';

/**
 * Callback function types for AuthUserEventEmitter events
 */
export interface AuthUserListenerCallbacks {
  /**
   * Called when a user signs in (from AuthUserEventEmitter)
   * @param user - The signed-in user from auth system
   */
  onUserSignedIn?(user: User): void | Promise<void>;

  /**
   * Called when a user signs out (from AuthUserEventEmitter)
   */
  onUserSignedOut?(): void | Promise<void>;

  /**
   * Called when auth state changes (from AuthUserEventEmitter)
   * @param user - The current user or null if signed out
   */
  onAuthStateChanged?(user: User | null): void | Promise<void>;
}

/**
 * Interface for auth user listener implementations
 * Defines the contract that all auth user listener implementations must follow
 */
export interface AuthUserListener {
  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<AuthUserListenerCallbacks>): void;

  /**
   * Starts listening to AuthUserEventEmitter events
   */
  startListening(): void;

  /**
   * Stops listening to AuthUserEventEmitter events
   */
  stopListening(): void;

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean;
}