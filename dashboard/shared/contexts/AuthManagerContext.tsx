import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
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

  try {
    // Check if we should use local storage implementation (for testing/development)
    const useLocalAuth = import.meta.env.VITE_USE_LOCAL_AUTH === 'true';
    const authUserEventEmitter = new AuthUserEventEmitterLocal();
    const authEventEmitter = new AuthEventEmitterLocal();
    let authUserStore;
    let authProfileStore;

    if (useLocalAuth) {
      // Use local storage implementations
      console.debug('AuthManager: Using local storage implementations');
      authUserStore = new AuthUserStoreLocal(authUserEventEmitter);
      authProfileStore = new AuthProfileStoreLocal();
    } else {
      console.debug('AuthManager: Using supabase implementations');
      // Use Supabase implementations
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        initializationError = 'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not configured';
        console.warn('AuthManager:', initializationError);
        return {
          authManager: null,
          error: initializationError,
        };
      }

      console.debug('AuthManager: Using Supabase implementations');
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      authUserStore = new AuthUserStoreSupabase(supabaseClient, authUserEventEmitter);
      authProfileStore = new AuthProfileStoreSupabase(supabaseClient);
    }

    const authUserListener = new AuthUserListenerLocal(authUserEventEmitter);

    // Create AuthManager instance (singleton)
    authManagerInstance = new AuthManager(authUserStore, authProfileStore, authEventEmitter, authUserListener);

    console.debug('AuthManager: Successfully initialized');

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
    isAuthenticated: authUser.status === 'signed-in',
    isLoading,
    error,
  };
};