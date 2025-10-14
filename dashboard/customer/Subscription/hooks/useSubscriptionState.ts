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

        if (activeSubscription) {
          console.info('[useSubscriptionState] Active subscription found, fetching credit balance');
          const balance = await subscriptionManager.getCreditBalanceForProfile(userProfile.id);
          setCreditBalance(balance);
          console.info('[useSubscriptionState] Successfully fetched credit balance');
        } else {
          console.info('[useSubscriptionState] No active subscription found');
          setCreditBalance(null);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load subscription state';
        console.error('[useSubscriptionState] Error:', errorMessage);
        setError(errorMessage);
        setSubscription(null);
        setCreditBalance(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptionState();
  }, [subscriptionManager, userProfile.id]);

  return {
    subscription,
    creditBalance,
    isLoading,
    error,
    hasActiveSubscription: subscription !== null
  };
};
