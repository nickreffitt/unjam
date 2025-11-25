import { useState, useEffect, useRef } from 'react';
import { useBillingAccountManager } from '../contexts/BillingAccountManagerContext';
import { generateCodeVerifier, generateCodeChallenge } from '@dashboard/shared/utils/pkce';
import { init, createElement, type Payouts } from '@airwallex/components-sdk';

export interface UseAirwallexBeneficiaryFormResult {
  isInitializing: boolean;
  isReady: boolean;
  error: string | null;
  containerRef: React.RefObject<HTMLDivElement>;
  isSubmitting: boolean;
  submitError: string | null;
  successData: any | null;
  handleSubmit: () => Promise<void>;
}

/**
 * Hook to initialize and manage Airwallex embedded beneficiary form
 */
export function useAirwallexBeneficiaryForm(): UseAirwallexBeneficiaryFormResult {
  const {engineerProfile, billingAccountManager} = useBillingAccountManager();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<Payouts.BeneficiaryFormElement | null>(null);
  const codeVerifierRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeAirwallex = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        // Get environment variables
        const env = import.meta.env.VITE_AIRWALLEX_ENV || 'demo';
        const clientId = import.meta.env.VITE_AIRWALLEX_CLIENT_ID;

        if (!clientId) {
          throw new Error('Airwallex Client ID not configured');
        }

        // Generate PKCE pair
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        codeVerifierRef.current = codeVerifier;

        console.info('[useAirwallexBeneficiaryForm] Requesting authorization code');

        // Get authorization code from backend
        const authCode = await billingAccountManager.createBeneficiaryAuthCode(codeChallenge);

        console.info('[useAirwallexBeneficiaryForm] Received authorization code, initializing SDK');

        if (!isMounted) return;

        // Initialize Airwallex SDK
        await init({
          env,
          locale: 'en',
          authCode,
          clientId,
          codeVerifier,
        });

        console.info('[useAirwallexBeneficiaryForm] SDK initialized, creating element');

        const names = engineerProfile.name.split(' ')

        // Create beneficiary form element
        const element = await createElement('beneficiaryForm', {
          // Optional: Add default values or configuration
          defaultValues: {
            beneficiary: {
              first_name: names.length > 0 ? names[0] : undefined,
              last_name: names.length > 1 ? names[names.length - 1] : undefined,
              entity_type: "COMPANY",
              bank_details: {
                account_currency: "USD",
                bank_country_code: "US",
                local_clearing_system: "ACH",
              },
              additional_info: {
                personal_email: engineerProfile.email
              },
              address: {
                country_code: engineerProfile.country
              }
            },
            transfer_methods: ["LOCAL"],
          },
          customizations: {
            fields: {
              'beneficiary.bank_details.account_currency': {
                disabled: true,
              },
              'beneficiary.bank_details.bank_country_code': {
                disabled: true,
              },
              'beneficiary.bank_details.local_clearing_system': {
                hidden: true,
              },
              'beneficiary.address.country_code': {
                disabled: true
              },
              'beneficiary.additional_info.personal_email': {
                hidden: true,
              },
              'nickname': {
                hidden: true
              },
            }
          }
        });

        if (!element) {
          throw new Error('Failed to create beneficiary form element');
        }

        if (!isMounted) return;

        elementRef.current = element;

        // Listen to element events
        element.on('ready', () => {
          console.info('[useAirwallexBeneficiaryForm] Element ready');
          if (isMounted) {
            setIsReady(true);
            setIsInitializing(false);
          }
        });

        element.on('error', (event: any) => {
          console.error('[useAirwallexBeneficiaryForm] Element error:', event);
          if (isMounted) {
            setError(event.detail?.message || 'An error occurred with the beneficiary form');
          }
        });

        // Mount element to container
        if (containerRef.current) {
          element.mount(containerRef.current);
          console.info('[useAirwallexBeneficiaryForm] Element mounted');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Airwallex';
        console.error('[useAirwallexBeneficiaryForm] Initialization error:', errorMessage);
        if (isMounted) {
          setError(errorMessage);
          setIsInitializing(false);
        }
      }
    };

    initializeAirwallex();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (elementRef.current) {
        try {
          elementRef.current.unmount();
          elementRef.current.destroy();
        } catch (err) {
          console.error('[useAirwallexBeneficiaryForm] Cleanup error:', err);
        }
      }
    };
  }, [billingAccountManager]);

  const handleSubmit = async () => {
    if (!elementRef.current) {
      setSubmitError('Form not initialized');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      console.info('[useAirwallexBeneficiaryForm] Submitting form');

      // Submit the form and get the result
      const result = await elementRef.current.submit();

      // Check for form validation errors
      if (result.errors) {
        const errorMessage = result.errors.message || `Form validation failed: ${result.errors.code}`;
        console.error('[useAirwallexBeneficiaryForm] Form validation error:', result.errors);
        setSubmitError(errorMessage);
        return;
      }

      console.info('[useAirwallexBeneficiaryForm] Form submitted successfully, creating beneficiary');

      // Create the beneficiary via the backend
      const beneficiary = await billingAccountManager.createBeneficiary(result.values);

      console.info('[useAirwallexBeneficiaryForm] Beneficiary created successfully:', beneficiary);

      setSuccessData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit form';
      console.error('[useAirwallexBeneficiaryForm] Submit error:', errorMessage);
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isInitializing,
    isReady,
    error,
    containerRef,
    isSubmitting,
    submitError,
    successData,
    handleSubmit,
  };
}

