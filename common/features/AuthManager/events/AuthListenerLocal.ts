import { type AuthUser } from '@common/types';
import { type AuthListener, type AuthListenerCallbacks } from './AuthListener';

/**
 * Auth event types for internal use
 */
type AuthEventType = 'userRequiresProfile' | 'userProfileCreated' | 'userSignedIn' | 'userSignedOut' | 'authStateChanged';

/**
 * Local storage implementation of auth listener
 * Uses window events and localStorage for cross-tab communication
 */
export class AuthListenerLocal implements AuthListener {
  private callbacks: Partial<AuthListenerCallbacks>;
  private isListening: boolean = false;
  private handleStorageEvent: ((event: StorageEvent) => void) | null = null;
  private handleWindowEvent: ((event: CustomEvent) => void) | null = null;

  constructor(callbacks: Partial<AuthListenerCallbacks>) {
    this.callbacks = callbacks;
  }

  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<AuthListenerCallbacks>): void {
    this.callbacks = callbacks;
  }

  /**
   * Starts listening to both storage events (cross-tab) and window events (same-tab)
   */
  startListening(): void {
    if (this.isListening || typeof window === 'undefined') return;

    // Listen for storage events (cross-tab communication)
    this.handleStorageEvent = (event: StorageEvent) => {
      // Only process events for our specific key
      if (event.key !== 'authstore-event' || !event.newValue) return;

      try {
        const eventData = JSON.parse(event.newValue);
        this.processEventData(eventData);
      } catch (error) {
        console.error('AuthListenerLocal: Error parsing storage event data:', error);
      }
    };

    // Listen for window events (same-tab communication)
    this.handleWindowEvent = (event: CustomEvent) => {
      try {
        this.processEventData(event.detail);
      } catch (error) {
        console.error('AuthListenerLocal: Error processing window event data:', error);
      }
    };

    window.addEventListener('storage', this.handleStorageEvent);
    window.addEventListener('auth-event', this.handleWindowEvent as EventListener);
    this.isListening = true;

    console.debug('AuthListenerLocal: Started listening to global auth events via storage and window events');
  }

  /**
   * Processes event data from either storage or window events
   */
  private processEventData(eventData: any): void {
    try {
        if (!eventData || typeof eventData !== 'object') {
          console.warn('AuthListenerLocal: Invalid event data received:', eventData);
          return;
        }

        const { type, authUser, emitterId } = eventData;
        console.debug('AuthListenerLocal: Processing event:', type, 'with authUser:', authUser, 'emitterId:', emitterId);

        // Deserialize Date objects if authUser is present (in case dates are included in future)
        let deserializedAuthUser: AuthUser | null = authUser;
        if (authUser && typeof authUser === 'object' && authUser !== null) {
          // Currently AuthUser doesn't have dates, but this future-proofs it
          deserializedAuthUser = { ...authUser };
        }

        switch (type as AuthEventType) {
          case 'userRequiresProfile':
            if (this.callbacks.onUserRequiresProfile && deserializedAuthUser) {
              // Ignore events without emitterId (stale events from before the emitterId was added)
              if (!emitterId) {
                console.debug('AuthListenerLocal: Ignoring stale userRequiresProfile event without emitterId');
                break;
              }

              // Check if this is a stale event by comparing with current auth state
              const currentTimestamp = Date.now();
              const eventTimestamp = eventData.timestamp || 0;
              const timeDiff = currentTimestamp - eventTimestamp;

              console.debug('AuthListenerLocal: userRequiresProfile event - current:', currentTimestamp, 'event:', eventTimestamp, 'diff:', timeDiff + 'ms');

              // Ignore events older than 10 seconds to prevent stale events
              if (timeDiff > 10000) {
                console.debug('AuthListenerLocal: Ignoring stale userRequiresProfile event, age:', timeDiff + 'ms');
                break;
              }

              try {
                this.callbacks.onUserRequiresProfile(deserializedAuthUser);
              } catch (error) {
                console.error('AuthListenerLocal: Error in onUserRequiresProfile:', error);
              }
            }
            break;
          case 'userProfileCreated':
            if (this.callbacks.onUserProfileCreated && deserializedAuthUser) {
              try {
                this.callbacks.onUserProfileCreated(deserializedAuthUser);
              } catch (error) {
                console.error('AuthListenerLocal: Error in onUserProfileCreated:', error);
              }
            }
            break;
          case 'userSignedIn':
            if (this.callbacks.onUserSignedIn && deserializedAuthUser) {
              try {
                this.callbacks.onUserSignedIn(deserializedAuthUser);
              } catch (error) {
                console.error('AuthListenerLocal: Error in onUserSignedIn:', error);
              }
            }
            break;
          case 'userSignedOut':
            if (this.callbacks.onUserSignedOut) {
              try {
                this.callbacks.onUserSignedOut();
              } catch (error) {
                console.error('AuthListenerLocal: Error in onUserSignedOut:', error);
              }
            }
            break;
          case 'authStateChanged':
            if (this.callbacks.onAuthStateChanged && deserializedAuthUser) {
              try {
                this.callbacks.onAuthStateChanged(deserializedAuthUser);
              } catch (error) {
                console.error('AuthListenerLocal: Error in onAuthStateChanged:', error);
              }
            }
            break;
        }
    } catch (error) {
      console.error('AuthListenerLocal: Error processing event data:', error);
    }
  }

  /**
   * Stops listening to both storage and window events
   */
  stopListening(): void {
    if (!this.isListening) return;

    if (this.handleStorageEvent) {
      window.removeEventListener('storage', this.handleStorageEvent);
      this.handleStorageEvent = null;
    }

    if (this.handleWindowEvent) {
      window.removeEventListener('auth-event', this.handleWindowEvent as EventListener);
      this.handleWindowEvent = null;
    }

    this.isListening = false;
    console.debug('AuthListenerLocal: Stopped listening to global auth events');
  }

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}