import { useState, useEffect } from 'react';
import { useGithubConnectManager } from '../contexts/GithubConnectManagerContext';
import type { GitHubIntegration, ErrorDisplay } from '@common/types';

export const useGithubConnectState = () => {
  const { codeShareManager } = useGithubConnectManager();
  const [integration, setIntegration] = useState<GitHubIntegration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorDisplay | null>(null);

  useEffect(() => {
    const loadIntegration = async () => {
      try {
        setIsLoading(true);
        const result = await codeShareManager.getIntegration();
        setIntegration(result);
        setError(null);
      } catch (err) {
        console.error('[useGithubConnectState] Failed to load integration:', err);
        setError({
          title: 'Failed to Load Integration',
          message: err instanceof Error ? err.message : 'Unknown error occurred'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadIntegration();
  }, [codeShareManager]);

  return {
    integration,
    isLoading,
    error
  };
};
