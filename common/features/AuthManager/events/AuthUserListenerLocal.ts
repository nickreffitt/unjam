import { type User } from '@common/types';
import { type AuthUserEventEmitter } from '../store/AuthUserEventEmitter';
import { type AuthUserListener, type AuthUserListenerCallbacks } from './AuthUserListener';

/**
 * AuthUserListener implementation that listens to AuthUserEventEmitter events
 * Designed to bridge User events from AuthUserEventEmitter to application logic
 */
export class AuthUserListenerLocal implements AuthUserListener {
  private authUserEventEmitter: AuthUserEventEmitter;
  private callbacks: Partial<AuthUserListenerCallbacks> = {};
  private isListening: boolean = false;
  private cleanupFunctions: (() => void)[] = [];

  constructor(authUserEventEmitter: AuthUserEventEmitter) {
    this.authUserEventEmitter = authUserEventEmitter;
  }

  /**
   * Updates the callbacks
   */
  updateCallbacks(callbacks: Partial<AuthUserListenerCallbacks>): void {
    this.callbacks = callbacks;
  }

  /**
   * Starts listening to AuthUserEventEmitter events
   */
  startListening(): void {
    if (this.isListening) {
      console.debug('AuthUserListenerLocal: Already listening, skipping start');
      return;
    }

    console.debug('AuthUserListenerLocal: Starting to listen to AuthUserEventEmitter events');

    // Set up user signed in listener
    if (this.callbacks.onUserSignedIn) {
      const userSignedInCleanup = this.authUserEventEmitter.onUserSignedIn(async (user: User) => {
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
      const userSignedOutCleanup = this.authUserEventEmitter.onUserSignedOut(async () => {
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
      const authStateChangedCleanup = this.authUserEventEmitter.onAuthStateChanged(async (user: User | null) => {
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
   * Stops listening to AuthUserEventEmitter events
   */
  stopListening(): void {
    if (!this.isListening) {
      console.debug('AuthUserListenerLocal: Not listening, skipping stop');
      return;
    }

    console.debug('AuthUserListenerLocal: Stopping AuthUserEventEmitter event listening');

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