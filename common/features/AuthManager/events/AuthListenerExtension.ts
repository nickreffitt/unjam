import { browser, type Browser } from 'wxt/browser';
import { type AuthUser } from '@common/types';
import { type AuthListener, type AuthListenerCallbacks } from './AuthListener';

/**
 * Auth event types for extension messages
 */
type AuthEventType = 'userRequiresProfile' | 'userProfileCreated' | 'userSignedIn' | 'userSignedOut' | 'authStateChanged';

/**
 * Extension implementation of auth listener
 * Uses browser extension messaging to receive auth events from background script
 * This is used in the popup/content scripts to listen for auth state changes
 */
export class AuthListenerExtension implements AuthListener {
  private callbacks: Partial<AuthListenerCallbacks>;
  private isListening: boolean = false;
  private messageListener: ((message: unknown, sender: Browser.Runtime.MessageSender) => void | Promise<unknown>) | null = null;

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
   * Starts listening to extension messages for auth events
   */
  startListening(): void {
    if (this.isListening || !browser.runtime) {
      return;
    }

    this.messageListener = (message) => {
      return this.processMessage(message);
    };

    browser.runtime.onMessage.addListener(this.messageListener);
    this.isListening = true;
    console.debug('AuthListenerExtension: Started listening to auth events from background');
  }

  /**
   * Processes incoming auth event messages
   */
  private async processMessage(message: unknown): Promise<{ success: boolean; error?: string }> {
    try {
      const messageData = message as {
        type?: string;
        eventType?: AuthEventType;
        authUser?: AuthUser;
      };

      // Only process auth-event messages
      if (messageData.type !== 'auth-event') {
        return { success: false, error: 'Not an auth event' };
      }

      console.debug('AuthListenerExtension: Received auth event', messageData.eventType);

      if (!messageData.eventType) {
        return { success: false, error: 'Missing eventType' };
      }

      await this.processEventData(messageData.eventType, messageData.authUser);
      return { success: true };
    } catch (error) {
      console.error('AuthListenerExtension: Error processing message:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Processes auth event data
   */
  private async processEventData(eventType: AuthEventType, authUser?: AuthUser): Promise<void> {
    try {
      switch (eventType) {
        case 'userRequiresProfile':
          if (this.callbacks.onUserRequiresProfile && authUser) {
            try {
              this.callbacks.onUserRequiresProfile(authUser);
            } catch (error) {
              console.error('AuthListenerExtension: Error in onUserRequiresProfile:', error);
            }
          }
          break;

        case 'userProfileCreated':
          if (this.callbacks.onUserProfileCreated && authUser) {
            try {
              this.callbacks.onUserProfileCreated(authUser);
            } catch (error) {
              console.error('AuthListenerExtension: Error in onUserProfileCreated:', error);
            }
          }
          break;

        case 'userSignedIn':
          if (this.callbacks.onUserSignedIn && authUser) {
            try {
              this.callbacks.onUserSignedIn(authUser);
            } catch (error) {
              console.error('AuthListenerExtension: Error in onUserSignedIn:', error);
            }
          }
          break;

        case 'userSignedOut':
          if (this.callbacks.onUserSignedOut) {
            try {
              this.callbacks.onUserSignedOut();
            } catch (error) {
              console.error('AuthListenerExtension: Error in onUserSignedOut:', error);
            }
          }
          break;

        case 'authStateChanged':
          if (this.callbacks.onAuthStateChanged && authUser) {
            try {
              this.callbacks.onAuthStateChanged(authUser);
            } catch (error) {
              console.error('AuthListenerExtension: Error in onAuthStateChanged:', error);
            }
          }
          break;

        default:
          console.warn('AuthListenerExtension: Unknown event type:', eventType);
      }
    } catch (error) {
      console.error('AuthListenerExtension: Error processing event data:', error);
    }
  }

  /**
   * Stops listening to extension messages
   */
  stopListening(): void {
    if (!this.isListening) return;

    if (this.messageListener) {
      browser.runtime.onMessage.removeListener(this.messageListener);
      this.messageListener = null;
    }

    this.isListening = false;
    console.debug('AuthListenerExtension: Stopped listening to auth events');
  }

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}
