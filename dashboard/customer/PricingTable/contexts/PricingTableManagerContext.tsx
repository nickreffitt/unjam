import React, { createContext, useContext, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import { ApiManager } from '@common/features/ApiManager';
import type { CustomerProfile } from '@common/types';


interface PricingTableManagerContextType {
  userProfile: CustomerProfile;
  stripeTableId: string;
  stripePublishableKey: string;
  apiManager: ApiManager;
}

const PricingTableManagerContext = createContext<PricingTableManagerContextType | null>(null);

interface PricingTableManagerProviderProps {
  children: React.ReactNode;
}

export const PricingTableManagerProvider: React.FC<PricingTableManagerProviderProps> = ({ children }) => {
  const { authUser } = useAuthState();

  if (!authUser.profile) {
    throw new Error('No user profile available for pricing table manager');
  }

  if (authUser.profile.type !== 'customer') {
    throw new Error('Pricing table manager requires a customer profile');
  }

  const userProfile = authUser.profile as CustomerProfile;

  const stripeTableId = import.meta.env.VITE_STRIPE_TABLE_ID;
  if (!stripeTableId) {
    throw new Error('No VITE_STRIPE_TABLE_ID set');
  }

  const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!stripePublishableKey) {
    throw new Error('No VITE_STRIPE_PUBLISHABLE_KEY set');
  }

  // Initialize Supabase client and ApiManager
  const apiManager = useMemo(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables not configured');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1`;

    return new ApiManager(supabaseClient, edgeFunctionUrl);
  }, []);

  const contextValue: PricingTableManagerContextType = useMemo(() => ({
    userProfile,
    stripeTableId,
    stripePublishableKey,
    apiManager
  }), [userProfile, stripeTableId, stripePublishableKey, apiManager]);

  return (
    <PricingTableManagerContext.Provider value={contextValue}>
      {children}
    </PricingTableManagerContext.Provider>
  );
};

export const usePricingTableManager = (): PricingTableManagerContextType => {
  const context = useContext(PricingTableManagerContext);
  if (!context) {
    throw new Error('usePricingTableManager must be used within a PricingTableManagerProvider');
  }
  return context;
};