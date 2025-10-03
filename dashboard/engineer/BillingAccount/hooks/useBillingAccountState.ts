import { useState, useEffect } from 'react';
import { useBillingAccountManager } from '../contexts/BillingAccountManagerContext';

/**
 * Hook to check for billing account and fetch account link
 * Returns account link URL, loading state, and errors
 */
export const useBillingAccountState = () => {
  const { apiManager, userProfile } = useBillingAccountManager();
  const [accountLinkUrl, setAccountLinkUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBillingAccountState = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.info('[useBillingAccountState] Fetching billing portal link for profile:', userProfile.id);
        const url = await apiManager.createBillingPortalLink(userProfile.id);
        setAccountLinkUrl(url);
        console.info('[useBillingAccountState] Successfully fetched billing portal link');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load billing account state';
        console.error('[useBillingAccountState] Error:', errorMessage);
        setError(errorMessage);
        setAccountLinkUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillingAccountState();
  }, [apiManager, userProfile.id]);

  return {
    accountLinkUrl,
    isLoading,
    error
  };
};
