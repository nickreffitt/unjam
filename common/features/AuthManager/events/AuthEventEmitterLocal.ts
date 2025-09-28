import { type User, type UserProfile, type AuthUser } from '@common/types';
import { type AuthEventEmitter } from './AuthEventEmitter';

/**
 * Auth event types for internal use
 */
type AuthEventType = 'userRequiresProfile' | 'userProfileCreated' | 'userSignedIn' | 'userSignedOut' | 'authStateChanged';

/**
 * Local storage implementation of the auth event emitter
 * Uses window events and localStorage for cross-tab communication
 */
export class AuthEventEmitterLocal implements AuthEventEmitter {
  constructor() {
    // No need for local listeners - everything goes through window events
  }

  /**
   * Emits a user requires profile event
   * @param authUser - The AuthUser who needs to complete their profile
   */
  emitUserRequiresProfile(authUser: AuthUser): void {
    const emitterId = Math.random().toString(36).substr(2, 9);
    console.debug(`[AuthEventEmitterLocal-${emitterId}] emitUserRequiresProfile called with:`, authUser);
    console.debug(`[AuthEventEmitterLocal-${emitterId}] Call stack:`, new Error().stack);
    this.emitWindowEvent('userRequiresProfile', { authUser, emitterId });
  }

  /**
   * Emits a user profile created event
   * @param authUser - The AuthUser with newly created profile
   */
  emitUserProfileCreated(authUser: AuthUser): void {
    this.emitWindowEvent('userProfileCreated', { authUser });
    // Also emit signed in since they now have a complete profile
    this.emitUserSignedIn(authUser);
  }

  /**
   * Emits a user signed in event
   * @param authUser - The AuthUser who signed in
   */
  emitUserSignedIn(authUser: AuthUser): void {
    this.emitWindowEvent('userSignedIn', { authUser });
    // Also emit the general auth state change
    this.emitWindowEvent('authStateChanged', { authUser });
  }

  /**
   * Emits a user signed out event
   */
  emitUserSignedOut(): void {
    this.emitWindowEvent('userSignedOut', {});
    // Also emit the general auth state change
    this.emitWindowEvent('authStateChanged', { authUser: { status: 'not-signed-in' } });
  }

  /**
   * Emits an auth state changed event
   * @param authUser - The current AuthUser
   */
  emitAuthStateChanged(authUser: AuthUser): void {
    this.emitWindowEvent('authStateChanged', { authUser });
  }

  /**
   * Emits events for both same-tab and cross-tab communication
   */
  private emitWindowEvent(type: AuthEventType, data: Record<string, unknown>): void {
    if (typeof window === 'undefined') return; // Skip in non-browser environments

    const eventPayload = {
      type,
      ...data,
      timestamp: Date.now()
    };

    // 1. Emit custom window event for same-tab communication
    const customEvent = new CustomEvent('auth-event', {
      detail: eventPayload
    });
    window.dispatchEvent(customEvent);

    // 2. Use localStorage to trigger storage events for cross-tab communication
    const eventKey = 'authstore-event';
    localStorage.setItem(eventKey, JSON.stringify(eventPayload));

    // Clean up immediately to avoid cluttering localStorage
    localStorage.removeItem(eventKey);

    console.debug('AuthEventEmitterLocal: Emitting both window and storage events:', type, data);
  }
}