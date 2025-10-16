import { useState, useEffect, useCallback, useMemo } from 'react';
import { type Ticket, type GitHubIntegration, type GuideSlide } from '@common/types';
import { useGitHubShareManager } from '@extension/GitHubShare/contexts/GitHubShareManagerContext';
import { useCodeShareListener } from '@common/features/CodeShareManager/hooks';
import { useUserProfile } from '@extension/shared/UserProfileContext';
import { useTicketState } from '@extension/Ticket/hooks';

export interface UseGitHubShareStateReturn {
  // GitHub integration state
  githubIntegration: GitHubIntegration | null;
  isLoadingIntegration: boolean;

  // Modal visibility states
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isRepoLinkModalOpen: boolean;
  setIsRepoLinkModalOpen: (open: boolean) => void;

  // Repo link modal data
  platformName: string | null;
  guideSlides: GuideSlide[];
  setPlatformData: (platformName: string, slides: GuideSlide[]) => void;

  // Loading states
  isLinkingRepo: boolean;
  setIsLinkingRepo: (loading: boolean) => void;

  activeTicket: Ticket | null;
}

export const useGitHubShareState = (): UseGitHubShareStateReturn => {
  const [githubIntegration, setGitHubIntegration] = useState<GitHubIntegration | null>(null);
  const [isLoadingIntegration, setIsLoadingIntegration] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isRepoLinkModalOpen, setIsRepoLinkModalOpen] = useState<boolean>(false);
  const [platformName, setPlatformName] = useState<string | null>(null);
  const [guideSlides, setGuideSlides] = useState<GuideSlide[]>([]);
  const [isLinkingRepo, setIsLinkingRepo] = useState<boolean>(false);

  const { customerProfile } = useUserProfile();
  const { codeShareManager } = useGitHubShareManager();
  const { activeTicket } = useTicketState()

  // Load GitHub integration on initialization
  useEffect(() => {
    const loadIntegration = async () => {
      try {
        setIsLoadingIntegration(true);
        const integration = await codeShareManager.getIntegration();
        setGitHubIntegration(integration);
        console.debug('useGitHubShareState: Loaded GitHub integration', integration?.id);
      } catch (error) {
        console.error('useGitHubShareState: Error loading GitHub integration:', error);
        setGitHubIntegration(null);
      } finally {
        setIsLoadingIntegration(false);
      }
    };

    loadIntegration();
  }, [codeShareManager]);

  // Set platform data for repo link modal
  const setPlatformData = useCallback((name: string, slides: GuideSlide[]) => {
    setPlatformName(name);
    setGuideSlides(slides);
  }, []);

  // Listen for GitHub integration changes
  const handleGitHubIntegrationCreated = useCallback((integration: GitHubIntegration) => {
    if (integration.customerId === customerProfile.id) {
      console.debug('useGitHubShareState: GitHub integration created:', integration.id);
      setGitHubIntegration(integration);
    }
  }, [customerProfile.id]);

  const handleGitHubIntegrationUpdated = useCallback((integration: GitHubIntegration) => {
    if (integration.customerId === customerProfile.id) {
      console.debug('useGitHubShareState: GitHub integration updated:', integration.id);
      setGitHubIntegration(integration);
    }
  }, [customerProfile.id]);

  const handleGitHubIntegrationDeleted = useCallback((customerId: string) => {
    if (customerId === customerProfile.id) {
      console.debug('useGitHubShareState: GitHub integration deleted for customer:', customerId);
      setGitHubIntegration(null);
    }
  }, [customerProfile.id]);

  // Memoize the callbacks object to prevent recreating the listener
  const codeShareListenerCallbacks = useMemo(() => ({
    onGitHubIntegrationCreated: handleGitHubIntegrationCreated,
    onGitHubIntegrationUpdated: handleGitHubIntegrationUpdated,
    onGitHubIntegrationDeleted: handleGitHubIntegrationDeleted
  }), [handleGitHubIntegrationCreated, handleGitHubIntegrationUpdated, handleGitHubIntegrationDeleted]);

  // Listen for cross-tab GitHub integration events to keep context in sync
  useCodeShareListener(codeShareListenerCallbacks);

  return {
    githubIntegration,
    isLoadingIntegration,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isRepoLinkModalOpen,
    setIsRepoLinkModalOpen,
    platformName,
    guideSlides,
    setPlatformData,
    isLinkingRepo,
    setIsLinkingRepo,
    activeTicket
  };
};
