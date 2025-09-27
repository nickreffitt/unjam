import { type User } from '@common/types';
import { type AuthUserStore } from '../store/AuthUserStore';

/**
 * Callback function types for AuthUserStore events
 */
export interface AuthUserListenerCallbacks {
  /**
   * Called when a user signs in (from AuthUserStore)
   * @param user - The signed-in user from auth system
   */
  onUserSignedIn?(user: User): void | Promise<void>;

  /**
   * Called when a user signs out (from AuthUserStore)
   */
  onUserSignedOut?(): void | Promise<void>;

  /**
   * Called when auth state changes (from AuthUserStore)
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
   * Starts listening to AuthUserStore events
   */
  startListening(): void;

  /**
   * Stops listening to AuthUserStore events
   */
  stopListening(): void;

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean;
}

/**
 * AuthUserListener implementation that listens to AuthUserStore events
 * Designed to bridge User events from AuthUserStore to application logic
 */
export class AuthUserListenerLocal implements AuthUserListener {
  private authUserStore: AuthUserStore;
  private callbacks: Partial<AuthUserListenerCallbacks>;
  private isListening: boolean = false;
  private cleanupFunctions: (() => void)[] = [];

  constructor(authUserStore: AuthUserStore, callbacks: Partial<AuthUserListenerCallbacks> = {}) {
    this.authUserStore = authUserStore;
    this.callbacks = callbacks;
  }

  /**
   * Updates the callbacks
   */
  updateCallbacks(callbacks: Partial<AuthUserListenerCallbacks>): void {
    this.callbacks = callbacks;
  }

  /**
   * Starts listening to AuthUserStore events
   */
  startListening(): void {
    if (this.isListening) {
      console.debug('AuthUserListenerLocal: Already listening, skipping start');
      return;
    }

    console.debug('AuthUserListenerLocal: Starting to listen to AuthUserStore events');

    // Set up user signed in listener
    if (this.callbacks.onUserSignedIn) {
      const userSignedInCleanup = this.authUserStore.onUserSignedIn(async (user: User) => {
        console.debug('AuthUserListenerLocal: User signed in event received');
        try {
          await this.callbacks.onUserSignedIn?.(user);
        } catch (error) {
          console.error('AuthUserListenerLocal: Error in onUserSignedIn callback:', error);
        }
      });
      this.cleanupFunctions.push(userSignedInCleanup);
    }

    // Set up user signed out listener
    if (this.callbacks.onUserSignedOut) {
      const userSignedOutCleanup = this.authUserStore.onUserSignedOut(async () => {
        console.debug('AuthUserListenerLocal: User signed out event received');
        try {
          await this.callbacks.onUserSignedOut?.();
        } catch (error) {
          console.error('AuthUserListenerLocal: Error in onUserSignedOut callback:', error);
        }
      });
      this.cleanupFunctions.push(userSignedOutCleanup);
    }

    // Set up auth state changed listener
    if (this.callbacks.onAuthStateChanged) {
      const authStateChangedCleanup = this.authUserStore.onAuthStateChanged(async (user: User | null) => {
        console.debug('AuthUserListenerLocal: Auth state changed event received');
        try {
          await this.callbacks.onAuthStateChanged?.(user);
        } catch (error) {
          console.error('AuthUserListenerLocal: Error in onAuthStateChanged callback:', error);
        }
      });
      this.cleanupFunctions.push(authStateChangedCleanup);
    }

    this.isListening = true;
  }

  /**
   * Stops listening to AuthUserStore events
   */
  stopListening(): void {
    if (!this.isListening) {
      console.debug('AuthUserListenerLocal: Not listening, skipping stop');
      return;
    }

    console.debug('AuthUserListenerLocal: Stopping AuthUserStore event listening');

    // Clean up all listeners
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];
    this.isListening = false;
  }

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}