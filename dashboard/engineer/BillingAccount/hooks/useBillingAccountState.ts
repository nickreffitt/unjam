import { useState, useEffect } from 'react';
import { useBillingAccountManager } from '../contexts/BillingAccountManagerContext';
import type { EngineerAccount } from '@common/types';

/**
 * Hook to fetch engineer billing account status
 * Returns account data, loading state, and errors
 */
export const useBillingAccountState = () => {
  const { billingAccountManager, engineerProfile } = useBillingAccountManager();
  const [account, setAccount] = useState<EngineerAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBillingAccount = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.info('[useBillingAccountState] Fetching billing account for profile:', engineerProfile.id);
        const billingAccount = await billingAccountManager.getAccountByProfileId(engineerProfile.id);
        setAccount(billingAccount);
        console.info('[useBillingAccountState] Successfully fetched billing account:', billingAccount ? 'exists' : 'does not exist');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load billing account';
        console.error('[useBillingAccountState] Error:', errorMessage);
        setError(errorMessage);
        setAccount(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillingAccount();
  }, [billingAccountManager, engineerProfile.id]);

  return {
    account,
    isLoading,
    error
  };
};
