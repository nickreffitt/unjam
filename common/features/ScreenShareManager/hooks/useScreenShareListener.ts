import { useEffect, useRef } from 'react';
import { ScreenShareListener, type ScreenShareListenerCallbacks } from '@common/features/ScreenShareManager/events';

/**
 * Hook that listens to global screen share events via window events
 * This hook uses the ScreenShareListener class to manage window event subscriptions
 *
 * @param callbacks - Partial listener implementation with only the events you care about
 *
 * @example
 * ```tsx
 * useScreenShareListener({
 *   onScreenShareRequestCreated: (request) => {
 *     console.log('New screen share request:', request);
 *     refreshState();
 *   },
 *   onScreenShareRequestUpdated: (request) => {
 *     console.log('Screen share request updated:', request);
 *     refreshState();
 *   }
 * });
 * ```
 */
export function useScreenShareListener(callbacks: Partial<ScreenShareListenerCallbacks>): void {
  // Create a ScreenShareListener instance and keep it stable across re-renders
  const screenShareListenerRef = useRef<ScreenShareListener | null>(null);

  // Update callbacks when they change
  useEffect(() => {
    if (screenShareListenerRef.current) {
      try {
        screenShareListenerRef.current.updateCallbacks(callbacks);
      } catch (error) {
        console.warn('Error updating screen share listener callbacks:', error);
      }
    }
  }, [callbacks]);

  // Initialize listener once on mount and cleanup on unmount
  useEffect(() => {
    try {
      // Create the listener on first render
      screenShareListenerRef.current = new ScreenShareListener(callbacks);
      if (screenShareListenerRef.current && typeof screenShareListenerRef.current.startListening === 'function') {
        screenShareListenerRef.current.startListening();
      }
    } catch (error) {
      console.error('Error creating screen share listener:', error);
      throw error; // Re-throw to let test framework catch it
    }

    // Cleanup on unmount
    return () => {
      if (screenShareListenerRef.current) {
        try {
          screenShareListenerRef.current.stopListening();
        } catch (error) {
          console.warn('Error stopping screen share listener:', error);
        }
        screenShareListenerRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount
}