import { useState, useEffect } from 'react';
import { useSubscriptionManager } from '@dashboard/customer/Subscription/contexts/SubscriptionManagerContext';

/**
 * Hook to fetch credit balance for the current user
 * Returns credit balance, pending credits, loading state, and errors
 */
export const useCreditBalanceState = () => {
  const { subscriptionManager, userProfile } = useSubscriptionManager();
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [pendingCredits, setPendingCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCreditBalance = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.info('[useCreditBalanceState] Fetching credit balance for profile:', userProfile.id);
        const balance = await subscriptionManager.getCreditBalanceForProfile(userProfile.id);
        setCreditBalance(balance.creditBalance);
        setPendingCredits(balance.pendingCredits);
        console.info('[useCreditBalanceState] Successfully fetched credit balance:', balance.creditBalance);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load credit balance';
        console.error('[useCreditBalanceState] Error:', errorMessage);
        setError(errorMessage);
        setCreditBalance(null);
        setPendingCredits(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreditBalance();
  }, [subscriptionManager, userProfile.id]);

  return {
    creditBalance,
    pendingCredits,
    isLoading,
    error
  };
};
