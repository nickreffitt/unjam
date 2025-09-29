import React, { createContext, useContext, useMemo } from 'react';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import type { CustomerProfile } from '@common/types';


interface PricingTableManagerContextType {
  userProfile: CustomerProfile;
  stripeTableId: string;
  stripePublishableKey: string;
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
  if (!stripeTableId) { 
    throw new Error('No VITE_STRIPE_PUBLISHABLE_KEY set');
  }

  const contextValue: PricingTableManagerContextType = useMemo(() => ({
    userProfile,
    stripeTableId,
    stripePublishableKey
  }), [userProfile]);

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