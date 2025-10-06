import React, { createContext, useContext, useMemo } from 'react';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import { useSupabase } from '@dashboard/shared/contexts/SupabaseContext';
import { ApiManager } from '@common/features/ApiManager';
import { SubscriptionManager } from '@common/features/SubscriptionManager';
import { SubscriptionStoreSupabase } from '@common/features/SubscriptionManager/store/SubscriptionStoreSupabase';
import type { CustomerProfile } from '@common/types';


interface SubscriptionManagerContextType {
  userProfile: CustomerProfile;
  stripeTableId: string;
  stripePublishableKey: string;
  apiManager: ApiManager;
  subscriptionManager: SubscriptionManager;
}

const SubscriptionManagerContext = createContext<SubscriptionManagerContextType | null>(null);

interface SubscriptionManagerProviderProps {
  children: React.ReactNode;
}

export const SubscriptionManagerProvider: React.FC<SubscriptionManagerProviderProps> = ({ children }) => {
  const { authUser } = useAuthState();
  const { supabaseClient, supabaseUrl } = useSupabase();

  if (!authUser.profile) {
    throw new Error('No user profile available for subscription manager');
  }

  if (authUser.profile.type !== 'customer') {
    throw new Error('Subscription manager requires a customer profile');
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

  // Initialize ApiManager and SubscriptionManager using shared Supabase client
  const { apiManager, subscriptionManager } = useMemo(() => {
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1`;

    const apiManager = new ApiManager(supabaseClient, edgeFunctionUrl);
    const subscriptionStore = new SubscriptionStoreSupabase(supabaseClient);
    const subscriptionManager = new SubscriptionManager(subscriptionStore, apiManager);

    return { apiManager, subscriptionManager };
  }, [supabaseClient, supabaseUrl]);

  const contextValue: SubscriptionManagerContextType = useMemo(() => ({
    userProfile,
    stripeTableId,
    stripePublishableKey,
    apiManager,
    subscriptionManager
  }), [userProfile, stripeTableId, stripePublishableKey, apiManager, subscriptionManager]);

  return (
    <SubscriptionManagerContext.Provider value={contextValue}>
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