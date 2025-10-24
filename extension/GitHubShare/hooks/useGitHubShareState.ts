import { useState, useEffect, useCallback, useMemo } from 'react';
import { type Ticket, type GitHubIntegration, type GuideSlide, type RepositoryCollaborator, type CodeShareRequest } from '@common/types';
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
  isSharingCode: boolean;
  setIsSharingCode: (loading: boolean) => void;
  isStoppingShare: boolean;
  setIsStoppingShare: (loading: boolean) => void;

  activeTicket: Ticket | null;

  // Active collaborator state
  activeCollaborator: RepositoryCollaborator | null;
  refreshCollaborator: () => Promise<void>;

  // Code share request state
  activeRequest: CodeShareRequest | null;
  setActiveRequest: (request: CodeShareRequest | null) => void;
}

export const useGitHubShareState = (): UseGitHubShareStateReturn => {
  const [githubIntegration, setGitHubIntegration] = useState<GitHubIntegration | null>(null);
  const [isLoadingIntegration, setIsLoadingIntegration] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isRepoLinkModalOpen, setIsRepoLinkModalOpen] = useState<boolean>(false);
  const [platformName, setPlatformName] = useState<string | null>(null);
  const [guideSlides, setGuideSlides] = useState<GuideSlide[]>([]);
  const [isLinkingRepo, setIsLinkingRepo] = useState<boolean>(false);
  const [isSharingCode, setIsSharingCode] = useState<boolean>(false);
  const [isStoppingShare, setIsStoppingShare] = useState<boolean>(false);
  const [activeCollaborator, setActiveCollaborator] = useState<RepositoryCollaborator | null>(null);
  const [activeRequest, setActiveRequest] = useState<CodeShareRequest | null>(null);

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

  // Load active collaborator when ticket or URL changes
  const refreshCollaborator = useCallback(async () => {
    if (!activeTicket?.assignedTo) {
      setActiveCollaborator(null);
      return;
    }

    try {
      // Get all repositories for this customer
      const repositories = await codeShareManager.getAllRepositories();

      // Check each repository to see if the engineer has access
      for (const repo of repositories) {
        const collaborator = await codeShareManager.getCollaboratorByRepositoryAndEngineer(
          repo.id,
          activeTicket.assignedTo.id
        );

        if (collaborator && !collaborator.removedAt) {
          setActiveCollaborator(collaborator);
          console.debug('useGitHubShareState: Loaded active collaborator', collaborator.id);
          return;
        }
      }

      // No active collaborator found
      setActiveCollaborator(null);
    } catch (error) {
      console.error('useGitHubShareState: Error loading collaborators:', error);
      setActiveCollaborator(null);
    }
  }, [activeTicket, codeShareManager]);

  useEffect(() => {
    refreshCollaborator();
  }, [refreshCollaborator]);

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

  // Listen for collaborator changes
  const handleRepositoryCollaboratorCreated = useCallback((collaborator: RepositoryCollaborator) => {
    if (activeTicket?.assignedTo && collaborator.engineerId === activeTicket.assignedTo.id && !collaborator.removedAt) {
      console.debug('useGitHubShareState: Repository collaborator created:', collaborator.id);
      setActiveCollaborator(collaborator);
    }
  }, [activeTicket]);

  const handleRepositoryCollaboratorDeleted = useCallback((collaboratorId: string, engineerId: string) => {
    console.debug(`useGithubShareState: handleRepositoryCollaboratorDeleted(collaboratorId:${collaboratorId}, engineerId:${engineerId}) called`)
    if (activeTicket?.assignedTo && engineerId === activeTicket.assignedTo.id) {
      console.debug('useGitHubShareState: Repository collaborator deleted for assigned engineer:', collaboratorId);
      setActiveCollaborator(null);
    }
  }, [activeTicket]);

  // Listen for code share request changes
  const handleCodeShareRequestCreated = useCallback((request: CodeShareRequest) => {
    if (request.receiver.id === customerProfile.id && request.status === 'pending') {
      console.debug('useGitHubShareState: Code share request created:', request.id);
      setActiveRequest(request);
    }
  }, [customerProfile.id]);

  const handleCodeShareRequestUpdated = useCallback((request: CodeShareRequest) => {
    if (request.receiver.id === customerProfile.id) {
      console.debug('useGitHubShareState: Code share request updated:', request.id);
      if (request.status === 'pending') {
        setActiveRequest(request);
      } else {
        // Clear the request if it's no longer pending (accepted/rejected)
        setActiveRequest(null);
      }
    }
  }, [customerProfile.id]);

  // Memoize the callbacks object to prevent recreating the listener
  const codeShareListenerCallbacks = useMemo(() => ({
    onGitHubIntegrationCreated: handleGitHubIntegrationCreated,
    onGitHubIntegrationUpdated: handleGitHubIntegrationUpdated,
    onGitHubIntegrationDeleted: handleGitHubIntegrationDeleted,
    onRepositoryCollaboratorCreated: handleRepositoryCollaboratorCreated,
    onRepositoryCollaboratorDeleted: handleRepositoryCollaboratorDeleted,
    onCodeShareRequestCreated: handleCodeShareRequestCreated,
    onCodeShareRequestUpdated: handleCodeShareRequestUpdated
  }), [
    handleGitHubIntegrationCreated,
    handleGitHubIntegrationUpdated,
    handleGitHubIntegrationDeleted,
    handleRepositoryCollaboratorCreated,
    handleRepositoryCollaboratorDeleted,
    handleCodeShareRequestCreated,
    handleCodeShareRequestUpdated
  ]);

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
    isSharingCode,
    setIsSharingCode,
    isStoppingShare,
    setIsStoppingShare,
    activeTicket,
    activeCollaborator,
    refreshCollaborator,
    activeRequest,
    setActiveRequest
  };
};
