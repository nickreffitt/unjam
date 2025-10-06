import { useState, useEffect } from 'react';
import { useSubscriptionManager } from '../contexts/SubscriptionManagerContext';
import type { Subscription } from '@common/types';

/**
 * Hook to check for active subscription and fetch billing portal link
 * Returns subscription data, portal URL, loading state, and errors
 */
export const useSubscriptionState = () => {
  const { apiManager, subscriptionManager, userProfile } = useSubscriptionManager();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
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
          console.info('[useSubscriptionState] Active subscription found, fetching billing portal link and credit balance');
          const [url, balance] = await Promise.all([
            apiManager.createBillingPortalLink(userProfile.id),
            subscriptionManager.getCreditBalanceForProfile(userProfile.id)
          ]);
          setPortalUrl(url);
          setCreditBalance(balance);
          console.info('[useSubscriptionState] Successfully fetched portal link and credit balance');
        } else {
          console.info('[useSubscriptionState] No active subscription found');
          setPortalUrl(null);
          setCreditBalance(null);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load subscription state';
        console.error('[useSubscriptionState] Error:', errorMessage);
        setError(errorMessage);
        setSubscription(null);
        setPortalUrl(null);
        setCreditBalance(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptionState();
  }, [apiManager, subscriptionManager, userProfile.id]);

  return {
    subscription,
    portalUrl,
    creditBalance,
    isLoading,
    error,
    hasActiveSubscription: subscription !== null
  };
};
