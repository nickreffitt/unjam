import { useState } from 'react';
import { useBillingManager } from '../contexts/BillingManagerContext';

/**
 * Hook to handle credit purchase actions
 * Provides methods to initiate product purchases
 */
export const useCreditsActions = () => {
  const { billingManager, userProfile } = useBillingManager();
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Initiates a product purchase by creating a checkout session and redirecting to Stripe
   * @param priceId - The Stripe price ID of the product to purchase
   */
  const purchaseProduct = async (priceId: string) => {
    try {
      setIsProcessing(true);
      console.info('[useCreditsActions] Creating checkout session for price:', priceId);

      const checkoutResponse = await billingManager.createProductCheckoutSession(
        userProfile.id,
        priceId
      );

      console.info('[useCreditsActions] Redirecting to checkout:', checkoutResponse.checkout_url);

      // Redirect to Stripe checkout
      window.location.href = checkoutResponse.checkout_url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate purchase';
      console.error('[useCreditsActions] Error:', errorMessage);
      alert(`Failed to start checkout: ${errorMessage}`);
      setIsProcessing(false);
    }
  };

  return {
    purchaseProduct,
    isProcessing
  };
};
