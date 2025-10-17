import { browser, type Browser } from 'wxt/browser';
import { type UserProfile } from '@common/types';
import type { Session } from '@supabase/supabase-js';

/**
 * Interface for objects that listen to extension events
 * All methods are optional to allow listeners to subscribe to only the events they care about
 */
export interface ExtensionEventListenerCallbacks {
  /**
   * Called when user submits sign-in form
   * @param email - The user's email address
   */
  onSignInSubmit?(email: string): void | Promise<void>;

  /**
   * Called when user submits OTP verification
   * @param email - The user's email address
   * @param token - The 6-digit OTP code
   */
  onVerifyOtpSubmit?(email: string, token: string): void | Promise<void>;

  /**
   * Called when popup requests the current user
   * @returns The current user profile or null
   */
  onGetCurrentUser?(): UserProfile | null | Promise<UserProfile | null>;

  /**
   * Called when user requests to sign out
   */
  onSignOut?(): void | Promise<void>;

  /**
   * Called when sign-in with OTP succeeds (background → popup)
   */
  onSignInWithOtpSuccess?(): void;

  /**
   * Called when sign-in with OTP fails (background → popup)
   * @param error - The error message
   */
  onSignInWithOtpFailure?(error: string): void;

  /**
   * Called when OTP verification succeeds (background → popup)
   */
  onVerifyOtpSuccess?(): void;

  /**
   * Called when OTP verification fails (background → popup)
   * @param error - The error message
   */
  onVerifyOtpFailure?(error: string): void;

  /**
   * Called when a Supabase session is received (background → content/popup)
   * @param session - The Supabase session object
   */
  onSupabaseSession?(session: Session | null): void | Promise<void>;
}

/**
 * Class that manages listening to extension messages from popup/content scripts
 * Used in background script to receive messages
 * Uses WXT's browser API for cross-browser compatibility
 */
export class ExtensionEventListener {
  private callbacks: Partial<ExtensionEventListenerCallbacks>;
  private isListening: boolean = false;
  private messageListener: ((message: unknown, sender: Browser.runtime.MessageSender, sendResponse: (response: any) => void) => boolean | Promise<unknown>) | null = null;

  constructor(callbacks: Partial<ExtensionEventListenerCallbacks>) {
    this.callbacks = callbacks;
  }

  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<ExtensionEventListenerCallbacks>): void {
    this.callbacks = callbacks;
  }

  /**
   * Starts listening to extension messages
   */
  startListening(): void {
    if (this.isListening || !browser.runtime) {
      return;
    }

    console.debug('ExtensionEventListener: Setting up message listener with sendResponse callback');

    // Chrome's extension messaging requires the sendResponse callback pattern for async
    const messageListener = (
      message: unknown,
      sender: any,
      sendResponse: (response: any) => void
    ): boolean => {
      console.debug('ExtensionEventListener: Received message', message);

      // Create a Promise and keep reference to it
      const responsePromise = this.processMessage(message);

      // Handle the Promise and call sendResponse
      responsePromise
        .then((result) => {
          console.debug('ExtensionEventListener: Calling sendResponse with result:', result);
          sendResponse(result);
        })
        .catch((error) => {
          console.error('ExtensionEventListener: Error processing message:', error);
          sendResponse({ success: false, error: String(error) });
        });

      // CRITICAL: Return true to indicate we will call sendResponse asynchronously
      return true;
    };

    // Use native Chrome API for better compatibility
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      console.debug('ExtensionEventListener: Using chrome.runtime API');
      chrome.runtime.onMessage.addListener(messageListener);
    } else if (browser.runtime?.onMessage) {
      console.debug('ExtensionEventListener: Using browser.runtime API');
      browser.runtime.onMessage.addListener(messageListener as any);
    }

    this.isListening = true;
    console.debug('ExtensionEventListener: Started listening to extension messages');
  }

  /**
   * Processes incoming messages
   */
  private async processMessage(message: unknown): Promise<{ success: boolean; user?: UserProfile | null; error?: string }> {
    try {
      const messageData = message as {
        type?: string;
        email?: string;
        token?: string;
        session?: Session | null;
        error?: string;
      };

      console.debug('ExtensionEventListener: Received message', messageData.type);

      switch (messageData.type) {
        case 'signInSubmit':
          if (this.callbacks.onSignInSubmit && messageData.email) {
            try {
              await this.callbacks.onSignInSubmit(messageData.email);
              return { success: true };
            } catch (error) {
              console.error('ExtensionEventListener: Error in onSignInSubmit:', error);
              return { success: false, error: String(error) };
            }
          }
          break;

        case 'verifyOtpSubmit':
          if (this.callbacks.onVerifyOtpSubmit && messageData.email && messageData.token) {
            try {
              await this.callbacks.onVerifyOtpSubmit(messageData.email, messageData.token);
              return { success: true };
            } catch (error) {
              console.error('ExtensionEventListener: Error in onVerifyOtpSubmit:', error);
              return { success: false, error: String(error) };
            }
          }
          break;

        case 'getCurrentUser':
          if (this.callbacks.onGetCurrentUser) {
            try {
              const user = await this.callbacks.onGetCurrentUser();
              return { success: true, user };
            } catch (error) {
              console.error('ExtensionEventListener: Error in onGetCurrentUser:', error);
              return { success: false, error: String(error) };
            }
          }
          break;

        case 'signOut':
          if (this.callbacks.onSignOut) {
            try {
              await this.callbacks.onSignOut();
              return { success: true };
            } catch (error) {
              console.error('ExtensionEventListener: Error in onSignOut:', error);
              return { success: false, error: String(error) };
            }
          }
          break;

        case 'signInWithOtpSuccess':
          if (this.callbacks.onSignInWithOtpSuccess) {
            this.callbacks.onSignInWithOtpSuccess();
          }
          return { success: true };

        case 'signInWithOtpFailure':
          if (this.callbacks.onSignInWithOtpFailure) {
            this.callbacks.onSignInWithOtpFailure(messageData.error || 'Unknown error');
          }
          return { success: true };

        case 'verifyOtpSuccess':
          if (this.callbacks.onVerifyOtpSuccess) {
            this.callbacks.onVerifyOtpSuccess();
          }
          return { success: true };

        case 'verifyOtpFailure':
          if (this.callbacks.onVerifyOtpFailure) {
            this.callbacks.onVerifyOtpFailure(messageData.error || 'Unknown error');
          }
          return { success: true };

        case 'supabaseSession':
          if (this.callbacks.onSupabaseSession) {
            try {
              await this.callbacks.onSupabaseSession(messageData.session || null);
              return { success: true };
            } catch (error) {
              console.error('ExtensionEventListener: Error in onSupabaseSession:', error);
              return { success: false, error: String(error) };
            }
          }
          return { success: true };

        default:
          console.debug('ExtensionEventListener: Unknown message type:', messageData.type);
          return { success: false, error: 'Unknown message type' };
      }

      return { success: false, error: 'No callback registered' };
    } catch (error) {
      console.error('ExtensionEventListener: Error processing message:', error);
      return { success: false, error: String(error) };
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
    console.debug('ExtensionEventListener: Stopped listening to extension messages');
  }

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}
