import { useState, useEffect } from 'react';
import { useSubscriptionManager } from '../contexts/SubscriptionManagerContext';
import type { Subscription } from '@common/types';

/**
 * Hook to check for active subscription and fetch credit balance
 * Returns subscription data, credit balance, loading state, and errors
 */
export const useSubscriptionState = () => {
  const { subscriptionManager, userProfile } = useSubscriptionManager();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [pendingCredits, setPendingCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscriptionState = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.info('[useSubscriptionState] Checking for active subscription for profile:', userProfile.id);
        const activeSubscription = await subscriptionManager.getActiveSubscriptionForProfile(userProfile.id);
        setSubscription(activeSubscription);

        // Always fetch credit balance regardless of subscription status
        // (credits can exist from one-time purchases without a subscription)
        console.info('[useSubscriptionState] Fetching credit balance');
        const balance = await subscriptionManager.getCreditBalanceForProfile(userProfile.id);
        setCreditBalance(balance.creditBalance);
        setPendingCredits(balance.pendingCredits);
        console.info('[useSubscriptionState] Successfully fetched credit balance:', balance.creditBalance);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load subscription state';
        console.error('[useSubscriptionState] Error:', errorMessage);
        setError(errorMessage);
        setSubscription(null);
        setCreditBalance(null);
        setPendingCredits(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptionState();
  }, [subscriptionManager, userProfile.id]);

  return {
    subscription,
    creditBalance,
    pendingCredits,
    isLoading,
    error,
    hasActiveSubscription: subscription !== null
  };
};
