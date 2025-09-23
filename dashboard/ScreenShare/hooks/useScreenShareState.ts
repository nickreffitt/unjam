import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ScreenShareRequest, ScreenShareSession } from '@common/types';
import { useScreenShareManager } from '@dashboard/ScreenShare/contexts/ScreenShareManagerContext';
import { useScreenShareListener } from '@common/features/ScreenShareManager/hooks';
import { useUserProfile } from '@dashboard/shared/UserProfileContext';

export type ScreenShareUIState =
  | 'idle'              // No request or session
  | 'requesting'        // Engineer sent request, waiting for customer response
  | 'incoming_call'     // Customer initiated call, waiting for engineer response
  | 'active_session'    // Screen share session is active
  | 'loading';          // Request accepted, setting up session

export interface UseScreenShareStateReturn {
  currentRequest: ScreenShareRequest | null;
  currentSession: ScreenShareSession | null;
  remoteStream: MediaStream | null;
  uiState: ScreenShareUIState;
}

export const useScreenShareState = (ticketId: string): UseScreenShareStateReturn => {
  const { createScreenShareManager, clearManagerCache } = useScreenShareManager();
  const { engineerProfile } = useUserProfile();
  const [currentRequest, setCurrentRequest] = useState<ScreenShareRequest | null>(null);
  const [currentSession, setCurrentSession] = useState<ScreenShareSession | null>(null);
  const [uiState, setUIState] = useState<ScreenShareUIState>('idle');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const expirationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const screenShareManager = useMemo(() => {
    return createScreenShareManager(ticketId);
  }, [createScreenShareManager, ticketId]);

  // Clear any existing expiration timer
  const clearExpirationTimer = useCallback(() => {
    if (expirationTimerRef.current) {
      clearTimeout(expirationTimerRef.current);
      expirationTimerRef.current = null;
    }
  }, []);

  // Set expiration timer for a pending request
  const setExpirationTimer = useCallback((request: ScreenShareRequest) => {
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
      console.debug('Setting expiration timer for request', request.id, 'expires in', timeUntilExpiry, 'ms');

      expirationTimerRef.current = setTimeout(() => {
        console.debug('Request expired', request.id);
        // Clear the request and return to idle state
        setCurrentRequest(null);
        setUIState('idle');
        expirationTimerRef.current = null;
      }, timeUntilExpiry);
    } else {
      // Request already expired
      console.debug('Request already expired', request.id);
      setCurrentRequest(null);
      setUIState('idle');
    }
  }, [clearExpirationTimer]);

  // Derive UI state from request and session data
  const deriveUIState = useCallback((request: ScreenShareRequest | null, session: ScreenShareSession | null): ScreenShareUIState => {
    // Active session takes priority
    if (session && session.status === 'active') {
      return 'active_session';
    }

    // Loading state when request is accepted but session not yet active
    if (request && request.status === 'accepted') {
      return 'loading';
    }

    // Check for pending requests
    if (request && request.status === 'pending') {
      // Engineer sent request
      if (request.sender.type === 'engineer' && request.sender.id === engineerProfile?.id) {
        return 'requesting';
      }
      // Customer initiated call to this engineer
      if (request.sender.type === 'customer' && request.receiver.id === engineerProfile?.id) {
        return 'incoming_call';
      }
    }

    return 'idle';
  }, [engineerProfile]);

  // Load initial state
  const loadState = useCallback(() => {
    const activeRequest = screenShareManager.getActiveRequest();
    const activeSession = screenShareManager.getActiveSession();

    setCurrentRequest(activeRequest || null);
    setCurrentSession(activeSession || null);
    setUIState(deriveUIState(activeRequest || null, activeSession || null));

    // Set expiration timer if there's a pending request
    if (activeRequest && activeRequest.status === 'pending') {
      setExpirationTimer(activeRequest);
    }
  }, [screenShareManager, deriveUIState, setExpirationTimer]);

  // Initialize state on mount and when manager changes
  useEffect(() => {
    loadState();

    // Cleanup timer on unmount
    return () => {
      clearExpirationTimer();
    };
  }, [loadState, clearExpirationTimer]);

  // Listen for screen share events
  useScreenShareListener({
    onScreenShareRequestCreated: useCallback((request: ScreenShareRequest) => {
      // Reload the manager's data to ensure it has the latest request
      screenShareManager.reload();
      if (request.ticketId === ticketId) {
        // Update local state immediately with the new request
        setCurrentRequest(request);
        setUIState(deriveUIState(request, currentSession));

        // Set expiration timer for pending requests
        if (request.status === 'pending') {
          setExpirationTimer(request);
        }
      }
    }, [ticketId, screenShareManager, deriveUIState, currentSession, setExpirationTimer]),

    onScreenShareRequestUpdated: useCallback((request: ScreenShareRequest) => {
      screenShareManager.reload();
      if (request.ticketId === ticketId) {
        setCurrentRequest(request);
        setUIState(deriveUIState(request, currentSession));

        // Clear timer if request is no longer pending
        if (request.status !== 'pending') {
          clearExpirationTimer();
        } else {
          // Reset timer for pending requests (in case expiry time changed)
          setExpirationTimer(request);
        }
      }
    }, [screenShareManager, ticketId, deriveUIState, currentSession, clearExpirationTimer, setExpirationTimer]),

    onScreenShareSessionCreated: useCallback((session: ScreenShareSession) => {
      screenShareManager.reload();
      if (session.ticketId === ticketId) {
        setCurrentRequest(null);
        setCurrentSession(session);
        setUIState(deriveUIState(currentRequest, session));
        // Clear timer when session starts
        clearExpirationTimer();
      }
    }, [screenShareManager, ticketId, deriveUIState, currentRequest, clearExpirationTimer]),

    onScreenShareSessionUpdated: useCallback((session: ScreenShareSession) => {
      screenShareManager.reload();
      if (session.ticketId === ticketId) {
        setCurrentSession(session);

        if (session.status === 'active') {
          console.debug('Subscribing to stream for session', session);
          screenShareManager.subscribeToStream(session.id);
        }

        setUIState(deriveUIState(currentRequest, session));
      }
    }, [screenShareManager, ticketId, deriveUIState, currentRequest]),

    onScreenShareSessionEnded: useCallback((session: ScreenShareSession) => {
      if (session.ticketId === ticketId) {
        console.debug('Screen share session ended', session.id);
        screenShareManager.dispose();
        screenShareManager.reload();

        // Clear the current session and return to idle state
        setCurrentSession(null);
        setCurrentRequest(null);
        setRemoteStream(null);
        setUIState('idle');

        // Clear any pending request expiration timer
        clearExpirationTimer();
      }
    }, [screenShareManager, ticketId, clearExpirationTimer]),

    onScreenShareReloaded: useCallback((reloadedTicketId: string) => {
      if (reloadedTicketId === ticketId) {
        console.debug("onScreenShareReloaded");
        loadState();
      }
    }, [ticketId, loadState]),

    onScreenShareRemoteStreamAvailable: useCallback((sessionId: string, ticketId: string) => {
      screenShareManager.reload();
      
      console.debug('About to fetch remote stream for sessionId', sessionId, 'ticketId', ticketId);
      const stream = screenShareManager.getRemoteStream();
      if (stream) {
        console.debug('Got remote stream immediately:', stream.id);
        setRemoteStream(stream);
      }

    }, [screenShareManager])

  });

  return {
    currentRequest,
    currentSession,
    uiState,
    remoteStream
  };
};