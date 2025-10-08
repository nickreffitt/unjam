import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { AuthManager } from '@common/features/AuthManager/AuthManager';
import {
  AuthEventEmitterLocal,
  AuthUserStoreSupabase,
  AuthUserStoreLocal,
  AuthUserEventEmitterLocal,
  AuthProfileStoreSupabase,
  AuthProfileStoreLocal,
  AuthUserListenerLocal
} from '@common/features/AuthManager';
import { useAuthListener } from '@common/features/AuthManager/hooks';
import { type AuthUser, type ErrorDisplay } from '@common/types';
import { useSupabase } from './SupabaseContext';
interface AuthManagerContextType {
  authManager: AuthManager | null;
  authUser: AuthUser;
  isLoading: boolean;
  error: ErrorDisplay | null;
}

const AuthManagerContext = createContext<AuthManagerContextType | null>(null);

interface AuthManagerProviderProps {
  children: React.ReactNode;
}

// Singleton AuthManager instance
let authManagerInstance: AuthManager | null = null;

/**
 * Provides AuthManager instance to dashboard components
 * Uses SupabaseContext for the Supabase client
 */
export const AuthManagerProvider: React.FC<AuthManagerProviderProps> = ({ children }) => {
  console.debug('[AuthManagerProvider] Component mounting/rendering');
  const { supabaseClient } = useSupabase();
  const [authUser, setAuthUser] = useState<AuthUser>({ status: 'loading' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorDisplay | null>(null);

  // Create AuthManager instance singleton
  const authManager = useMemo(() => {
    // Return existing instance if already created
    if (authManagerInstance) {
      console.debug('[AuthManagerProvider] Returning existing AuthManager singleton');
      return authManagerInstance;
    }

    console.debug('[AuthManagerProvider] Creating NEW AuthManager singleton');

    // Check if we should use local storage implementation (for testing/development)
    const useLocalAuth = import.meta.env.VITE_USE_LOCAL_AUTH === 'true';
    const authUserEventEmitter = new AuthUserEventEmitterLocal();
    const authEventEmitter = new AuthEventEmitterLocal();
    let authUserStore;
    let authProfileStore;

    if (useLocalAuth) {
      console.debug('[AuthManagerProvider] Using local storage implementations');
      authUserStore = new AuthUserStoreLocal(authUserEventEmitter);
      authProfileStore = new AuthProfileStoreLocal();
    } else {
      console.debug('[AuthManagerProvider] Using Supabase implementations');
      authUserStore = new AuthUserStoreSupabase(supabaseClient, authUserEventEmitter);
      authProfileStore = new AuthProfileStoreSupabase(supabaseClient);
    }

    const authUserListener = new AuthUserListenerLocal(authUserEventEmitter);

    // Create and store singleton
    authManagerInstance = new AuthManager(authUserStore, authProfileStore, authEventEmitter, authUserListener);

    console.debug('[AuthManagerProvider] AuthManager successfully initialized');
    return authManagerInstance;
  }, [supabaseClient]);

  // Memoize callbacks to prevent re-creating them on every render
  const authCallbacks = useMemo(() => ({
    onUserRequiresProfile: (authUserEvent: AuthUser) => {
      console.debug('[AuthManagerContext] onUserRequiresProfile received:', authUserEvent);
      setAuthUser(authUserEvent);
      setIsLoading(false);
      setError(null);
    },
    onUserProfileCreated: (authUserEvent: AuthUser) => {
      console.debug('[AuthManagerContext] onUserProfileCreated received:', authUserEvent);
      setAuthUser(authUserEvent);
      setIsLoading(false);
      setError(null);
    },
    onUserProfileUpdated: (authUserEvent: AuthUser) => {
      console.debug('[AuthManagerContext] onUserProfileUpdated received:', authUserEvent);
      setAuthUser(authUserEvent);
      setIsLoading(false);
      setError(null);
    },
    onUserSignedIn: (authUserEvent: AuthUser) => {
      console.debug('[AuthManagerContext] onUserSignedIn received:', authUserEvent);
      setAuthUser(authUserEvent);
      setIsLoading(false);
      setError(null);
    },
    onUserSignedOut: () => {
      console.debug('[AuthManagerContext] onUserSignedOut received');
      setAuthUser({ status: 'not-signed-in' });
      setIsLoading(false);
      setError(null);
    },
    onAuthStateChanged: (authUserEvent: AuthUser) => {
      console.debug('[AuthManagerContext] onAuthStateChanged received:', authUserEvent);
      setAuthUser(authUserEvent);
      setIsLoading(false);
    },
  }), []);

  // Listen to auth events
  useAuthListener(authCallbacks);

  // Initialize auth state
  useEffect(() => {
    if (!authManager) {
      setIsLoading(false);
      return;
    }

    // Get initial auth state - don't set isLoading to false yet
    // The auth listeners will handle setting isLoading to false when auth is determined
    const initialAuthUser = authManager.getCurrentAuthUser();
    console.debug('[AuthManagerProvider] Initial auth state from manager:', initialAuthUser);
    setAuthUser(initialAuthUser);

    // Only set loading to false if we already have a determined state
    if (initialAuthUser.status !== 'loading') {
      setIsLoading(false);
    }
  }, [authManager]);

  return (
    <AuthManagerContext.Provider value={{ authManager, authUser, isLoading, error }}>
      {children}
    </AuthManagerContext.Provider>
  );
};

export const useAuthManager = (): AuthManagerContextType => {
  const context = useContext(AuthManagerContext);
  if (!context) {
    throw new Error('useAuthManager must be used within an AuthManagerProvider');
  }
  return context;
};

// Hook that returns just the auth state
export const useAuthState = () => {
  const { authUser, isLoading, error } = useAuthManager();

  return {
    authUser,
    isAuthenticated: authUser.status === 'signed-in',
    isLoading,
    error,
  };
};