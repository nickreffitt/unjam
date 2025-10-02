import { useState, useEffect } from 'react';
import { usePricingTableManager } from '../contexts/PricingTableManagerContext';

/**
 * Hook to fetch billing portal link when component loads
 * Returns the portal URL if available, or null if not yet loaded or on error
 */
export const useBillingPortalLink = () => {
  const { apiManager, userProfile } = usePricingTableManager();
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortalLink = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.info('[useBillingPortalLink] Fetching billing portal link for profile:', userProfile.id);
        const url = await apiManager.createBillingPortalLink(userProfile.id);

        setPortalUrl(url);
        console.info('[useBillingPortalLink] Successfully fetched portal link');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load billing portal';
        console.error('[useBillingPortalLink] Error fetching portal link:', errorMessage);
        setError(errorMessage);
        setPortalUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortalLink();
  }, [apiManager, userProfile.id]);

  return { portalUrl, isLoading, error };
};
