import { useEffect, useRef } from 'react';
import { BillingAccountListener, type BillingAccountListenerCallbacks } from '@common/features/BillingAccountManager/events';

/**
 * Hook that listens to global billing account events via window events
 * This hook uses the BillingAccountListener class to manage window event subscriptions
 *
 * @param callbacks - Partial listener implementation with only the events you care about
 *
 * @example
 * ```tsx
 * useBillingAccountListener({
 *   onBillingAccountCreated: (account) => {
 *     console.log('New billing account:', account);
 *     refreshState();
 *   },
 *   onBillingAccountUpdated: (account) => {
 *     console.log('Billing account updated:', account);
 *     refreshState();
 *   }
 * });
 * ```
 */
export function useBillingAccountListener(callbacks: Partial<BillingAccountListenerCallbacks>): void {
  // Create a BillingAccountListener instance and keep it stable across re-renders
  const billingAccountListenerRef = useRef<BillingAccountListener | null>(null);

  // Update callbacks when they change
  useEffect(() => {
    if (billingAccountListenerRef.current) {
      try {
        billingAccountListenerRef.current.updateCallbacks(callbacks);
      } catch (error) {
        console.warn('Error updating billing account listener callbacks:', error);
      }
    }
  }, [callbacks]);

  // Initialize listener once on mount and cleanup on unmount
  useEffect(() => {
    try {
      // Create the listener on first render
      billingAccountListenerRef.current = new BillingAccountListener(callbacks);
      if (billingAccountListenerRef.current && typeof billingAccountListenerRef.current.startListening === 'function') {
        billingAccountListenerRef.current.startListening();
      }
    } catch (error) {
      console.error('Error creating billing account listener:', error);
      throw error; // Re-throw to let test framework catch it
    }

    // Cleanup on unmount
    return () => {
      if (billingAccountListenerRef.current) {
        try {
          billingAccountListenerRef.current.stopListening();
        } catch (error) {
          console.warn('Error stopping billing account listener:', error);
        }
        billingAccountListenerRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount
}
