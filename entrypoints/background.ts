import { ExtensionEventListener, ExtensionEventEmitter } from '@common/features/ExtensionManager/events';
import { ExtensionStore } from '@common/features/ExtensionManager/store';
import { AuthManager } from '@common/features/AuthManager/AuthManager';
import { AuthUserStoreSupabase, AuthProfileStoreSupabase } from '@common/features/AuthManager';
import { AuthUserEventEmitterExtension } from '@common/features/AuthManager/store/AuthUserEventEmitterExtension';
import { AuthEventEmitterExtension } from '@common/features/AuthManager/events/AuthEventEmitterExtension';
import { AuthUserListenerExtension } from '@common/features/AuthManager/events/AuthUserListenerExtension';
import { createClient } from '@supabase/supabase-js';
import { AuthChangesSupabase } from '@common/features/AuthManager/store/AuthChangesSupabase';

export default defineBackground(() => {
  console.log('=== BACKGROUND SCRIPT STARTED ===');
  console.debug('Background script: Starting up');

  // Get Supabase credentials from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Background script: Supabase environment variables not configured');
    return;
  }

  // Create Supabase client
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  console.debug('Background script: Supabase client created');

  // Create AuthManager with extension-specific event emitters (no window dependencies)
  const authUserEventEmitter = new AuthUserEventEmitterExtension();
  const authEventEmitter = new AuthEventEmitterExtension();
  const authUserStore = new AuthUserStoreSupabase(supabaseClient, authUserEventEmitter);
  const authProfileStore = new AuthProfileStoreSupabase(supabaseClient);
  const authUserListener = new AuthUserListenerExtension(authUserEventEmitter);
  const authChanges = new AuthChangesSupabase(supabaseClient, authEventEmitter);

  const authManager = new AuthManager(authUserStore, authProfileStore, authEventEmitter, authUserListener, authChanges);
  console.debug('Background script: AuthManager initialized');

  // Create extension store for persisting session
  const extensionStore = new ExtensionStore();

  // Create event emitter to send messages back to popup/content
  const extensionEventEmitter = new ExtensionEventEmitter();

  // Helper function to save and emit current session
  const saveAndEmitSession = async (session: any) => {
    try {
      // Save session to storage
      await extensionStore.saveSession(session);
      console.debug('Background script: Session saved to storage');

      // Emit session to active listeners
      await extensionEventEmitter.emitSupabaseSession(session);
      console.debug('Background script: Session emitted to listeners:', session ? 'session exists' : 'no session');
    } catch (error) {
      console.error('Background script: Failed to save/emit session:', error);
    }
  };

  // Helper function to get, save, and emit current session
  const emitCurrentSession = async () => {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (error) {
        console.error('Background script: Error getting session:', error);
        return;
      }
      await saveAndEmitSession(session);
    } catch (error) {
      console.error('Background script: Failed to emit session:', error);
    }
  };

  // Listen for auth state changes and save/emit session updates
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log('Background script: Auth state changed:', event);
    console.debug('Background script: Saving and emitting session update');
    await saveAndEmitSession(session);
  });

  // Create event listener for extension messages
  const eventListener = new ExtensionEventListener({
    onSignInSubmit: async (email: string) => {
      console.log('=== SIGN IN MESSAGE ===', email);
      console.debug('Background script: Received sign-in submission with email:', email);

      try {
        await authManager.signInWithOtp(email);
        console.log('=== SIGN IN OTP SENT ===');
        console.debug('Background script: OTP sent successfully, emitting success event');
        await extensionEventEmitter.emitSignInWithOtpSuccess();
      } catch (error) {
        console.error('Background script: Failed to send OTP:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to send OTP';
        await extensionEventEmitter.emitSignInWithOtpFailure(errorMessage);
      }
    },
    onVerifyOtpSubmit: async (email: string, token: string) => {
      console.log('=== VERIFY OTP MESSAGE ===', email);
      console.debug('Background script: Received OTP verification with email:', email);

      try {
        await authManager.verifyOtp(email, token);
        console.log('=== OTP VERIFIED ===');
        console.debug('Background script: OTP verified successfully, marking extension installed');

        // Mark extension as installed after successful authentication
        const manifest = await browser.runtime.getManifest();
        const version = manifest.version;
        await authManager.markExtensionInstalled(version);
        console.debug('Background script: Extension marked as installed, emitting success event');

        await extensionEventEmitter.emitVerifyOtpSuccess();

        // Emit session after successful verification
        await emitCurrentSession();
      } catch (error) {
        console.error('Background script: Failed to verify OTP:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to verify OTP';
        await extensionEventEmitter.emitVerifyOtpFailure(errorMessage);
      }
    },
    onGetCurrentUser: () => {
      console.log('=== GET CURRENT USER REQUEST ===');
      const currentUser = authManager.getCurrentUser();
      console.debug('Background script: Returning current user:', currentUser);
      return currentUser;
    },
    onSignOut: async () => {
      console.log('=== SIGN OUT REQUEST ===');
      console.debug('Background script: Signing out user');

      try {
        await authManager.signOut();
        console.log('=== SIGN OUT SUCCESS ===');
        console.debug('Background script: User signed out successfully');
      } catch (error) {
        console.error('Background script: Failed to sign out:', error);
        throw error;
      }
    }
  });

  // Start listening for messages
  eventListener.startListening();

  console.log('=== LISTENER REGISTERED ===');
  console.debug('Background script: Listening for messages');
  console.debug('Background script: Build timestamp:', Date.now());
});
