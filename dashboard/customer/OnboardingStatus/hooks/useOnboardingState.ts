import { useSubscriptionState } from '@dashboard/customer/Subscription/hooks/useSubscriptionState';
import { useGithubConnectState } from '@dashboard/customer/GithubConnect/hooks/useGithubConnectState';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';

/**
 * Hook to get onboarding status data
 * Returns subscription, extension, and GitHub integration status
 */
export const useOnboardingState = () => {
  // Get subscription data
  const {
    subscription,
    creditBalance,
    pendingCredits,
    isLoading: subscriptionLoading,
    error: subscriptionError
  } = useSubscriptionState();

  // Get GitHub integration status
  const {
    integration: githubIntegration,
    isLoading: githubLoading,
    error: githubError
  } = useGithubConnectState();

  // Get extension installation status
  const { authUser } = useAuthState();
  const extensionInstalled = !!authUser.profile?.extensionInstalledAt;

  const isLoading = subscriptionLoading || githubLoading;
  const error = subscriptionError || githubError;

  return {
    subscription,
    creditBalance,
    pendingCredits,
    extensionInstalled,
    githubIntegration,
    isLoading,
    error
  };
};
