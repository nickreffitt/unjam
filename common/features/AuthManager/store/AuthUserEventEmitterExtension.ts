import { type User } from '@common/types';
import {
  type AuthUserEventEmitter,
  type AuthUserSignedInCallback,
  type AuthUserSignedOutCallback,
  type AuthStateChangedCallback
} from './AuthUserEventEmitter';

/**
 * Extension background script event emitter for auth user events
 * Simplified version without window/localStorage dependencies
 * Only supports local callbacks (no cross-tab communication needed in background)
 */
export class AuthUserEventEmitterExtension implements AuthUserEventEmitter {
  private callbacks: {
    userSignedIn: Set<AuthUserSignedInCallback>;
    userSignedOut: Set<AuthUserSignedOutCallback>;
    authStateChanged: Set<AuthStateChangedCallback>;
  } = {
    userSignedIn: new Set(),
    userSignedOut: new Set(),
    authStateChanged: new Set(),
  };

  constructor() {
    // No window/storage setup needed
  }

  /**
   * Emit event when user signs in successfully
   */
  emitUserSignedIn(user: User): void {
    console.debug('AuthUserEventEmitterExtension: Emitting userSignedIn event:', user);
    this.callbacks.userSignedIn.forEach(callback => callback(user));
  }

  /**
   * Emit event when user signs out
   */
  emitUserSignedOut(): void {
    console.debug('AuthUserEventEmitterExtension: Emitting userSignedOut event');
    this.callbacks.userSignedOut.forEach(callback => callback());
  }

  /**
   * Emit event when auth state changes
   */
  emitAuthStateChanged(user: User | null): void {
    console.debug('AuthUserEventEmitterExtension: Emitting authStateChanged event:', user);
    this.callbacks.authStateChanged.forEach(callback => callback(user));
  }

  /**
   * Subscribe to user signed in events
   */
  onUserSignedIn(callback: AuthUserSignedInCallback): () => void {
    this.callbacks.userSignedIn.add(callback);
    return () => {
      this.callbacks.userSignedIn.delete(callback);
    };
  }

  /**
   * Subscribe to user signed out events
   */
  onUserSignedOut(callback: AuthUserSignedOutCallback): () => void {
    this.callbacks.userSignedOut.add(callback);
    return () => {
      this.callbacks.userSignedOut.delete(callback);
    };
  }

  /**
   * Subscribe to auth state changed events
   */
  onAuthStateChanged(callback: AuthStateChangedCallback): () => void {
    this.callbacks.authStateChanged.add(callback);
    return () => {
      this.callbacks.authStateChanged.delete(callback);
    };
  }

  /**
   * Stop listening for events and cleanup
   */
  cleanup(): void {
    this.callbacks.userSignedIn.clear();
    this.callbacks.userSignedOut.clear();
    this.callbacks.authStateChanged.clear();
  }
}
