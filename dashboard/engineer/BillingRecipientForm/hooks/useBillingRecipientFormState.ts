import { useState, useEffect } from 'react';
import { useBillingRecipientForm } from '../contexts/BillingRecipientFormContext';
import type { WiseRecipientFormData, WiseAccountRequirements } from '@common/types';

/**
 * Hook to fetch Wise recipient form requirements
 * Returns form data, loading state, and errors
 */
export const useBillingRecipientFormState = () => {
  const { billingAccountManager, engineerProfile } = useBillingRecipientForm();
  const [formData, setFormData] = useState<WiseRecipientFormData | null>(null);
  const [currency, setCurrency] = useState<string>('USD');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load form requirements on mount
  useEffect(() => {
    const fetchFormRequirements = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // For MVP, use engineer's country and a default currency/amount
        // Future: Allow engineer to configure these
        const targetCountry = engineerProfile.country || 'GB'; // Default to GB if no country
        const targetCurrency = 'USD'; // Default to USD for now
        const sourceAmount = 100; // Default amount for quote

        console.info('[useBillingRecipientFormState] Fetching form requirements:', {
          targetCountry,
          targetCurrency,
          sourceAmount
        });

        const data = await billingAccountManager.createRecipientForm(
          targetCurrency,
          targetCountry,
          sourceAmount
        );

        setFormData(data);
        setCurrency(targetCurrency);
        console.info('[useBillingRecipientFormState] Successfully fetched form requirements');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load recipient form';
        console.error('[useBillingRecipientFormState] Error:', errorMessage);
        setError(errorMessage);
        setFormData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFormRequirements();
  }, [billingAccountManager, engineerProfile.country]);

  return {
    formData,
    quoteId: formData?.quoteId || null,
    requirements: formData?.requirements || null,
    currency,
    isLoading,
    error
  };
};
