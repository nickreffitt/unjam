import { useCallback } from 'react';
import { type ErrorDisplay } from '@common/types';
import { useGitHubShareManager } from '@extension/GitHubShare/contexts/GitHubShareManagerContext';
import { detectPlatform } from '@extension/GitHubShare/util/platformDetection';
import { type UseGitHubShareStateReturn } from './useGitHubShareState';

export interface UseGitHubShareActionsReturn {
  handleShareCodeClick: () => Promise<void>;
  handleLinkRepository: (githubRepoUrl: string) => Promise<void>;
  handleStopSharing: () => Promise<void>;
  handleAcceptRequest: () => Promise<void>;
  handleRejectRequest: () => Promise<void>;
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
    setIsSharingCode,
    setIsStoppingShare,
    activeTicket,
    activeCollaborator,
    activeRequest,
    setActiveRequest,
    refreshCollaborator
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
        setIsSharingCode(true);
        try {
          await codeShareManager.inviteCollaborator(
            existingRepo.id,
            activeTicket,
          );
          // Refresh the collaborator state
          await refreshCollaborator();
          onSuccess(`Engineer ${activeTicket.assignedTo.name} invited to repository`);
        } catch (error) {
          console.error('Failed to invite collaborator:', error);
          onError({
            title: 'Failed to Invite Engineer',
            message: error instanceof Error ? error.message : 'Could not invite engineer to repository. Please try again.'
          });
        } finally {
          setIsSharingCode(false);
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
  }, [activeTicket, githubIntegration, codeShareManager, setPlatformData, setIsRepoLinkModalOpen, onError, setIsAuthModalOpen, setIsSharingCode, refreshCollaborator, onSuccess]);

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
      // Create repository mapping and invite engineer
      await codeShareManager.createRepositoryAndInvite(
        platformInfo.externalProjectUrl,
        platformInfo.platformName,
        platformInfo.projectId,
        githubRepoUrl,
        activeTicket
      );

      // Refresh the collaborator state
      await refreshCollaborator();

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
    setIsLinkingRepo,
    refreshCollaborator
  ]);

  /**
   * Handle stop sharing button click
   * Removes the active collaborator from the repository
   */
  const handleStopSharing = useCallback(async () => {
    if (!activeTicket || !activeCollaborator) {
      onError({
        title: 'Invalid State',
        message: 'No active collaboration to stop.'
      });
      return;
    }

    setIsStoppingShare(true);
    try {
      await codeShareManager.removeCollaborator(
        activeCollaborator.repositoryId,
        activeTicket
      );

      // Refresh the collaborator state
      await refreshCollaborator();

      onSuccess(`Engineer ${activeTicket.assignedTo?.name} removed from repository`);
    } catch (error) {
      console.error('Failed to remove collaborator:', error);
      onError({
        title: 'Failed to Stop Sharing',
        message: error instanceof Error ? error.message : 'Could not remove engineer from repository. Please try again.'
      });
    } finally {
      setIsStoppingShare(false);
    }
  }, [activeTicket, activeCollaborator, codeShareManager, refreshCollaborator, onSuccess, onError, setIsStoppingShare]);

  /**
   * Handle accepting a code share request
   * Follows the same flow as clicking "Share Code" button, then marks request as accepted
   */
  const handleAcceptRequest = useCallback(async () => {
    if (!activeRequest) {
      onError({
        title: 'Invalid State',
        message: 'No active request to accept.'
      });
      return;
    }

    const requestId = activeRequest.id;

    // Clear the active request and set loading state immediately to switch UI
    setActiveRequest(null);
    setIsSharingCode(true);

    try {
      // Call the same flow as "Share Code"
      await handleShareCodeClick();

      // After successful share, update request status to accepted
      await codeShareManager.updateCodeShareRequestStatus(requestId, 'accepted');
      console.debug('Code share request accepted:', requestId);
    } catch (error) {
      console.error('Failed to accept request:', error);
      // Error handling is already done in handleShareCodeClick
    }
  }, [activeRequest, setActiveRequest, setIsSharingCode, codeShareManager, handleShareCodeClick, onError]);

  /**
   * Handle rejecting a code share request
   */
  const handleRejectRequest = useCallback(async () => {
    if (!activeRequest) {
      onError({
        title: 'Invalid State',
        message: 'No active request to reject.'
      });
      return;
    }

    const requestId = activeRequest.id;

    // Clear the active request immediately to switch UI to loading state
    setActiveRequest(null);
    setIsSharingCode(true); 

    try {
      await codeShareManager.updateCodeShareRequestStatus(requestId, 'rejected');
      onSuccess(`Code share request rejected`);
    } catch (error) {
      console.error('Failed to reject request:', error);
      onError({
        title: 'Failed to Reject Request',
        message: error instanceof Error ? error.message : 'Could not reject code share request. Please try again.'
      });
    } finally {
      setIsSharingCode(false);
    }
  }, [activeRequest, setActiveRequest, setIsSharingCode, onError, codeShareManager, onSuccess]);

  return {
    handleShareCodeClick,
    handleLinkRepository,
    handleStopSharing,
    handleAcceptRequest,
    handleRejectRequest
  };
};
