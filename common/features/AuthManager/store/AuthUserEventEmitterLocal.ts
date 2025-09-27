import { type User } from '@common/types';
import {
  type AuthUserEventEmitter,
  type AuthUserSignedInCallback,
  type AuthUserSignedOutCallback,
  type AuthStateChangedCallback
} from './AuthUserEventEmitter';

/**
 * Local event emitter implementation for auth user events
 * Uses localStorage events for cross-tab communication
 */
export class AuthUserEventEmitterLocal implements AuthUserEventEmitter {
  private readonly storageKey = 'authUserStore-events';
  private callbacks: {
    userSignedIn: Set<AuthUserSignedInCallback>;
    userSignedOut: Set<AuthUserSignedOutCallback>;
    authStateChanged: Set<AuthStateChangedCallback>;
  } = {
    userSignedIn: new Set(),
    userSignedOut: new Set(),
    authStateChanged: new Set(),
  };

  private isListening = false;

  constructor() {
    this.startListening();
  }

  /**
   * Start listening for storage events to handle cross-tab communication
   */
  private startListening(): void {
    if (this.isListening) return;

    window.addEventListener('storage', this.handleStorageEvent);
    this.isListening = true;
  }

  /**
   * Handle storage events from other tabs
   */
  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== this.storageKey) return;

    try {
      const eventData = JSON.parse(event.newValue || '{}');
      this.processEvent(eventData);
    } catch (error) {
      console.error('AuthUserEventEmitterLocal: Error processing storage event:', error);
    }
  };

  /**
   * Process an auth user event
   */
  private processEvent(eventData: { type: string; payload?: User | null }): void {
    switch (eventData.type) {
      case 'userSignedIn':
        if (eventData.payload) {
          this.callbacks.userSignedIn.forEach(callback => callback(eventData.payload as User));
        }
        break;

      case 'userSignedOut':
        this.callbacks.userSignedOut.forEach(callback => callback());
        break;

      case 'authStateChanged':
        this.callbacks.authStateChanged.forEach(callback => callback(eventData.payload as User | null));
        break;

      default:
        console.warn('AuthUserEventEmitterLocal: Unknown event type:', eventData);
        break;
    }
  }

  /**
   * Emit an event both locally and across tabs
   */
  private emitEvent(type: string, payload?: User | null): void {
    console.debug('AuthUserEventEmitterLocal: emitEvent - type: ', type, ' payload: ', payload)
    const eventData = { type, payload, timestamp: Date.now() };

    // Emit locally first
    this.processEvent(eventData);

    // Then emit to other tabs via localStorage
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(eventData));
      // Clear immediately to trigger event on next write
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('AuthUserEventEmitterLocal: Error emitting event to localStorage:', error);
    }
  }

  /**
   * Emit event when user signs in successfully
   */
  emitUserSignedIn(user: User): void {
    console.debug('AuthUserEventEmitterLocal: Emitting userSignedIn event:', user);
    this.emitEvent('userSignedIn', user);
  }

  /**
   * Emit event when user signs out
   */
  emitUserSignedOut(): void {
    console.debug('AuthUserEventEmitterLocal: Emitting userSignedOut event');
    this.emitEvent('userSignedOut');
  }

  /**
   * Emit event when auth state changes
   */
  emitAuthStateChanged(user: User | null): void {
    console.debug('AuthUserEventEmitterLocal: Emitting authStateChanged event:', user);
    this.emitEvent('authStateChanged', user);
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
    if (this.isListening) {
      window.removeEventListener('storage', this.handleStorageEvent);
      this.isListening = false;
    }
    this.callbacks.userSignedIn.clear();
    this.callbacks.userSignedOut.clear();
    this.callbacks.authStateChanged.clear();
  }
}