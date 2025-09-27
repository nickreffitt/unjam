import { useEffect, useRef } from 'react';
import { type AuthListener, AuthListenerLocal, type AuthListenerCallbacks } from '@common/features/AuthManager/events';

/**
 * Hook that listens to global auth events via window events
 * This hook uses the AuthListener class to manage window event subscriptions
 *
 * @param callbacks - Partial listener implementation with only the events you care about
 *
 * @example
 * ```tsx
 * useAuthListener({
 *   onUserSignedIn: (user) => {
 *     console.log('User signed in:', user);
 *     navigate('/dashboard');
 *   },
 *   onUserSignedOut: () => {
 *     console.log('User signed out');
 *     navigate('/login');
 *   },
 *   onAuthStateChanged: (user) => {
 *     console.log('Auth state changed:', user);
 *     setCurrentUser(user);
 *   }
 * });
 * ```
 */
export function useAuthListener(callbacks: Partial<AuthListenerCallbacks>): void {
  // Create an AuthListener instance and keep it stable across re-renders
  const authListenerRef = useRef<AuthListener | null>(null);

  // Update callbacks when they change, but don't restart the listener
  useEffect(() => {
    if (authListenerRef.current) {
      authListenerRef.current.updateCallbacks(callbacks);
    }
  }, [callbacks]);

  // Initialize and cleanup listener (only on mount/unmount)
  useEffect(() => {
    // Create and start the listener on mount
    authListenerRef.current = new AuthListenerLocal(callbacks);
    authListenerRef.current.startListening();

    // Cleanup on unmount
    return () => {
      if (authListenerRef.current) {
        authListenerRef.current.stopListening();
        authListenerRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount
}