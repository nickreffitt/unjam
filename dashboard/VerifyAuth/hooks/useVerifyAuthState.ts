import { useState, useEffect, useCallback } from 'react';
import { type ErrorDisplay } from '@common/types';

export interface UseVerifyAuthStateReturn {
  tokenHash: string | null;
  isValidToken: boolean;
  error: ErrorDisplay | null;
  clearError: () => void;
}

/**
 * Hook for managing verify authentication state
 * Extracts and validates token hash from URL parameters
 */
export const useVerifyAuthState = (): UseVerifyAuthStateReturn => {
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState(false);
  const [error, setError] = useState<ErrorDisplay | null>(null);

  useEffect(() => {
    // Extract token hash from URL parameters
    console.debug('[useVerifyAuthState] Current URL:', window.location.href);
    console.debug('[useVerifyAuthState] URL search params:', window.location.search);
    const urlParams = new URLSearchParams(window.location.search);
    const tokenHashParam = urlParams.get('token_hash');
    console.debug('[useVerifyAuthState] Extracted token_hash:', tokenHashParam);

    if (!tokenHashParam) {
      setError({
        title: 'Invalid Link',
        message: 'This verification link is missing required parameters. Please use the full link from your email.',
      });
      setIsValidToken(false);
      return;
    }

    // Basic validation - ensure it's not empty and has reasonable length
    if (tokenHashParam.length < 10) {
      setError({
        title: 'Invalid Token',
        message: 'This verification link appears to be corrupted. Please request a new magic link.',
      });
      setIsValidToken(false);
      return;
    }

    setTokenHash(tokenHashParam);
    setIsValidToken(true);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    tokenHash,
    isValidToken,
    error,
    clearError,
  };
};