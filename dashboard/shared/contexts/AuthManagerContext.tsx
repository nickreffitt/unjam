import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AuthManager } from '@common/features/AuthManager/AuthManager';
import { AuthEventEmitterLocal, AuthUserStoreSupabase, AuthUserEventEmitterLocal, AuthProfileStoreSupabase } from '@common/features/AuthManager';
import { useAuthListener } from '@common/features/AuthManager/hooks';
import { type AuthUser, type ErrorDisplay } from '@common/types';

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

// Singleton instances to prevent multiple Supabase clients
let authManagerInstance: AuthManager | null = null;
let initializationError: string | null = null;

const initializeAuthManager = (): { authManager: AuthManager | null; error?: string } => {
  // Return existing instance if already created
  if (authManagerInstance) {
    return { authManager: authManagerInstance };
  }

  // Return previous error if initialization failed before
  if (initializationError) {
    return { authManager: null, error: initializationError };
  }

  // Check if Supabase environment variables are configured
  const supabaseUrl = (import.meta as { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL;
  const supabaseAnonKey = (import.meta as { env?: { VITE_SUPABASE_ANON_KEY?: string } }).env?.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    initializationError = 'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not configured';
    console.warn('AuthManager:', initializationError);
    return {
      authManager: null,
      error: initializationError,
    };
  }

  try {
    // Create Supabase client (singleton)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const authUserEventEmitter = new AuthUserEventEmitterLocal();
    const authUserStore = new AuthUserStoreSupabase(supabaseClient, authUserEventEmitter);
    const authProfileStore = new AuthProfileStoreSupabase(supabaseClient);

    const authEventEmitter = new AuthEventEmitterLocal();

    // Create AuthManager instance (singleton)
    authManagerInstance = new AuthManager(authUserStore, authProfileStore, authEventEmitter);

    console.debug('AuthManager: Successfully initialized with Supabase');

    return {
      authManager: authManagerInstance
    };
  } catch (error) {
    initializationError = error instanceof Error ? error.message : 'Failed to initialize AuthManager';
    console.error('AuthManager: Failed to initialize:', error);
    return {
      authManager: null,
      error: initializationError,
    };
  }
};

/**
 * Provides AuthManager instance to dashboard components
 * Handles Supabase configuration and initialization
 * Uses singleton pattern to prevent multiple Supabase client instances
 */
export const AuthManagerProvider: React.FC<AuthManagerProviderProps> = ({ children }) => {
  const [authUser, setAuthUser] = useState<AuthUser>({ status: 'not-signed-in' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorDisplay | null>(null);

  // Create AuthManager instance
  const authManager = useMemo(() => {
    const { authManager: manager, error: initError } = initializeAuthManager();

    if (initError) {
      setError({
        title: 'Configuration Error',
        message: initError,
      });
      setIsLoading(false);
    }

    return manager;
  }, []);

  // Listen to auth events
  useAuthListener({
    onUserRequiresProfile: (authUserEvent: AuthUser) => {
      setAuthUser(authUserEvent);
      setIsLoading(false);
      setError(null);
    },
    onUserProfileCreated: (authUserEvent: AuthUser) => {
      setAuthUser(authUserEvent);
      setIsLoading(false);
      setError(null);
    },
    onUserSignedIn: (authUserEvent: AuthUser) => {
      setAuthUser(authUserEvent);
      setIsLoading(false);
      setError(null);
    },
    onUserSignedOut: () => {
      setAuthUser({ status: 'not-signed-in' });
      setIsLoading(false);
      setError(null);
    },
    onAuthStateChanged: (authUserEvent: AuthUser) => {
      setAuthUser(authUserEvent);
      setIsLoading(false);
    },
  });

  // Initialize auth state
  useEffect(() => {
    if (!authManager) {
      setIsLoading(false);
      return;
    }

    // Get initial auth state
    const initialAuthUser = authManager.getCurrentAuthUser();
    setAuthUser(initialAuthUser);
    setIsLoading(false);
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
    currentUser: authUser.user || null,
    currentProfile: authUser.profile || null,
    isAuthenticated: authUser.status === 'signed-in',
    isLoading,
    error,
  };
};

// Re-export useAuthState as useUserProfile for backward compatibility
export const useUserProfile = useAuthState;