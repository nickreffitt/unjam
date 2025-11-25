import { useState, useEffect, useCallback } from 'react';
import { useBillingAccountManager } from '../contexts/BillingAccountManagerContext';
import type { BankTransferRecipient } from '@common/types';

/**
 * Hook to fetch engineer bank transfer account status
 * Returns bank transfer account data, loading state, and errors
 */
export const useBillingBankTransferAccountState = () => {
  const { billingAccountManager } = useBillingAccountManager();
  const [bankTransferAccount, setBankTransferAccount] = useState<BankTransferRecipient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBankTransferAccount = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const account = await billingAccountManager.getBankTransferAccount();
      setBankTransferAccount(account);
      console.info('[useBillingBankTransferAccountState] Successfully fetched bank transfer account:', account ? 'exists' : 'does not exist');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load bank transfer account';
      console.error('[useBillingBankTransferAccountState] Error:', errorMessage);
      setError(errorMessage);
      setBankTransferAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, [billingAccountManager]);

  // Load bank transfer account on mount
  useEffect(() => {
    fetchBankTransferAccount();
  }, [fetchBankTransferAccount]);

  // Check if bank transfer account is verified and active
  const isBillingBankTransferAccountVerified = useCallback(() => {
    if (!bankTransferAccount) return false;
    return bankTransferAccount.active === true;
  }, [bankTransferAccount]);

  return {
    bankTransferAccount,
    isLoading,
    error,
    isBillingBankTransferAccountVerified,
    refreshBankTransferAccount: fetchBankTransferAccount
  };
};
