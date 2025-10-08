import { type User } from '@common/types';

/**
 * Interface for authentication user storage implementations
 * Abstracts authentication provider operations (e.g., Supabase Auth)
 * This separates auth provider logic from business logic in AuthManager
 * Stores manage their own event emission following the established pattern
 */
export interface AuthUserStore {
  
  /**
   * Sign in user with magic link
   * Sends a passwordless authentication email to the user
   *
   * @param email - User's email address
   * @param redirectUrl - URL to redirect to after clicking magic link
   * @throws Error if sign in fails
   */
  signInWithMagicLink(email: string, redirectUrl?: string): Promise<void>;

  /**
   * Verify a magic link token and sign in the user
   * Verifies the token hash from the magic link URL and authenticates the user
   *
   * @param tokenHash - The token hash from the magic link URL
   * @returns Promise that resolves with the authenticated user
   * @throws Error if verification fails
   */
  verifyMagicLink(tokenHash: string): Promise<User>;

  /**
   * Sign in user with OTP (One-Time Password)
   * Sends a 6-digit code to the user's email for passwordless authentication
   *
   * @param email - User's email address
   * @throws Error if sign in fails
   */
  signInWithOtp(email: string): Promise<void>;

  /**
   * Verify an OTP token and sign in the user
   * Verifies the 6-digit code from the email and authenticates the user
   *
   * @param email - User's email address
   * @param token - The 6-digit OTP code from the email
   * @returns Promise that resolves with the authenticated user
   * @throws Error if verification fails
   */
  verifyOtp(email: string, token: string): Promise<User>;

  /**
   * Sign in user with Google OAuth for web applications
   * Opens Google OAuth flow in the current window/tab
   *
   * @param redirectUrl - URL to redirect to after OAuth completion
   * @returns Promise that resolves with the authenticated user
   * @throws Error if Google sign in fails
   */
  signInWithGoogleWeb(redirectUrl?: string): Promise<User>;

  /**
   * Sign in user with Google OAuth for browser extension
   * Uses Chrome extension identity API for authentication
   *
   * @returns Promise that resolves with the authenticated user
   * @throws Error if Google extension sign in fails or not in extension context
   */
  signInWithGoogleExtension(): Promise<User>;

  /**
   * Sign out the current user
   * Clears the session and triggers auth state change
   *
   * @throws Error if sign out fails
   */
  signOut(): Promise<void>;

  /**
   * Get the currently authenticated user
   * @returns Current user or null if not authenticated
   */
  getCurrentUser(): User | null;
}