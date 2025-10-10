import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { ExtensionStore } from '@common/features/ExtensionManager/store';

export interface SupabaseContextType {
  supabaseClient: SupabaseClient;
  supabaseUrl: string;
}

export const SupabaseContext = createContext<SupabaseContextType | null>(null);

interface SupabaseProviderProps {
  children: React.ReactNode;
}

/**
 * Provides a Supabase client to the extension React app
 * Manages session synchronization with ExtensionStore
 * Only renders children when session is ready and user is authenticated
 */
export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Create Supabase client and extension store once
  const { supabaseClient, supabaseUrl, extensionStore } = useMemo(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error('[SupabaseProvider] Supabase environment variables not configured');
    }

    console.debug('[SupabaseProvider] Creating Supabase client');
    const client = createClient(url, anonKey);
    const store = new ExtensionStore();

    return {
      supabaseClient: client,
      supabaseUrl: url,
      extensionStore: store
    };
  }, []);

  // Helper to set session in Supabase client and state
  const setSessionAndUpdateState = useCallback(async (newSession: Session | null) => {
    if (newSession) {
      console.debug('[SupabaseProvider] Setting session in Supabase client');
      try {
        await supabaseClient.auth.setSession({
          access_token: newSession.access_token,
          refresh_token: newSession.refresh_token
        });
        console.debug('[SupabaseProvider] Session set successfully');
        setSession(newSession);
        setIsReady(true);
      } catch (error) {
        console.error('[SupabaseProvider] Failed to set session:', error);
        setSession(null);
        setIsReady(true);
      }
    } else {
      console.debug('[SupabaseProvider] No session available');
      setSession(null);
      setIsReady(true);
    }
  }, [supabaseClient]);

  // Initialize: Load session from storage
  useEffect(() => {
    const initializeSession = async () => {
      console.debug('[SupabaseProvider] Initializing session from storage');
      const storedSession = await extensionStore.getSession();

      if (storedSession) {
        console.debug('[SupabaseProvider] Found stored session');
        await setSessionAndUpdateState(storedSession);
      } else {
        // Check if Supabase client already has a session
        const { data: { session: clientSession } } = await supabaseClient.auth.getSession();
        if (clientSession) {
          console.debug('[SupabaseProvider] Found session in client');
          setSession(clientSession);
        }
        setIsReady(true);
      }
    };

    initializeSession();
  }, [supabaseClient, extensionStore, setSessionAndUpdateState]);

  // Watch for session changes in storage
  useEffect(() => {
    console.debug('[SupabaseProvider] Setting up storage watcher');

    const unwatch = extensionStore.watchSession(async (newSession) => {
      console.debug('[SupabaseProvider] Session changed in storage');
      await setSessionAndUpdateState(newSession);
    });

    return () => {
      console.debug('[SupabaseProvider] Cleaning up storage watcher');
      unwatch();
    };
  }, [extensionStore, setSessionAndUpdateState]);

  const contextValue: SupabaseContextType = {
    supabaseClient,
    supabaseUrl
  };

  // Don't render children until we've checked for a session
  if (!isReady) {
    return null;
  }

  // Only render children if we have a valid session
  if (!session) {
    console.debug('[SupabaseProvider] No session, not rendering children');
    return null;
  }

  return (
    <SupabaseContext.Provider value={contextValue}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = (): SupabaseContextType => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};
