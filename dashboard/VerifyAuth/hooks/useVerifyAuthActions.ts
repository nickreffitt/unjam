import { useState, useCallback } from 'react';
import { type ErrorDisplay } from '@common/types';
import { useAuthManager } from '@dashboard/shared/contexts/AuthManagerContext';

export interface UseVerifyAuthActionsReturn {
  verifyMagicLink: (tokenHash: string) => Promise<void>;
  signInWithGoogleWeb: () => Promise<void>;
  isLoading: boolean;
  error: ErrorDisplay | null;
  clearError: () => void;
}

/**
 * Hook for verify authentication actions
 * Handles magic link verification, Google OAuth fallback, and loading states
 */
export const useVerifyAuthActions = (): UseVerifyAuthActionsReturn => {
  const { authManager } = useAuthManager();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorDisplay | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const verifyMagicLink = useCallback(async (tokenHash: string): Promise<void> => {
    if (!authManager) {
      setError({
        title: 'Configuration Error',
        message: 'Authentication is not properly configured. Please check your Supabase settings.',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.debug('useVerifyAuthActions: Verifying magic link token');
      await authManager.verifyMagicLink(tokenHash);
      console.debug('useVerifyAuthActions: Magic link verified successfully');
    } catch (error) {
      console.error('useVerifyAuthActions: Magic link verification failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify magic link';

      // Provide user-friendly error messages
      let title = 'Verification Failed';
      let message = errorMessage;

      if (errorMessage.includes('Invalid or expired')) {
        title = 'Link Expired';
        message = 'This magic link has expired or is invalid. Please request a new one or continue with Google.';
      } else if (errorMessage.includes('User not found')) {
        title = 'Authentication Error';
        message = 'Unable to complete sign in. Please try again or continue with Google.';
      }

      setError({ title, message });
      throw error; // Re-throw so UI can handle it
    } finally {
      setIsLoading(false);
    }
  }, [authManager]);

  const signInWithGoogleWeb = useCallback(async (): Promise<void> => {
    if (!authManager) {
      setError({
        title: 'Configuration Error',
        message: 'Authentication is not properly configured. Please check your Supabase settings.',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.debug('useVerifyAuthActions: Signing in with Google fallback');
      await authManager.signInWithGoogleWeb();
      console.debug('useVerifyAuthActions: Google sign in initiated');
    } catch (error) {
      console.error('useVerifyAuthActions: Google sign in failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google';
      setError({
        title: 'Google Sign In Failed',
        message: errorMessage,
      });
      throw error; // Re-throw so UI can handle it
    } finally {
      setIsLoading(false);
    }
  }, [authManager]);

  return {
    verifyMagicLink,
    signInWithGoogleWeb,
    isLoading,
    error,
    clearError,
  };
};