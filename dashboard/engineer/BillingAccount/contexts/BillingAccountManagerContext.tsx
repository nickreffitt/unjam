import React, { createContext, useContext, useMemo, useEffect, useRef } from 'react';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import { useSupabase } from '@dashboard/shared/contexts/SupabaseContext';
import { ApiManager } from '@common/features/ApiManager';
import { BillingAccountManager, BillingAccountStoreSupabase } from '@common/features/BillingAccountManager';
import type { EngineerProfile } from '@common/types';


interface BillingAccountManagerContextType {
  engineerProfile: EngineerProfile;
  billingAccountManager: BillingAccountManager;
}

const BillingAccountManagerContext = createContext<BillingAccountManagerContextType | null>(null);

interface BillingAccountManagerProviderProps {
  children: React.ReactNode;
}

export const BillingAccountManagerProvider: React.FC<BillingAccountManagerProviderProps> = ({ children }) => {
  const { authUser } = useAuthState();
  const { supabaseClient, supabaseUrl } = useSupabase();
  const billingAccountStoreRef = useRef<BillingAccountStoreSupabase | null>(null);

  if (!authUser.profile) {
    throw new Error('No user profile available for billing account manager');
  }

  if (authUser.profile.type !== 'engineer') {
    throw new Error('Billing account manager requires an engineer profile');
  }

  const engineerProfile = authUser.profile as EngineerProfile;

  // Initialize BillingAccountManager with dependencies
  // Only recreate if profile ID changes (not on every profile update)
  const billingAccountManager = useMemo(() => {
    const billingAccountStore = new BillingAccountStoreSupabase(supabaseClient);
    billingAccountStoreRef.current = billingAccountStore;
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1`;
    const apiManager = new ApiManager(supabaseClient, edgeFunctionUrl);
    return new BillingAccountManager(billingAccountStore, apiManager, engineerProfile);
  }, [engineerProfile.id, supabaseClient, supabaseUrl]);

  // Start listening to Postgres changes on mount, stop on unmount
  useEffect(() => {
    if (billingAccountStoreRef.current) {
      billingAccountStoreRef.current.startListening();
    }

    return () => {
      if (billingAccountStoreRef.current) {
        billingAccountStoreRef.current.stopListening();
      }
    };
  }, []);

  const contextValue: BillingAccountManagerContextType = useMemo(() => ({
    engineerProfile,
    billingAccountManager
  }), [engineerProfile.id, billingAccountManager]);

  return (
    <BillingAccountManagerContext.Provider value={contextValue}>
      {children}
    </BillingAccountManagerContext.Provider>
  );
};

export const useBillingAccountManager = (): BillingAccountManagerContextType => {
  const context = useContext(BillingAccountManagerContext);
  if (!context) {
    throw new Error('useBillingAccountManager must be used within a BillingAccountManagerProvider');
  }
  return context;
};
