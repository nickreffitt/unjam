import React, { createContext, useContext, useMemo } from 'react';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import { useSupabase } from '@dashboard/shared/contexts/SupabaseContext';
import { ApiManager } from '@common/features/ApiManager';
import type { EngineerProfile } from '@common/types';


interface BillingAccountManagerContextType {
  userProfile: EngineerProfile;
  apiManager: ApiManager;
}

const BillingAccountManagerContext = createContext<BillingAccountManagerContextType | null>(null);

interface BillingAccountManagerProviderProps {
  children: React.ReactNode;
}

export const BillingAccountManagerProvider: React.FC<BillingAccountManagerProviderProps> = ({ children }) => {
  const { authUser } = useAuthState();
  const { supabaseClient, supabaseUrl } = useSupabase();

  if (!authUser.profile) {
    throw new Error('No user profile available for billing account manager');
  }

  if (authUser.profile.type !== 'engineer') {
    throw new Error('Billing account manager requires an engineer profile');
  }

  const userProfile = authUser.profile as EngineerProfile;

  // Initialize ApiManager using shared Supabase client
  const apiManager = useMemo(() => {
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1`;
    return new ApiManager(supabaseClient, edgeFunctionUrl);
  }, [supabaseClient, supabaseUrl]);

  const contextValue: BillingAccountManagerContextType = useMemo(() => ({
    userProfile,
    apiManager
  }), [userProfile, apiManager]);

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
