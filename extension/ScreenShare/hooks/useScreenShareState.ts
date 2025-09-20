import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { type ScreenShareRequest, type ScreenShareSession } from '@common/types';
import { useScreenShareListener } from '@common/features/ScreenShareManager/hooks';
import { useScreenShareManager } from '@extension/ScreenShare/contexts/ScreenShareManagerContext';
import { useUserProfile } from '@extension/shared/UserProfileContext';

export interface UseScreenShareStateReturn {
  activeRequest: ScreenShareRequest | undefined;
  refreshState: () => void;
}

export const useScreenShareState = (ticketId: string): UseScreenShareStateReturn => {
  const [activeRequest, setActiveRequest] = useState<ScreenShareRequest | undefined>();
  const { createScreenShareManager } = useScreenShareManager();
  const { customerProfile } = useUserProfile();
  const expirationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Create ScreenShareManager instance for this ticket (memoized to prevent re-creation)
  const screenShareManager = useMemo(() => {
    console.debug('useScreenShareState: Creating ScreenShareManager for ticket:', ticketId);
    return createScreenShareManager(ticketId);
  }, [createScreenShareManager, ticketId]);

  // Function to clear existing expiration timer
  const clearExpirationTimer = useCallback(() => {
    if (expirationTimerRef.current) {
      clearTimeout(expirationTimerRef.current);
      expirationTimerRef.current = null;
    }
  }, []);

  // Function to set expiration timer for a request
  const setExpirationTimer = useCallback((request: ScreenShareRequest) => {
    clearExpirationTimer();

    const now = new Date();
    const timeUntilExpiry = request.expiresAt.getTime() - now.getTime();

    if (timeUntilExpiry > 0) {
      console.debug('useScreenShareState: Setting expiration timer for', timeUntilExpiry, 'ms');
      expirationTimerRef.current = setTimeout(() => {
        console.debug('useScreenShareState: Request expired, hiding UI');
        setActiveRequest(undefined);
      }, timeUntilExpiry);
    } else {
      // Request already expired, hide immediately
      console.debug('useScreenShareState: Request already expired');
      setActiveRequest(undefined);
    }
  }, [clearExpirationTimer]);

  // Function to refresh state from storage
  const refreshState = useCallback(() => {
    console.debug('useScreenShareState: Refreshing state for ticket', ticketId);
    try {
      const request = screenShareManager.getActiveRequest();
      console.debug('useScreenShareState: Retrieved request from manager:', request);
      setActiveRequest(request);

      // Set expiration timer if we have a request
      if (request) {
        setExpirationTimer(request);
      } else {
        clearExpirationTimer();
      }
    } catch (error) {
      console.error('Failed to refresh screen share state:', error);
    }
  }, [screenShareManager, ticketId, setExpirationTimer, clearExpirationTimer]);

  // Load initial state
  useEffect(() => {
    console.debug('useScreenShareState: Initial load for ticket:', ticketId);
    refreshState();
  }, [refreshState, ticketId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearExpirationTimer();
    };
  }, [clearExpirationTimer]);

  // Store refs for stable callbacks
  const ticketIdRef = useRef(ticketId);
  const refreshStateRef = useRef(refreshState);

  // Update refs on every render
  ticketIdRef.current = ticketId;
  refreshStateRef.current = refreshState;

  // Memoize the callbacks to prevent ScreenShareListener recreation
  const screenShareListenerCallbacks = useMemo(() => ({
    onScreenShareRequestCreated: (request: ScreenShareRequest) => {
      console.debug('useScreenShareState: Screen share request created', request.id, 'for ticket', request.ticketId);
      // Only refresh if it's for our ticket
      if (request.ticketId === ticketIdRef.current) {
        console.debug('useScreenShareState: Refreshing state due to new request for our ticket');
        refreshStateRef.current();
      } else {
        console.debug('useScreenShareState: Ignoring request for different ticket:', request.ticketId, 'vs our ticket:', ticketIdRef.current);
      }
    },
    onScreenShareRequestUpdated: (request: ScreenShareRequest) => {
      console.debug('useScreenShareState: Screen share request updated', request.id, 'for ticket', request.ticketId);
      // Only refresh if it's for our ticket
      if (request.ticketId === ticketIdRef.current) {
        console.debug('useScreenShareState: Refreshing state due to updated request for our ticket');
        refreshStateRef.current();
      } else {
        console.debug('useScreenShareState: Ignoring updated request for different ticket:', request.ticketId, 'vs our ticket:', ticketIdRef.current);
      }
    },
    onScreenShareSessionCreated: async (session: ScreenShareSession) => {
      console.debug('useScreenShareState: Screen share session created', session.id, 'for ticket', session.ticketId);
      // Only handle sessions for our ticket
      if (session.ticketId === ticketIdRef.current) {
        console.debug('useScreenShareState: Initializing WebRTC connection for session:', session.id);
        try {
          const manager = screenShareManager;

          // If we're the publisher (customer), start publishing
          if (session.publisher.id === customerProfile.id) {
            console.debug('useScreenShareState: Customer is publisher, starting screen capture');
            await manager.publishStream(session.id);
            console.debug('useScreenShareState: WebRTC connection initialized successfully, publishing stream');
          }

          refreshStateRef.current();
        } catch (error) {
          console.error('useScreenShareState: Failed to initialize WebRTC connection:', error);
        }
      } else {
        console.debug('useScreenShareState: Ignoring session for different ticket:', session.ticketId, 'vs our ticket:', ticketIdRef.current);
      }
    }
  }), [screenShareManager, customerProfile]); // Include dependencies for the new callback

  // Listen for real-time ScreenShare events
  useScreenShareListener(screenShareListenerCallbacks);

  return {
    activeRequest,
    refreshState
  };
};