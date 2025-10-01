import { useEffect, useRef } from 'react';
import { type SubscriptionListener, SubscriptionListenerLocal, type SubscriptionListenerCallbacks } from '@common/features/SubscriptionManager/events';

/**
 * Hook that listens to global subscription events via window events
 * This hook uses the SubscriptionListener class to manage window event subscriptions
 *
 * @param callbacks - Partial listener implementation with only the events you care about
 *
 * @example
 * ```tsx
 * useSubscriptionListener({
 *   onSubscriptionCreated: (subscription) => {
 *     console.log('New subscription created:', subscription);
 *     refetchSubscriptions();
 *   },
 *   onSubscriptionUpdated: (subscription) => {
 *     console.log('Subscription updated:', subscription);
 *     updateSubscriptionStatus();
 *   }
 * });
 * ```
 */
export function useSubscriptionListener(callbacks: Partial<SubscriptionListenerCallbacks>): void {
  // Create a SubscriptionListener instance and keep it stable across re-renders
  const subscriptionListenerRef = useRef<SubscriptionListener | null>(null);

  useEffect(() => {
    // Create the listener on first render
    if (!subscriptionListenerRef.current) {
      subscriptionListenerRef.current = new SubscriptionListenerLocal(callbacks);
      subscriptionListenerRef.current.startListening();
    } else {
      // Update callbacks on subsequent renders
      subscriptionListenerRef.current.updateCallbacks(callbacks);
    }

    // Cleanup on unmount
    return () => {
      if (subscriptionListenerRef.current) {
        subscriptionListenerRef.current.stopListening();
        subscriptionListenerRef.current = null;
      }
    };
  }, [callbacks]);
}
