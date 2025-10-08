import { browser } from 'wxt/browser';
import { type UserProfile } from '@common/types';

/**
 * Event emitter for extension popup-to-background script communication
 * Uses WXT's browser API for cross-browser compatibility
 */
export class ExtensionEventEmitter {
  constructor() {
    // No initialization needed
  }

  /**
   * Emits a sign-in form submission event
   * @param email - The user's email address
   */
  async emitSignInSubmit(email: string): Promise<void> {
    await this.sendMessage({
      type: 'signInSubmit',
      email,
      timestamp: Date.now()
    });
  }

  /**
   * Emits a verify OTP submission event
   * @param email - The user's email address
   * @param token - The 6-digit OTP code
   */
  async emitVerifyOtpSubmit(email: string, token: string): Promise<void> {
    await this.sendMessage({
      type: 'verifyOtpSubmit',
      email,
      token,
      timestamp: Date.now()
    });
  }

  /**
   * Emits a sign-in with OTP success event (background → popup)
   */
  async emitSignInWithOtpSuccess(): Promise<void> {
    await this.sendMessage({
      type: 'signInWithOtpSuccess',
      timestamp: Date.now()
    });
  }

  /**
   * Emits a sign-in with OTP failure event (background → popup)
   * @param error - The error message
   */
  async emitSignInWithOtpFailure(error: string): Promise<void> {
    await this.sendMessage({
      type: 'signInWithOtpFailure',
      error,
      timestamp: Date.now()
    });
  }

  /**
   * Emits a verify OTP success event (background → popup)
   */
  async emitVerifyOtpSuccess(): Promise<void> {
    await this.sendMessage({
      type: 'verifyOtpSuccess',
      timestamp: Date.now()
    });
  }

  /**
   * Emits a verify OTP failure event (background → popup)
   * @param error - The error message
   */
  async emitVerifyOtpFailure(error: string): Promise<void> {
    await this.sendMessage({
      type: 'verifyOtpFailure',
      error,
      timestamp: Date.now()
    });
  }

  /**
   * Requests the current user from the background script
   * @returns Promise that resolves with the current user profile or null
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    const response = await this.sendMessage({
      type: 'getCurrentUser',
      timestamp: Date.now()
    });

    return response?.user || null;
  }

  /**
   * Sends a message to the background script
   * @returns Promise that resolves with the response from the background script
   */
  private async sendMessage(message: Record<string, unknown>): Promise<any> {
    console.debug('ExtensionEventEmitter: Attempting to send message:', message);

    if (!browser) {
      console.error('ExtensionEventEmitter: browser object not available');
      return null;
    }

    if (!browser.runtime) {
      console.error('ExtensionEventEmitter: browser.runtime not available');
      return null;
    }

    console.debug('ExtensionEventEmitter: browser.runtime is available, sending message...');

    try {
      const response = await browser.runtime.sendMessage(message);
      console.debug('ExtensionEventEmitter: Message sent successfully:', message.type, 'Response:', response);
      return response;
    } catch (error) {
      console.error('ExtensionEventEmitter: Error sending message:', error);
      throw error;
    }
  }
}
