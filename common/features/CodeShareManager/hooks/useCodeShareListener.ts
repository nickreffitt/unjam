import { useEffect, useRef } from 'react';
import { type CodeShareListener, CodeShareListenerLocal, type CodeShareListenerCallbacks } from '@common/features/CodeShareManager/events';

/**
 * Hook that listens to global code share events via window events
 * This hook uses the CodeShareListener class to manage window event subscriptions
 *
 * @param callbacks - Partial listener implementation with only the events you care about
 *
 * @example
 * ```tsx
 * useCodeShareListener({
 *   onGitHubIntegrationCreated: (integration) => {
 *     console.log('New GitHub integration created:', integration);
 *     refetchIntegrations();
 *   },
 *   onProjectRepositoryCreated: (repository) => {
 *     console.log('New repository linked:', repository);
 *     updateRepositoryList();
 *   }
 * });
 * ```
 */
export function useCodeShareListener(callbacks: Partial<CodeShareListenerCallbacks>): void {
  // Create a CodeShareListener instance and keep it stable across re-renders
  const codeShareListenerRef = useRef<CodeShareListener | null>(null);

  useEffect(() => {
    // Create the listener on first render
    if (!codeShareListenerRef.current) {
      codeShareListenerRef.current = new CodeShareListenerLocal(callbacks);
      codeShareListenerRef.current.startListening();
    } else {
      // Update callbacks on subsequent renders
      codeShareListenerRef.current.updateCallbacks(callbacks);
    }

    // Cleanup on unmount
    return () => {
      if (codeShareListenerRef.current) {
        codeShareListenerRef.current.stopListening();
        codeShareListenerRef.current = null;
      }
    };
  }, [callbacks]);
}
