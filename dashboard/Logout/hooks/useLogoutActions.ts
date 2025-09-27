import { useState, useCallback } from 'react';
import { type ErrorDisplay } from '@common/types';
import { useAuthManager } from '@dashboard/shared/contexts/AuthManagerContext';

export interface UseLogoutActionsReturn {
  signOut: () => Promise<void>;
  isLoading: boolean;
  error: ErrorDisplay | null;
  clearError: () => void;
}

/**
 * Hook for logout actions
 * Handles user sign out and loading states
 */
export const useLogoutActions = (): UseLogoutActionsReturn => {
  const { authManager } = useAuthManager();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorDisplay | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    if (!authManager) {
      setError({
        title: 'Configuration Error',
        message: 'Authentication is not properly configured. Please check your settings.',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.debug('useLogoutActions: Signing out user');
      await authManager.signOut();
      console.debug('useLogoutActions: User signed out successfully');
    } catch (error) {
      console.error('useLogoutActions: Sign out failed:', error);
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
    signOut,
    isLoading,
    error,
    clearError,
  };
};