import { useCallback } from 'react';
import { type ErrorDisplay } from '@common/types';
import { useGitHubShareManager } from '@extension/GitHubShare/contexts/GitHubShareManagerContext';
import { detectPlatform } from '@extension/GitHubShare/util/platformDetection';
import { type UseGitHubShareStateReturn } from './useGitHubShareState';

export interface UseGitHubShareActionsReturn {
  handleShareCodeClick: () => Promise<void>;
  handleLinkRepository: (githubRepoUrl: string) => Promise<void>;
}

export const useGitHubShareActions = (
  githubShareState: UseGitHubShareStateReturn,
  onSuccess: (message: string) => void,
  onError: (error: ErrorDisplay) => void
): UseGitHubShareActionsReturn => {
  const { codeShareManager } = useGitHubShareManager();
  const {
    githubIntegration,
    setIsAuthModalOpen,
    setIsRepoLinkModalOpen,
    setPlatformData,
    setIsLinkingRepo,
    activeTicket
  } = githubShareState;

  /**
   * Main share code button click handler
   * Implements the flow logic from the plan (lines 240-292)
   */
  const handleShareCodeClick = useCallback(async () => {
    try {
      // Validate ticket exists and has an assigned engineer
      if (!activeTicket) {
        onError({
          title: 'No Active Ticket',
          message: 'You need an active ticket to share code.'
        });
        return;
      }

      if (!activeTicket.assignedTo) {
        onError({
          title: 'No Engineer Assigned',
          message: 'Please wait for an engineer to be assigned to your ticket.'
        });
        return;
      }

      if (!activeTicket.assignedTo.githubUsername) {
        onError({
          title: 'Engineer GitHub Not Found',
          message: 'The assigned engineer does not have a GitHub username configured.'
        });
        return;
      }

      // 1. Detect platform
      const platformInfo = detectPlatform();
      if (!platformInfo) {
        onError({
          title: 'Platform Not Supported',
          message: 'Share Code is not available on this platform. Supported platforms: Lovable, Replit, Base44, Bolt.new, v0.dev'
        });
        return;
      }

      // 2. Check GitHub integration
      if (!githubIntegration) {
        // Show GitHub auth modal
        setIsAuthModalOpen(true);
        return;
      }

      // 3. Check for existing repo mapping
      const existingRepo = await codeShareManager.getRepositoryByExternalUrl(
        platformInfo.externalProjectUrl
      );

      if (existingRepo) {
        // Auto-invite engineer (no prompts)
        try {
          await codeShareManager.inviteCollaborator(
            existingRepo.id,
            activeTicket.id,
            activeTicket.assignedTo.githubUsername
          );
          onSuccess(`Engineer ${activeTicket.assignedTo.name} invited to repository`);
        } catch (error) {
          console.error('Failed to invite collaborator:', error);
          onError({
            title: 'Failed to Invite Engineer',
            message: error instanceof Error ? error.message : 'Could not invite engineer to repository. Please try again.'
          });
        }
        return;
      }

      // 4. Show repo link modal with platform guide
      setPlatformData(platformInfo.platformName, platformInfo.guide);
      setIsRepoLinkModalOpen(true);
    } catch (error) {
      console.error('Error in handleShareCodeClick:', error);
      onError({
        title: 'Share Code Error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.'
      });
    }
  }, [
    activeTicket,
    githubIntegration,
    codeShareManager,
    onSuccess,
    onError,
    setIsAuthModalOpen,
    setIsRepoLinkModalOpen,
    setPlatformData
  ]);

  /**
   * Handle repository link submission from modal
   */
  const handleLinkRepository = useCallback(async (githubRepoUrl: string) => {
    if (!activeTicket || !activeTicket.assignedTo || !activeTicket.assignedTo.githubUsername) {
      onError({
        title: 'Invalid State',
        message: 'No active ticket or engineer assigned.'
      });
      return;
    }

    const platformInfo = detectPlatform();
    if (!platformInfo) {
      onError({
        title: 'Platform Detection Failed',
        message: 'Could not detect current platform.'
      });
      return;
    }

    setIsLinkingRepo(true);
    try {
      // Validate repository first
      await codeShareManager.validateRepository(githubRepoUrl);

      // Create repository mapping and invite engineer
      await codeShareManager.createRepositoryAndInvite(
        platformInfo.externalProjectUrl,
        platformInfo.platformName,
        platformInfo.projectId,
        githubRepoUrl,
        activeTicket.id,
        activeTicket.assignedTo.githubUsername
      );

      // Success
      onSuccess(`Repository linked and engineer ${activeTicket.assignedTo.name} invited`);
      setIsRepoLinkModalOpen(false);
    } catch (error) {
      console.error('Failed to link repository:', error);
      // Re-throw error so modal can display it
      throw error;
    } finally {
      setIsLinkingRepo(false);
    }
  }, [
    activeTicket,
    codeShareManager,
    onSuccess,
    onError,
    setIsRepoLinkModalOpen,
    setIsLinkingRepo
  ]);

  return {
    handleShareCodeClick,
    handleLinkRepository
  };
};
