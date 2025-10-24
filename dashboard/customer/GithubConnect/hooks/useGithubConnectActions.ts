import { useState } from 'react';
import { useGithubConnectManager } from '../contexts/GithubConnectManagerContext';
import type { ErrorDisplay } from '@common/types';

export const useGithubConnectActions = () => {
  const { codeShareManager } = useGithubConnectManager();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<ErrorDisplay | null>(null);

  const startOAuthFlow = () => {
    try {
      const authUrl = codeShareManager.getAuthorizationUrl();
      window.location.href = authUrl;
    } catch (err) {
      console.error('[useGithubConnectActions] Failed to start OAuth flow:', err);
      setError({
        title: 'Failed to Connect',
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      });
    }
  };

  const handleOAuthCallback = async (code: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      await codeShareManager.handleOAuthCallback(code);
      return true;
    } catch (err) {
      console.error('[useGithubConnectActions] OAuth callback failed:', err);
      setError({
        title: 'Connection Failed',
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    startOAuthFlow,
    handleOAuthCallback,
    isProcessing,
    error
  };
};
