import { type User } from '@common/types';

/**
 * Auth user event types that can be emitted by AuthUserStore
 */
export type AuthUserEventType = 'userSignedIn' | 'userSignedOut' | 'authStateChanged';

/**
 * Event callback function types
 */
export type AuthUserSignedInCallback = (user: User) => void;
export type AuthUserSignedOutCallback = () => void;
export type AuthStateChangedCallback = (user: User | null) => void;

/**
 * Interface for auth user event emission
 * Defines events that AuthUserStore can emit when auth operations occur
 */
export interface AuthUserEventEmitter {
  /**
   * Emit event when user signs in successfully
   * @param user - The signed-in user
   */
  emitUserSignedIn(user: User): void;

  /**
   * Emit event when user signs out
   */
  emitUserSignedOut(): void;

  /**
   * Emit event when auth state changes (token refresh, etc.)
   * @param user - The current user or null if signed out
   */
  emitAuthStateChanged(user: User | null): void;

  /**
   * Subscribe to user signed in events
   * @param callback - Function to call when user signs in
   * @returns Cleanup function to remove the listener
   */
  onUserSignedIn(callback: AuthUserSignedInCallback): () => void;

  /**
   * Subscribe to user signed out events
   * @param callback - Function to call when user signs out
   * @returns Cleanup function to remove the listener
   */
  onUserSignedOut(callback: AuthUserSignedOutCallback): () => void;

  /**
   * Subscribe to auth state changed events
   * @param callback - Function to call when auth state changes
   * @returns Cleanup function to remove the listener
   */
  onAuthStateChanged(callback: AuthStateChangedCallback): () => void;

  /**
   * Cleanup all listeners and stop event processing
   */
  cleanup(): void;
}