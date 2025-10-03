import React, { createContext, useContext, useMemo } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface SupabaseContextType {
  supabaseClient: SupabaseClient;
  supabaseUrl: string;
}

const SupabaseContext = createContext<SupabaseContextType | null>(null);

interface SupabaseProviderProps {
  children: React.ReactNode;
}

// Singleton Supabase client instance
let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Provides a singleton Supabase client instance to the application
 * This ensures only one Supabase client is created across the entire app
 */
export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
  const contextValue = useMemo(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not configured');
    }

    // Create singleton instance if it doesn't exist
    if (!supabaseClientInstance) {
      console.debug('[SupabaseProvider] Creating NEW Supabase client singleton');
      supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey);
    } else {
      console.debug('[SupabaseProvider] Reusing existing Supabase client singleton');
    }

    return {
      supabaseClient: supabaseClientInstance,
      supabaseUrl
    };
  }, []);

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
