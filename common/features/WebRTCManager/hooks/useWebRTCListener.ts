import { useEffect, useRef } from 'react';
import { WebRTCListener, type WebRTCListenerCallbacks } from '@common/features/WebRTCManager/events';

/**
 * Hook that listens to global WebRTC events via window events
 * This hook uses the WebRTCListener class to manage window event subscriptions
 *
 * @param callbacks - Partial listener implementation with only the events you care about
 *
 * @example
 * ```tsx
 * useWebRTCListener({
 *   onWebRTCStateChanged: (sessionId, state, localUser, remoteUser) => {
 *     console.log('WebRTC state changed:', state);
 *     updateConnectionStatus(state);
 *   },
 *   onWebRTCError: (sessionId, error, localUser, remoteUser) => {
 *     console.error('WebRTC error occurred:', error);
 *     showErrorMessage(error.message);
 *   },
 *   onWebRTCRemoteStream: (sessionId, streamInfo, localUser, remoteUser) => {
 *     console.log('Remote stream received:', streamInfo);
 *     handleRemoteStreamAvailable();
 *   }
 * });
 * ```
 */
export function useWebRTCListener(callbacks: Partial<WebRTCListenerCallbacks>): void {
  // Create a WebRTCListener instance and keep it stable across re-renders
  const webrtcListenerRef = useRef<WebRTCListener | null>(null);

  // Update callbacks when they change
  useEffect(() => {
    if (webrtcListenerRef.current) {
      try {
        webrtcListenerRef.current.updateCallbacks(callbacks);
      } catch (error) {
        console.warn('Error updating WebRTC listener callbacks:', error);
      }
    }
  }, [callbacks]);

  // Initialize listener once on mount and cleanup on unmount
  useEffect(() => {
    try {
      // Create the listener on first render
      webrtcListenerRef.current = new WebRTCListener(callbacks);
      if (webrtcListenerRef.current && typeof webrtcListenerRef.current.startListening === 'function') {
        webrtcListenerRef.current.startListening();
      }
    } catch (error) {
      console.error('Error creating WebRTC listener:', error);
      throw error; // Re-throw to let test framework catch it
    }

    // Cleanup on unmount
    return () => {
      if (webrtcListenerRef.current) {
        try {
          webrtcListenerRef.current.stopListening();
        } catch (error) {
          console.warn('Error stopping WebRTC listener:', error);
        }
        webrtcListenerRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount
}