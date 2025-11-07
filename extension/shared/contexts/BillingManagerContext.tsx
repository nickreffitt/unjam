import React, { createContext, useContext, useMemo } from 'react';
import { BillingManager } from '@common/features/BillingManager';
import { ApiManager } from '@common/features/ApiManager/ApiManager';
import { useSupabase } from '@extension/shared/contexts/SupabaseContext';

interface BillingManagerContextType {
  billingManager: BillingManager;
}

const BillingManagerContext = createContext<BillingManagerContextType | null>(null);

interface BillingManagerProviderProps {
  children: React.ReactNode;
}

export const BillingManagerProvider: React.FC<BillingManagerProviderProps> = ({ children }) => {
  const { supabaseClient, supabaseUrl } = useSupabase();

  const billingManager = useMemo(() => {
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1`;
    const apiManager = new ApiManager(supabaseClient, edgeFunctionUrl);
    return new BillingManager(apiManager);
  }, [supabaseClient, supabaseUrl]);

  return (
    <BillingManagerContext.Provider value={{ billingManager }}>
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
