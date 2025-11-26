import React, { createContext, useContext, useMemo } from 'react';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import { useSupabase } from '@dashboard/shared/contexts/SupabaseContext';
import { ApiManager } from '@common/features/ApiManager';
import { BillingManager } from '@common/features/BillingManager';
import type { CustomerProfile } from '@common/types';

interface BillingManagerContextType {
  userProfile: CustomerProfile;
  apiManager: ApiManager;
  billingManager: BillingManager;
}

const BillingManagerContext = createContext<BillingManagerContextType | null>(null);

interface BillingManagerProviderProps {
  children: React.ReactNode;
}

export const BillingManagerProvider: React.FC<BillingManagerProviderProps> = ({ children }) => {
  const { authUser } = useAuthState();
  const { supabaseClient, supabaseUrl } = useSupabase();

  if (!authUser.profile) {
    throw new Error('No user profile available for billing manager');
  }

  if (authUser.profile.type !== 'customer') {
    throw new Error('Billing manager requires a customer profile');
  }

  const userProfile = authUser.profile as CustomerProfile;

  // Initialize ApiManager and BillingManager using shared Supabase client
  const { apiManager, billingManager } = useMemo(() => {
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1`;

    const apiManager = new ApiManager(supabaseClient, edgeFunctionUrl);
    const billingManager = new BillingManager(apiManager);

    return { apiManager, billingManager };
  }, [supabaseClient, supabaseUrl]);

  const contextValue: BillingManagerContextType = useMemo(() => ({
    userProfile,
    apiManager,
    billingManager
  }), [userProfile, apiManager, billingManager]);

  return (
    <BillingManagerContext.Provider value={contextValue}>
      {children}
    </BillingManagerContext.Provider>
  );
};

export const useBillingManager = (): BillingManagerContextType => {
  const context = useContext(BillingManagerContext);
  if (!context) {
    throw new Error('useBillingManager must be used within a BillingManagerProvider');
  }
  return context;
};
