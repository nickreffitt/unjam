import React, { useCallback } from 'react';
import { Github, X } from 'lucide-react';
import { type ErrorDisplay } from '@common/types';
import TimeBasedButton from '@common/components/TimeBasedButton/TimeBasedButton';
import ShareCodeButton from './components/ShareCodeButton/ShareCodeButton';
import StopSharingCodeButton from './components/StopSharingCodeButton/StopSharingCodeButton';
import GitHubAuthModal from './components/GitHubAuthModal/GitHubAuthModal';
import RepoLinkModal from './components/RepoLinkModal/RepoLinkModal';
import { useGitHubShareState } from './hooks/useGitHubShareState';
import { useGitHubShareActions } from './hooks/useGitHubShareActions';

interface GitHubShareProps {
  className?: string;
  hideWhenScreenShareRequest?: boolean;
}

const GitHubShare: React.FC<GitHubShareProps> = ({ className = '', hideWhenScreenShareRequest = false }) => {
  // Success/error handlers using console logging (following ScreenShare pattern)
  const handleSuccess = useCallback((message: string) => {
    console.debug('GitHubShare success:', message);
    // TODO: Could integrate with a toast system in the future
  }, []);

  const handleError = useCallback((error: ErrorDisplay) => {
    console.error('GitHubShare error:', error.title, error.message);
    // TODO: Could integrate with a toast system in the future
  }, []);

  // Use custom hooks for state and actions
  const githubShareState = useGitHubShareState();
  const { handleShareCodeClick, handleLinkRepository, handleStopSharing, handleAcceptRequest, handleRejectRequest } = useGitHubShareActions(
    githubShareState,
    handleSuccess,
    handleError
  );

  const {
    isLoadingIntegration,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isRepoLinkModalOpen,
    setIsRepoLinkModalOpen,
    platformName,
    guideSlides,
    activeTicket,
    activeCollaborator,
    isSharingCode,
    isStoppingShare,
    activeRequest
  } = githubShareState;

  // Hide button when there's a screen share request
  if (hideWhenScreenShareRequest) {
    return null;
  }

  // Show incoming request UI if there's a pending request from an engineer
  // When accepting (isSharingCode), fall through to show ShareCodeButton in loading state
  if (activeRequest && activeRequest.status === 'pending' && activeRequest.sender.type === 'engineer' && !isSharingCode) {
    return (
      <div data-testid="github-share" className={`unjam-flex-1 unjam-bg-white unjam-flex unjam-flex-col unjam-items-center unjam-justify-center unjam-z-50 unjam-font-sans ${className}`}>
        <p className="unjam-text-blue-900 unjam-font-medium unjam-text-sm unjam-mb-3 unjam-text-center">
          {activeRequest.sender.name} wants to access your code
        </p>
        <div className="unjam-flex unjam-gap-2 unjam-w-full">
          <TimeBasedButton
            expiresAt={activeRequest.expiresAt}
            onClick={handleAcceptRequest}
            className="unjam-flex-1 unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm hover:unjam-brightness-95"
          >
            <Github size={14} />
            <span>Share Code</span>
          </TimeBasedButton>
          <button
            onClick={handleRejectRequest}
            className="unjam-flex-1 unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-1 hover:unjam-bg-gray-50"
          >
            <X size={14} />
            <span>Dismiss</span>
          </button>
        </div>
      </div>
    );
  }

  // Show "Stop Sharing" state if there's an active collaborator
  if (activeCollaborator) {
    return (
      <div data-testid="github-share" className={`unjam-flex-1 unjam-bg-white unjam-flex unjam-items-center unjam-justify-center unjam-z-50 unjam-font-sans ${className}`}>
        <StopSharingCodeButton
          onClick={handleStopSharing}
          disabled={isStoppingShare}
          loading={isStoppingShare}
        />
      </div>
    );
  }

  // Don't show button if no ticket or ticket not assigned
  const shouldDisableButton = !activeTicket || !activeTicket.assignedTo || isLoadingIntegration || isSharingCode;

  return (
    <div data-testid="github-share" className={`unjam-flex-1 unjam-bg-white unjam-flex unjam-items-center unjam-justify-center unjam-z-50 unjam-font-sans ${className}`}>
      <ShareCodeButton
        onClick={handleShareCodeClick}
        disabled={shouldDisableButton}
        loading={isLoadingIntegration || isSharingCode}
      />

      {/* GitHub Auth Modal */}
      <GitHubAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Repo Link Modal */}
      <RepoLinkModal
        isOpen={isRepoLinkModalOpen}
        onClose={() => setIsRepoLinkModalOpen(false)}
        onSubmit={handleLinkRepository}
        platformName={platformName || ''}
        guideSlides={guideSlides}
      />
    </div>
  );
};

export default GitHubShare;
