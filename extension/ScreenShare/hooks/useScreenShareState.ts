import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { type ScreenShareRequest, type ScreenShareSession } from '@common/types';
import { useScreenShareListener } from '@common/features/ScreenShareManager/hooks';
import { useScreenShareManager } from '@extension/ScreenShare/contexts/ScreenShareManagerContext';
import { useUserProfile } from '@extension/shared/UserProfileContext';

export interface UseScreenShareStateReturn {
  activeRequest: ScreenShareRequest | undefined;
  outgoingRequest: ScreenShareRequest | undefined;
  acceptedRequest: ScreenShareRequest | undefined;
  activeSession: ScreenShareSession | undefined;
  refreshState: () => void;
}

export const useScreenShareState = (ticketId: string): UseScreenShareStateReturn => {
  const [activeRequest, setActiveRequest] = useState<ScreenShareRequest | undefined>();
  const [outgoingRequest, setOutgoingRequest] = useState<ScreenShareRequest | undefined>();
  const [acceptedRequest, setAcceptedRequest] = useState<ScreenShareRequest | undefined>();
  const [activeSession, setActiveSession] = useState<ScreenShareSession | undefined>();
  const { createScreenShareManager } = useScreenShareManager();
  const { customerProfile } = useUserProfile();
  const expirationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const outgoingExpirationTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Function to clear outgoing expiration timer
  const clearOutgoingExpirationTimer = useCallback(() => {
    if (outgoingExpirationTimerRef.current) {
      clearTimeout(outgoingExpirationTimerRef.current);
      outgoingExpirationTimerRef.current = null;
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

  // Function to set expiration timer for outgoing request
  const setOutgoingExpirationTimer = useCallback((request: ScreenShareRequest) => {
    clearOutgoingExpirationTimer();

    const now = new Date();
    const timeUntilExpiry = request.expiresAt.getTime() - now.getTime();

    if (timeUntilExpiry > 0) {
      console.debug('useScreenShareState: Setting outgoing expiration timer for', timeUntilExpiry, 'ms');
      outgoingExpirationTimerRef.current = setTimeout(() => {
        console.debug('useScreenShareState: Outgoing request expired, hiding calling state');
        setOutgoingRequest(undefined);
      }, timeUntilExpiry);
    } else {
      // Request already expired, hide immediately
      console.debug('useScreenShareState: Outgoing request already expired');
      setOutgoingRequest(undefined);
    }
  }, [clearOutgoingExpirationTimer]);

  // Function to refresh state from storage
  const refreshState = useCallback(() => {
    console.debug('useScreenShareState: Refreshing state for ticket', ticketId);
    try {
      screenShareManager.reload();

      const request = screenShareManager.getActiveRequest();
      const session = screenShareManager.getActiveSession();
      console.debug('useScreenShareState: Retrieved request from manager:', request);
      console.debug('useScreenShareState: Retrieved session from manager:', session);

      // Check for active session first (highest priority)
      if (session && session.status === 'active') {
        console.debug('useScreenShareState: Found active session, clearing request UI');
        setActiveSession(session);
        setActiveRequest(undefined);
        setOutgoingRequest(undefined);
        setAcceptedRequest(undefined);
        clearExpirationTimer();
        clearOutgoingExpirationTimer();
      } else {
        // No active session, clear it
        setActiveSession(undefined);

        if (request) {
          console.debug('Request', request);
          // Determine if this is an incoming, outgoing, or accepted request
          if (request.sender.type === 'engineer' && request.receiver.id === customerProfile.id) {
            if (request.status === 'pending') {
              // Incoming pending request (engineer to customer)
              setActiveRequest(request);
              setExpirationTimer(request);
              setOutgoingRequest(undefined);
              setAcceptedRequest(undefined);
              clearOutgoingExpirationTimer();
            } else if (request.status === 'accepted') {
              console.debug('Accepted engineer request - ');
              setAcceptedRequest(undefined);
              setActiveRequest(undefined);
              setOutgoingRequest(undefined);
              clearExpirationTimer();
              clearOutgoingExpirationTimer();
            } else {
              // Other statuses (rejected, expired, etc.)
              setActiveRequest(undefined);
              setOutgoingRequest(undefined);
              setAcceptedRequest(undefined);
              clearExpirationTimer();
              clearOutgoingExpirationTimer();
            }
          } else if (request.sender.id === customerProfile.id) {
            // Outgoing request (customer to engineer) - only show "Calling.." if still pending
            if (request.status === 'pending') {
              setOutgoingRequest(request);
              setOutgoingExpirationTimer(request);
              setActiveRequest(undefined);
              setAcceptedRequest(undefined);
              clearExpirationTimer();
            } else if (request.status === 'accepted') {
              console.debug('Accepted engineer request - ');
              setAcceptedRequest(request);
              setActiveRequest(undefined);
              setOutgoingRequest(undefined);
              clearExpirationTimer();
              clearOutgoingExpirationTimer();
            }
          } else {
            // Request not relevant for UI state (e.g., customer request that's no longer pending)
            setActiveRequest(undefined);
            setOutgoingRequest(undefined);
            setAcceptedRequest(undefined);
            clearExpirationTimer();
            clearOutgoingExpirationTimer();
          }
        } else {
          // No active request
          setActiveRequest(undefined);
          setOutgoingRequest(undefined);
          setAcceptedRequest(undefined);
          clearExpirationTimer();
          clearOutgoingExpirationTimer();
        }
      }
    } catch (error) {
      console.error('Failed to refresh screen share state:', error);
    }
  }, [screenShareManager, ticketId, customerProfile.id, setExpirationTimer, clearExpirationTimer, setOutgoingExpirationTimer, clearOutgoingExpirationTimer]);

  // Load initial state
  useEffect(() => {
    console.debug('useScreenShareState: Initial load for ticket:', ticketId);
    refreshState();
  }, [refreshState, ticketId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearExpirationTimer();
      clearOutgoingExpirationTimer();
    };
  }, [clearExpirationTimer, clearOutgoingExpirationTimer]);

  // Store refs for stable callbacks
  const ticketIdRef = useRef(ticketId);
  const refreshStateRef = useRef(refreshState);

  // Update refs on every render
  ticketIdRef.current = ticketId;
  refreshStateRef.current = refreshState;

  // Memoize the callbacks to prevent ScreenShareListener recreation
  const screenShareListenerCallbacks = useMemo(() => {
    console.debug('useScreenShareState: Creating listener callbacks for ticket:', ticketId);
    return {
    onScreenShareRequestCreated: (request: ScreenShareRequest) => {
      screenShareManager.reload();
      console.debug('useScreenShareState: Screen share request created', request.id, 'for ticket', request.ticketId);
      // Only refresh if it's for our ticket
      if (request.ticketId === ticketIdRef.current) {
        console.debug('useScreenShareState: Refreshing state due to new request for our ticket');
        refreshStateRef.current();
      } else {
        console.debug('useScreenShareState: Ignoring request for different ticket:', request.ticketId, 'vs our ticket:', ticketIdRef.current);
      }
    },
    onScreenShareRequestUpdated: async (request: ScreenShareRequest) => {
      screenShareManager.reload();
      console.debug('useScreenShareState: Screen share request updated', request, 'for ticket', request.ticketId);
      // Only refresh if it's for our ticket
      if (request.ticketId === ticketIdRef.current) {
        console.debug('useScreenShareState: Refreshing state due to updated request for our ticket');
        refreshStateRef.current();
      } else {
        console.debug('useScreenShareState: Ignoring updated request for different ticket:', request.ticketId, 'vs our ticket:', ticketIdRef.current);
      }
    },
    onScreenShareSessionCreated: async (session: ScreenShareSession) => {
      screenShareManager.reload();
      console.debug('useScreenShareState: Screen share session created', session.id, 'for ticket', session.ticketId);
      // Only handle sessions for our ticket
      if (session.ticketId === ticketIdRef.current) {
        console.debug('useScreenShareState: Initializing WebRTC connection for session:', session.id);
        try {
          // If we're the publisher (customer), session already includes publishing
          if (session.publisher.id === customerProfile.id) {
            console.debug('useScreenShareState: Customer is publisher, session already includes stream');
          }

          refreshStateRef.current();
        } catch (error) {
          console.error('useScreenShareState: Failed to initialize WebRTC connection:', error);
        }
      } else {
        console.debug('useScreenShareState: Ignoring session for different ticket:', session.ticketId, 'vs our ticket:', ticketIdRef.current);
      }
    },
    onScreenShareSessionUpdated: async (session: ScreenShareSession) => {
      screenShareManager.reload();
      console.debug('useScreenShareState: Screen share session updated', session.id, 'for ticket', session.ticketId, 'status:', session.status);
      // Only handle sessions for our ticket
      if (session.ticketId === ticketIdRef.current) {
        // Handle connection loss scenarios - immediate reset for both disconnected and error
        if (session.status === 'disconnected' || session.status === 'error') {
          console.debug('Extension: Screen share connection lost or failed:', session.id, 'status:', session.status);

          // Reset manager and UI immediately
          screenShareManager.reset();
          screenShareManager.reload();
          refreshStateRef.current();
          return;
        }

        console.debug('useScreenShareState: Refreshing state due to session update for our ticket');
        refreshStateRef.current();
      } else {
        console.debug('useScreenShareState: Ignoring session update for different ticket:', session.ticketId, 'vs our ticket:', ticketIdRef.current);
      }
    },
    onScreenShareSessionEnded: async (session: ScreenShareSession) => {
      screenShareManager.reload();
      console.debug('useScreenShareState: Screen share session ended', session.id, 'for ticket', session.ticketId);
      // Only handle sessions for our ticket
      if (session.ticketId === ticketIdRef.current) {
        screenShareManager.reset();
        console.debug('useScreenShareState: Session ended, refreshing state');
        refreshStateRef.current();
      } else {
        console.debug('useScreenShareState: Ignoring ended session for different ticket:', session.ticketId, 'vs our ticket:', ticketIdRef.current);
      }
    }
  };
  }, [screenShareManager, customerProfile, ticketId]); // Include dependencies for the new callback

  // Listen for real-time ScreenShare events
  useScreenShareListener(screenShareListenerCallbacks);

  return {
    activeRequest,
    outgoingRequest,
    acceptedRequest,
    activeSession,
    refreshState
  };
};