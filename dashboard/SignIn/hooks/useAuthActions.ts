import { useState, useCallback } from 'react';
import { type ErrorDisplay } from '@common/types';
import { useAuthManager } from '@dashboard/shared/contexts/AuthManagerContext';

export interface UseAuthActionsReturn {
  signInWithOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signInWithGoogleWeb: () => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
  error: ErrorDisplay | null;
  clearError: () => void;
}

/**
 * Hook for authentication actions
 * Handles sign in, sign out, and loading states
 */
export const useAuthActions = (): UseAuthActionsReturn => {
  const { authManager } = useAuthManager();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorDisplay | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signInWithOtp = useCallback(async (email: string): Promise<void> => {
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
      console.debug('useAuthActions: Sending magic link to:', email);
      await authManager.signInWithOtp(email);
      console.debug('useAuthActions: Magic link sent successfully');
    } catch (error) {
      console.error('useAuthActions: Magic link failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send magic link';
      setError({
        title: 'Sign In Failed',
        message: errorMessage,
      });
      throw error; // Re-throw so UI can handle it
    } finally {
      setIsLoading(false);
    }
  }, [authManager]);

  const verifyOtp = useCallback(async (email: string, token: string): Promise<void> => {
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
      console.debug('useAuthActions: Verifying OTP token for email:', email);
      await authManager.verifyOtp(email, token);
      console.debug('useAuthActions: OTP verified successfully');
    } catch (error) {
      console.error('useAuthActions: OTP verification failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify OTP';
      setError({
        title: 'Verification Failed',
        message: errorMessage,
      });
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
      console.debug('useAuthActions: Signing in with Google');
      await authManager.signInWithGoogleWeb();
      console.debug('useAuthActions: Google sign in initiated');
    } catch (error) {
      console.error('useAuthActions: Google sign in failed:', error);
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

  const signOut = useCallback(async (): Promise<void> => {
    if (!authManager) {
      setError({
        title: 'Configuration Error',
        message: 'Authentication is not properly configured.',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.debug('useAuthActions: Signing out user');
      await authManager.signOut();
      console.debug('useAuthActions: User signed out successfully');
    } catch (error) {
      console.error('useAuthActions: Sign out failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
      setError({
        title: 'Sign Out Failed',
        message: errorMessage,
      });
      throw error; // Re-throw so UI can handle it
    } finally {
      setIsLoading(false);
    }
  }, [authManager]);

  return {
    signInWithOtp,
    verifyOtp,
    signInWithGoogleWeb,
    signOut,
    isLoading,
    error,
    clearError,
  };
};