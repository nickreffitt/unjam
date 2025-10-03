import { useState } from 'react';
import { useBillingAccountManager } from '../contexts/BillingAccountManagerContext';

/**
 * Hook to handle billing account actions
 * Provides functions to create account links with loading states
 */
export const useBillingAccountActions = () => {
  const { billingAccountManager, engineerProfile } = useBillingAccountManager();
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const createAccountLink = async (): Promise<string | null> => {
    try {
      setIsCreatingLink(true);
      setLinkError(null);

      console.info('[useBillingAccountActions] Creating account link for profile:', engineerProfile.id);
      const url = await billingAccountManager.createAccountLink(engineerProfile);
      console.info('[useBillingAccountActions] Successfully created account link');

      return url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account link';
      console.error('[useBillingAccountActions] Error creating account link:', errorMessage);
      setLinkError(errorMessage);
      return null;
    } finally {
      setIsCreatingLink(false);
    }
  };

  return {
    createAccountLink,
    isCreatingLink,
    linkError
  };
};
