import React, { createContext, useContext, useMemo } from 'react';
import { SubscriptionManager } from '@common/features/SubscriptionManager';
import { SubscriptionStoreSupabase } from '@common/features/SubscriptionManager/store';
import { ApiManager } from '@common/features/ApiManager/ApiManager';
import { useSupabase } from '@extension/shared/contexts/SupabaseContext';

interface SubscriptionManagerContextType {
  subscriptionManager: SubscriptionManager;
}

const SubscriptionManagerContext = createContext<SubscriptionManagerContextType | null>(null);

interface SubscriptionManagerProviderProps {
  children: React.ReactNode;
}

export const SubscriptionManagerProvider: React.FC<SubscriptionManagerProviderProps> = ({ children }) => {
  const { supabaseClient, supabaseUrl } = useSupabase();

  const subscriptionManager = useMemo(() => {
    const subscriptionStore = new SubscriptionStoreSupabase(supabaseClient);
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1`;
    const apiManager = new ApiManager(supabaseClient, edgeFunctionUrl);
    return new SubscriptionManager(subscriptionStore, apiManager);
  }, [supabaseClient, supabaseUrl]);

  return (
    <SubscriptionManagerContext.Provider value={{ subscriptionManager }}>
      {children}
    </SubscriptionManagerContext.Provider>
  );
};

export const useSubscriptionManager = (): SubscriptionManagerContextType => {
  const context = useContext(SubscriptionManagerContext);
  if (!context) {
    throw new Error('useSubscriptionManager must be used within a SubscriptionManagerProvider');
  }
  return context;
};
