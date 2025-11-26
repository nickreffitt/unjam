import { useCreditBalanceState } from './useCreditBalanceState';
import { useGithubConnectState } from '@dashboard/customer/GithubConnect/hooks/useGithubConnectState';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';

/**
 * Hook to get onboarding status data
 * Returns credit balance, extension, and GitHub integration status
 */
export const useOnboardingState = () => {
  // Get credit balance data
  const {
    creditBalance,
    pendingCredits,
    isLoading: creditsLoading,
    error: creditsError
  } = useCreditBalanceState();

  // Get GitHub integration status
  const {
    integration: githubIntegration,
    isLoading: githubLoading,
    error: githubError
  } = useGithubConnectState();

  // Get extension installation status
  const { authUser } = useAuthState();
  const extensionInstalled = !!authUser.profile?.extensionInstalledAt;

  const isLoading = creditsLoading || githubLoading;
  const error = creditsError || githubError;

  return {
    creditBalance,
    pendingCredits,
    extensionInstalled,
    githubIntegration,
    isLoading,
    error
  };
};
