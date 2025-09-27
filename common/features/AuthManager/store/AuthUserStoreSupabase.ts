import { type SupabaseClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { type User } from '@common/types';
import { type AuthUserStore } from './AuthUserStore';
import {
  type AuthUserEventEmitter,
  type AuthUserSignedInCallback,
  type AuthUserSignedOutCallback,
  type AuthStateChangedCallback
} from './AuthUserEventEmitter';

/**
 * Supabase implementation of the auth user store
 * Handles authentication operations using Supabase Auth and manages its own event emission
 */
export class AuthUserStoreSupabase implements AuthUserStore {
  private supabaseClient: SupabaseClient;
  private currentUser: User | null = null;
  private eventEmitter: AuthUserEventEmitter;
  private authStateCleanup?: () => void;

  constructor(supabaseClient: SupabaseClient, eventEmitter: AuthUserEventEmitter) {
    if (!supabaseClient) {
      throw new Error('AuthUserStoreSupabase: supabaseClient is required');
    }
    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;

    // Initialize current user from existing session
    this.initializeCurrentUser();

    // Set up Supabase auth state listener
    this.setupSupabaseAuthStateListener();
  }

  /**
   * Initialize current user from existing Supabase session
   */
  private async initializeCurrentUser(): Promise<void> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (user) {
        this.currentUser = this.mapSupabaseUserToUser(user);
        console.debug('AuthUserStoreSupabase: Initialized with existing user:', this.currentUser);
      }
    } catch (error) {
      console.error('AuthUserStoreSupabase: Error initializing current user:', error);
      this.currentUser = null;
    }
  }

  /**
   * Set up Supabase auth state listener that emits events through our event emitter
   */
  private setupSupabaseAuthStateListener(): void {
    console.debug('AuthUserStoreSupabase: Setting up Supabase auth state listener');

    const { data: { subscription } } = this.supabaseClient.auth.onAuthStateChange((event, session) => {
      console.debug('AuthUserStoreSupabase: Auth state changed:', event);

      switch (event) {
        case 'INITIAL_SESSION':
        case 'SIGNED_IN':
          if (session?.user) {
            const user = this.mapSupabaseUserToUser(session.user);
            this.currentUser = user;
            if (event === 'INITIAL_SESSION') {
              this.eventEmitter.emitAuthStateChanged(user);
              console.debug('AuthUserStoreSupabase: Initial session found, emitting auth state changed:', user);
            } else {
              this.eventEmitter.emitUserSignedIn(user);
              console.debug('AuthUserStoreSupabase: User signed in, emitting event:', user);
            }
          } else if (event === 'INITIAL_SESSION') {
            // No initial session - user is not signed in
            this.currentUser = null;
            this.eventEmitter.emitAuthStateChanged(null);
            console.debug('AuthUserStoreSupabase: No initial session, emitting auth state changed: null');
          }
          break;

        case 'SIGNED_OUT':
          this.currentUser = null;
          this.eventEmitter.emitUserSignedOut();
          console.debug('AuthUserStoreSupabase: User signed out, emitting event');
          break;

        case 'TOKEN_REFRESHED':
          if (session?.user) {
            const user = this.mapSupabaseUserToUser(session.user);
            this.currentUser = user;
            this.eventEmitter.emitAuthStateChanged(user);
            console.debug('AuthUserStoreSupabase: Token refreshed, emitting event:', user);
          }
          break;

        default:
          // Handle other events by treating them as token refresh if user exists
          if (session?.user) {
            const user = this.mapSupabaseUserToUser(session.user);
            this.currentUser = user;
            this.eventEmitter.emitAuthStateChanged(user);
          } else {
            this.currentUser = null;
            this.eventEmitter.emitAuthStateChanged(null);
          }
          break;
      }
    });

    // Store cleanup function
    this.authStateCleanup = () => {
      console.debug('AuthUserStoreSupabase: Cleaning up Supabase auth state listener');
      subscription.unsubscribe();
    };
  }

  /**
   * Subscribe to user signed in events
   */
  onUserSignedIn(callback: AuthUserSignedInCallback): () => void {
    return this.eventEmitter.onUserSignedIn(callback);
  }

  /**
   * Subscribe to user signed out events
   */
  onUserSignedOut(callback: AuthUserSignedOutCallback): () => void {
    return this.eventEmitter.onUserSignedOut(callback);
  }

  /**
   * Subscribe to auth state changed events
   */
  onAuthStateChanged(callback: AuthStateChangedCallback): () => void {
    return this.eventEmitter.onAuthStateChanged(callback);
  }

  /**
   * Sign in user with magic link
   */
  async signInWithMagicLink(email: string, redirectUrl?: string): Promise<void> {
    console.debug('AuthUserStoreSupabase: Signing in with magic link for:', email);

    try {
      const { error } = await this.supabaseClient.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl || `${window.location.origin}/auth/verify`,
        },
      });

      if (error) {
        console.error('AuthUserStoreSupabase: Magic link sign in failed:', error);
        throw new Error(`Failed to send magic link: ${error.message}`);
      }

      console.debug('AuthUserStoreSupabase: Magic link sent successfully to:', email);
    } catch (error) {
      console.error('AuthUserStoreSupabase: Unexpected error during magic link sign in:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred during magic link sign in');
    }
  }

  /**
   * Verify a magic link token and sign in the user
   */
  async verifyMagicLink(tokenHash: string): Promise<User> {
    console.debug('AuthUserStoreSupabase: Verifying magic link token');

    try {
      const { data, error } = await this.supabaseClient.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      });

      if (error) {
        console.error('AuthUserStoreSupabase: Magic link verification failed:', error);
        throw new Error(`Failed to verify magic link: ${error.message}`);
      }

      if (!data.user) {
        throw new Error('User not found in verification response');
      }

      // Convert Supabase user to our User type
      const user = this.mapSupabaseUserToUser(data.user);
      console.debug('AuthUserStoreSupabase: Magic link verified successfully for user:', user);
      return user;
    } catch (error) {
      console.error('AuthUserStoreSupabase: Unexpected error during magic link verification:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred during magic link verification');
    }
  }

  /**
   * Sign in user with Google OAuth for web applications
   */
  async signInWithGoogleWeb(redirectUrl?: string): Promise<User> {
    console.debug('AuthUserStoreSupabase: Signing in with Google for web');

    try {
      const { error } = await this.supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl || `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('AuthUserStoreSupabase: Google web sign in failed:', error);
        throw new Error(`Failed to sign in with Google: ${error.message}`);
      }

      // Since OAuth redirects, we won't actually reach this return in normal flow
      // But it's here for type compliance and edge cases
      console.debug('AuthUserStoreSupabase: Google sign in initiated, waiting for auth state change');

      return this.currentUser ?? {
        id: 'pending',
        createdAt: new Date(),
        email: undefined,
        confirmedAt: undefined,
        lastSignInAt: undefined,
        displayName: 'Pending Google Auth',
      };
    } catch (error) {
      console.error('AuthUserStoreSupabase: Unexpected error during Google web sign in:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred during Google sign in');
    }
  }

  /**
   * Sign in user with Google OAuth for browser extension
   */
  async signInWithGoogleExtension(): Promise<User> {
    console.debug('AuthUserStoreSupabase: Signing in with Google for extension');

    // Check if we're in a Chrome extension context
    const chromeGlobal = globalThis as { chrome?: { identity?: unknown } };
    if (!chromeGlobal.chrome?.identity) {
      throw new Error('Google extension sign in is only available in Chrome extension context');
    }

    // This would require setting up Google OAuth for Chrome extensions
    // For now, throw an error indicating this needs implementation
    throw new Error('Google extension sign in not yet implemented. Requires Chrome extension OAuth setup.');

    // Future implementation would look like:
    // try {
    //   const token = await chrome.identity.getAuthToken({ interactive: true });
    //   const { data, error } = await this.supabaseClient.auth.signInWithIdToken({
    //     provider: 'google',
    //     token,
    //   });
    //
    //   if (error) {
    //     throw new Error(`Failed to sign in with Google extension: ${error.message}`);
    //   }
    //
    //   return this.currentUser ?? {
    //     id: 'pending',
    //     name: 'Pending Google Extension Auth',
    //     type: 'customer',
    //   };
    // } catch (error) {
    //   console.error('AuthUserStoreSupabase: Unexpected error during Google extension sign in:', error);
    //   throw error instanceof Error ? error : new Error('An unexpected error occurred during Google extension sign in');
    // }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    console.debug('AuthUserStoreSupabase: Signing out user');

    try {
      const { error } = await this.supabaseClient.auth.signOut();

      if (error) {
        console.error('AuthUserStoreSupabase: Sign out failed:', error);
        throw new Error(`Failed to sign out: ${error.message}`);
      }

      // Clear current user - the auth state listener will handle event emission
      this.currentUser = null;
      console.debug('AuthUserStoreSupabase: User signed out successfully');
    } catch (error) {
      console.error('AuthUserStoreSupabase: Unexpected error during sign out:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred during sign out');
    }
  }

  /**
   * Get the currently authenticated user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Cleanup auth state listener and event emitter
   */
  cleanup(): void {
    console.debug('AuthUserStoreSupabase: Cleaning up');

    // Clean up Supabase auth state listener
    if (this.authStateCleanup) {
      this.authStateCleanup();
      this.authStateCleanup = undefined;
    }

    // Clean up event emitter
    this.eventEmitter.cleanup();
  }

  /**
   * Maps a Supabase User object to our User type
   * Extracts relevant user information from Supabase auth
   */
  private mapSupabaseUserToUser(user: SupabaseUser): User {
    const displayName = user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0];

    return {
      id: user.id,
      createdAt: new Date(user.created_at),
      email: user.email,
      confirmedAt: user.email_confirmed_at ? new Date(user.email_confirmed_at) : undefined,
      lastSignInAt: user.last_sign_in_at ? new Date(user.last_sign_in_at) : undefined,
      displayName,
    };
  }
}