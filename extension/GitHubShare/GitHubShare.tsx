import React, { useCallback } from 'react';
import { type ErrorDisplay } from '@common/types';
import ShareCodeButton from './components/ShareCodeButton/ShareCodeButton';
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
  const { handleShareCodeClick, handleLinkRepository } = useGitHubShareActions(
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
    activeTicket
  } = githubShareState;

  // Don't show button if no ticket or ticket not assigned
  if (!activeTicket || !activeTicket.assignedTo) {
    return null;
  }

  // Hide button when there's a screen share request
  if (hideWhenScreenShareRequest) {
    return null;
  }

  return (
    <>
      <div data-testid="github-share" className={`unjam-w-120 unjam-bg-white unjam-flex unjam-items-center unjam-justify-center unjam-z-50 unjam-font-sans ${className}`}>
        <ShareCodeButton
          onClick={handleShareCodeClick}
          disabled={isLoadingIntegration}
          loading={isLoadingIntegration}
        />
      </div>

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
    </>
  );
};

export default GitHubShare;
