import React, { createContext, useContext } from 'react';
import { useBillingAccountManager } from '@dashboard/engineer/BillingAccount/contexts/BillingAccountManagerContext';
import type { BillingAccountManager } from '@common/features/BillingAccountManager';
import type { EngineerProfile } from '@common/types';


interface BillingRecipientFormContextType {
  engineerProfile: EngineerProfile;
  billingAccountManager: BillingAccountManager;
}

const BillingRecipientFormContext = createContext<BillingRecipientFormContextType | null>(null);

interface BillingRecipientFormProviderProps {
  children: React.ReactNode;
}

export const BillingRecipientFormProvider: React.FC<BillingRecipientFormProviderProps> = ({ children }) => {
  // Use the BillingAccountManager from the parent context
  const { engineerProfile, billingAccountManager } = useBillingAccountManager();

  return (
    <BillingRecipientFormContext.Provider value={{ engineerProfile, billingAccountManager }}>
      {children}
    </BillingRecipientFormContext.Provider>
  );
};

export const useBillingRecipientForm = (): BillingRecipientFormContextType => {
  const context = useContext(BillingRecipientFormContext);
  if (!context) {
    throw new Error('useBillingRecipientForm must be used within a BillingRecipientFormProvider');
  }
  return context;
};
