import { useState, useEffect } from 'react';
import { useBillingManager } from '../contexts/BillingManagerContext';
import type { ProductInfo } from '@common/types';

/**
 * Hook to fetch available credit products and credit balance
 * Returns products, credit balance, loading state, and errors
 */
export const useCreditsState = () => {
  const { billingManager, userProfile } = useBillingManager();
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [pendingCredits, setPendingCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCreditsState = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.info('[useCreditsState] Fetching products and credit balance for profile:', userProfile.id);

        // Fetch products and credit balance in parallel
        const [productsResponse, balanceResponse] = await Promise.all([
          billingManager.fetchProducts(),
          billingManager.getCreditBalanceForProfile(userProfile.id)
        ]);

        setProducts(productsResponse.products);
        setCreditBalance(balanceResponse.creditBalance);
        setPendingCredits(balanceResponse.pendingCredits);

        console.info('[useCreditsState] Successfully fetched products and credit balance');
        console.info('[useCreditsState] Products:', productsResponse.products.map(p => ({
          name: p.name,
          price: p.price,
          isMostPopular: p.isMostPopular
        })));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load credit products';
        console.error('[useCreditsState] Error:', errorMessage);
        setError(errorMessage);
        setProducts([]);
        setCreditBalance(null);
        setPendingCredits(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreditsState();
  }, [billingManager, userProfile.id]);

  return {
    products,
    creditBalance,
    pendingCredits,
    isLoading,
    error
  };
};
