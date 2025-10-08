import { browser } from 'wxt/browser';
import { type User, type UserProfile, type AuthUser } from '@common/types';
import { type AuthEventEmitter } from './AuthEventEmitter';

/**
 * Auth event types for extension messages
 */
type AuthEventType = 'userRequiresProfile' | 'userProfileCreated' | 'userSignedIn' | 'userSignedOut' | 'authStateChanged';

/**
 * Extension background script implementation of the auth event emitter
 * Uses browser extension messaging to broadcast auth events to popup/content scripts
 */
export class AuthEventEmitterExtension implements AuthEventEmitter {
  constructor() {
    // No initialization needed
  }

  /**
   * Emits a user requires profile event
   * @param authUser - The AuthUser who needs to complete their profile
   */
  emitUserRequiresProfile(authUser: AuthUser): void {
    console.debug('AuthEventEmitterExtension: emitUserRequiresProfile called with:', authUser);
    this.broadcastAuthEvent('userRequiresProfile', authUser);
  }

  /**
   * Emits a user profile created event
   * @param authUser - The AuthUser with newly created profile
   */
  emitUserProfileCreated(authUser: AuthUser): void {
    console.debug('AuthEventEmitterExtension: emitUserProfileCreated called with:', authUser);
    this.broadcastAuthEvent('userProfileCreated', authUser);
    // Also emit signed in since they now have a complete profile
    this.emitUserSignedIn(authUser);
  }

  /**
   * Emits a user signed in event
   * @param authUser - The AuthUser who signed in
   */
  emitUserSignedIn(authUser: AuthUser): void {
    console.debug('AuthEventEmitterExtension: emitUserSignedIn called with:', authUser);
    this.broadcastAuthEvent('userSignedIn', authUser);
    // Also emit the general auth state change
    this.broadcastAuthEvent('authStateChanged', authUser);
  }

  /**
   * Emits a user signed out event
   */
  emitUserSignedOut(): void {
    console.debug('AuthEventEmitterExtension: emitUserSignedOut called');
    this.broadcastAuthEvent('userSignedOut');
    // Also emit the general auth state change
    this.broadcastAuthEvent('authStateChanged', { status: 'not-signed-in' });
  }

  /**
   * Emits an auth state changed event
   * @param authUser - The current AuthUser
   */
  emitAuthStateChanged(authUser: AuthUser): void {
    console.debug('AuthEventEmitterExtension: emitAuthStateChanged called with:', authUser);
    this.broadcastAuthEvent('authStateChanged', authUser);
  }

  /**
   * Broadcasts an auth event to all extension contexts (popup, content scripts)
   */
  private broadcastAuthEvent(eventType: AuthEventType, authUser?: AuthUser): void {
    if (!browser.runtime) {
      console.error('AuthEventEmitterExtension: browser.runtime not available');
      return;
    }

    const message = {
      type: 'auth-event',
      eventType,
      authUser,
      timestamp: Date.now()
    };

    // Send to all tabs (content scripts)
    browser.tabs.query({}).then(tabs => {
      tabs.forEach(tab => {
        if (tab.id) {
          browser.tabs.sendMessage(tab.id, message).catch(error => {
            // Silently ignore errors (tab might not have content script)
            console.debug('AuthEventEmitterExtension: Could not send to tab', tab.id, error);
          });
        }
      });
    }).catch(error => {
      console.error('AuthEventEmitterExtension: Error querying tabs:', error);
    });

    // Send to extension pages (popup, options)
    browser.runtime.sendMessage(message).catch(error => {
      // Silently ignore errors (popup might not be open)
      console.debug('AuthEventEmitterExtension: Could not send to extension pages:', error);
    });

    console.debug('AuthEventEmitterExtension: Broadcasted auth event:', eventType);
  }
}
