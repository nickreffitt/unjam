import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBillingAccountManager } from '../contexts/BillingAccountManagerContext';
import { useBillingAccountListener } from '@common/features/BillingAccountManager/hooks';
import type { EngineerAccount } from '@common/types';

/**
 * Hook to fetch engineer billing account status
 * Returns account data, loading state, and errors
 * Listens for real-time updates to billing account
 */
export const useBillingAccountState = () => {
  const { billingAccountManager } = useBillingAccountManager();
  const [engineerAccount, setEngineerAccount] = useState<EngineerAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load account on mount
  useEffect(() => {
    const fetchBillingAccount = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const billingAccount = await billingAccountManager.getAccount();
        setEngineerAccount(billingAccount);
        console.info('[useBillingAccountState] Successfully fetched billing account:', billingAccount ? 'exists' : 'does not exist');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load billing account';
        console.error('[useBillingAccountState] Error:', errorMessage);
        setError(errorMessage);
        setEngineerAccount(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillingAccount();
  }, [billingAccountManager]);

  // Create stable callback functions to prevent listener recreation
  const handleBillingAccountCreated = useCallback((account: EngineerAccount) => {
    console.debug('[useBillingAccountState] Billing account created for profile', account.engineerId);
    // Only update if it's for this profile
    if (engineerAccount && engineerAccount.engineerId === account.engineerId) {
      setEngineerAccount(account);
    }
  }, [engineerAccount]); // Empty dependency array - stable callback

  const handleBillingAccountUpdated = useCallback((account: EngineerAccount) => {
    console.debug('[useBillingAccountState] Billing account updated for profile', account.engineerId);
    // Only update if it's for this profile
    if (engineerAccount && engineerAccount.engineerId === account.engineerId) {
      setEngineerAccount(account);
    }
  }, [engineerAccount]); // Empty dependency array - stable callback

  // Memoize the callbacks object to prevent listener recreation
  const billingAccountListenerCallbacks = useMemo(() => ({
    onBillingAccountCreated: handleBillingAccountCreated,
    onBillingAccountUpdated: handleBillingAccountUpdated
  }), [handleBillingAccountCreated, handleBillingAccountUpdated]); // Empty dependency array - callbacks are stable with refs

  // Listen for real-time billing account events with stable callbacks
  useBillingAccountListener(billingAccountListenerCallbacks);

  return {
    engineerAccount,
    isLoading,
    error
  };
};
