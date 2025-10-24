import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { CodeShareRequest, ProjectRepository, RepositoryCollaborator, UserProfile } from '@common/types';
import { useCodeShareManager } from '@dashboard/engineer/CodeShare/contexts/CodeShareManagerContext';
import { useCodeShareListener } from '@common/features/CodeShareManager/hooks';
import { useChatManager } from '@dashboard/engineer/ChatBox/contexts/ChatManagerContext';

export type CodeShareUIState =
  | 'idle'              // No request
  | 'requesting';       // Engineer sent request, waiting for timeout

export interface UseCodeShareStateReturn {
  currentRequest: CodeShareRequest | null;
  uiState: CodeShareUIState;
  repositoryUrl: string | null;
}

export const useCodeShareState = (customer?: UserProfile): UseCodeShareStateReturn => {
  const { codeShareManager } = useCodeShareManager();
  const { userProfile } = useChatManager();
  const [currentRequest, setCurrentRequest] = useState<CodeShareRequest | null>(null);
  const [uiState, setUIState] = useState<CodeShareUIState>('idle');
  const [repositoryUrl, setRepositoryUrl] = useState<string | null>(null);
  const expirationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any existing expiration timer
  const clearExpirationTimer = useCallback(() => {
    if (expirationTimerRef.current) {
      clearTimeout(expirationTimerRef.current);
      expirationTimerRef.current = null;
    }
  }, []);

  // Set expiration timer for a pending request (5 seconds)
  const setExpirationTimer = useCallback((request: CodeShareRequest) => {
    // Clear any existing timer first
    clearExpirationTimer();

    // Only set timer for pending requests
    if (request.status !== 'pending') {
      return;
    }

    const now = new Date();
    const expiresAt = new Date(request.expiresAt);
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();

    if (timeUntilExpiry > 0) {
      console.debug('Setting expiration timer for code share request', request.id, 'expires in', timeUntilExpiry, 'ms');

      expirationTimerRef.current = setTimeout(async () => {
        console.debug('Code share request expired, updating status to expired', request.id);
        try {
          await codeShareManager.expireCodeShareRequest(request.id);
          // Clear the request and return to idle state
          setCurrentRequest(null);
          setUIState('idle');
        } catch (error) {
          console.error('Failed to expire code share request:', error);
          // Still clear UI even if update fails
          setCurrentRequest(null);
          setUIState('idle');
        }
        expirationTimerRef.current = null;
      }, timeUntilExpiry);
    } else {
      // Request already expired
      console.debug('Code share request already expired', request.id);
      codeShareManager.expireCodeShareRequest(request.id).catch(error => {
        console.error('Failed to expire already-expired code share request:', error);
      });
      setCurrentRequest(null);
      setUIState('idle');
    }
  }, [clearExpirationTimer, codeShareManager]);

  // Derive UI state from request data
  const deriveUIState = useCallback((request: CodeShareRequest | null): CodeShareUIState => {
    // Check for pending requests
    if (request && request.status === 'pending') {
      // Engineer sent request
      if (request.sender.type === 'engineer' && request.sender.id === userProfile?.id) {
        return 'requesting';
      }
    }

    return 'idle';
  }, [userProfile]);

  // Load initial state
  const loadState = useCallback(async () => {
    const activeRequest = await codeShareManager.getActiveCodeShareRequest();

    setCurrentRequest(activeRequest || null);
    setUIState(deriveUIState(activeRequest || null));

    // Set expiration timer if there's a pending request
    if (activeRequest && activeRequest.status === 'pending') {
      setExpirationTimer(activeRequest);
    }
  }, [codeShareManager, deriveUIState, setExpirationTimer]);

  // Initialize state on mount and when manager changes
  useEffect(() => {
    loadState();

    // Cleanup timer on unmount
    return () => {
      clearExpirationTimer();
    };
  }, [loadState, clearExpirationTimer]);

  // Listen for code share request events
  // Memoize callbacks to prevent listener restart on every render
  const listenerCallbacks = useMemo(() => ({
    onCodeShareRequestCreated: (request: CodeShareRequest) => {
      setCurrentRequest(request);
      setUIState(deriveUIState(request));

      // Set expiration timer for pending requests
      if (request.status === 'pending') {
        setExpirationTimer(request);
      }
    },

    onCodeShareRequestUpdated: (request: CodeShareRequest) => {
      setCurrentRequest(request);
      setUIState(deriveUIState(request));

      // Clear timer if request is no longer pending
      if (request.status !== 'pending') {
        clearExpirationTimer();
      } else {
        // Reset timer for pending requests (in case expiry time changed)
        setExpirationTimer(request);
      }
    },

    onProjectRepositoryCreated: async (repository: ProjectRepository) => {
      // Reload repository URL when a new repository is created for this customer
      if (customer && userProfile && repository.customerId === customer.id) {
        try {
          // Check if this engineer is a collaborator on the new repository
          const collaborator = await codeShareManager.getCollaboratorByRepositoryAndEngineer(
            repository.id,
            userProfile.id
          );

          // If engineer is an active collaborator, show the repository URL
          if (collaborator && !collaborator.removedAt) {
            setRepositoryUrl(repository.githubRepoUrl);
          }
        } catch (error) {
          console.error('Failed to check collaborator status after repository creation:', error);
        }
      }
    },

    onRepositoryCollaboratorCreated: async (collaborator: RepositoryCollaborator) => {
      // If this engineer was added as a collaborator, show the repository URL
      if (collaborator.engineerId === userProfile?.id && !collaborator.removedAt) {
        try {
          const repositories = await codeShareManager.getRepositoriesForCustomer(customer?.id || '');
          const repository = repositories.find(repo => repo.id === collaborator.repositoryId);

          if (repository) {
            setRepositoryUrl(repository.githubRepoUrl);
          }
        } catch (error) {
          console.error('Failed to load repository URL after being added as collaborator:', error);
        }
      }
    },

    onRepositoryCollaboratorUpdated: (collaborator: RepositoryCollaborator) => {
      // If this engineer's collaborator access was removed, clear the repository URL
      if (collaborator.engineerId === userProfile?.id && collaborator.removedAt) {
        setRepositoryUrl(null);
      }
    },

    onRepositoryCollaboratorDeleted: (collaboratorId: string, engineerId: string) => {
      // If this engineer's collaborator access was deleted, clear the repository URL
      if (engineerId === userProfile?.id) {
        setRepositoryUrl(null);
      }
    }
  }), [deriveUIState, clearExpirationTimer, setExpirationTimer, customer, codeShareManager, userProfile]);

  useCodeShareListener(listenerCallbacks);

  // Listen for repository changes to update the URL when customer shares code
  useEffect(() => {
    const loadRepositoryUrl = async () => {
      if (!customer || !userProfile) {
        console.debug(`useCodeShareState: customer or userProfile empty`)
        setRepositoryUrl(null);
        return;
      }

      try {
        // Fetch repositories for the customer
        const repositories = await codeShareManager.getRepositoriesForCustomer(customer.id);

        console.debug(`useCodeShareState: repositories ${repositories}`)
        // Find a repository where this engineer is an active collaborator
        for (const repository of repositories) {
          const collaborator = await codeShareManager.getCollaboratorByRepositoryAndEngineer(
            repository.id,
            userProfile.id
          );

          // Check if engineer is an active collaborator (not removed)
          console.debug(`useCodeShareState: collaborator ${collaborator} for repository ${repository}}`)
          if (collaborator && !collaborator.removedAt) {
            setRepositoryUrl(repository.githubRepoUrl);
            return;
          }
        }

        // No active collaboration found
        setRepositoryUrl(null);
      } catch (error) {
        console.error('Failed to load repository URL:', error);
        setRepositoryUrl(null);
      }
    };

    loadRepositoryUrl();
  }, [codeShareManager, customer, userProfile]);

  return {
    currentRequest,
    uiState,
    repositoryUrl
  };
};
