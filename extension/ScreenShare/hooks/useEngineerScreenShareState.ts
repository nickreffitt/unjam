import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { type ScreenShareRequest, type ScreenShareSession } from '@common/types';
import { useScreenShareListener } from '@common/features/ScreenShareManager/hooks';
import { useScreenShareManager } from '@extension/ScreenShare/contexts/ScreenShareManagerContext';

export interface UseEngineerScreenShareStateReturn {
  incomingRequest: ScreenShareRequest | undefined;
  activeSession: ScreenShareSession | undefined;
  remoteStream: MediaStream | null;
  setRemoteStream: (stream: MediaStream | null) => void;
}

/**
 * Hook for managing engineer-side screen share state (incoming requests, active sessions)
 * Follows the same pattern as useTicketState for consistency
 */
export const useEngineerScreenShareState = (
  ticketId: string,
  activeTicket?: any
): UseEngineerScreenShareStateReturn => {
  const [incomingRequest, setIncomingRequest] = useState<ScreenShareRequest | undefined>();
  const [activeSession, setActiveSession] = useState<ScreenShareSession | undefined>();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const { createScreenShareManager } = useScreenShareManager();
  const expirationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs for stable callbacks
  const ticketIdRef = useRef(ticketId);
  ticketIdRef.current = ticketId;

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
      console.debug('useEngineerScreenShareState: Setting expiration timer for', timeUntilExpiry, 'ms');
      expirationTimerRef.current = setTimeout(() => {
        console.debug('useEngineerScreenShareState: Request expired, clearing UI');
        setIncomingRequest(undefined);
      }, timeUntilExpiry);
    } else {
      console.debug('useEngineerScreenShareState: Request already expired');
      setIncomingRequest(undefined);
    }
  }, [clearExpirationTimer]);

  // Load initial state from storage
  useEffect(() => {
    const loadInitialState = () => {
      try {
        const screenShareManager = createScreenShareManager(ticketId);

        // Check for incoming requests
        const activeRequest = screenShareManager.getActiveRequest();
        if (activeRequest &&
            activeRequest.sender.type === 'customer' &&
            activeRequest.status === 'pending') {
          console.debug('useEngineerScreenShareState: Found incoming customer request:', activeRequest.id);
          setIncomingRequest(activeRequest);
          setExpirationTimer(activeRequest);
        }

        // Check for active sessions
        const activeSessionData = screenShareManager.getActiveSession();
        if (activeSessionData && activeSessionData.status === 'active') {
          console.debug('useEngineerScreenShareState: Found active session:', activeSessionData.id);
          setActiveSession(activeSessionData);
        }
      } catch (error) {
        console.error('useEngineerScreenShareState: Error loading initial state:', error);
      }
    };

    loadInitialState();
  }, [ticketId, createScreenShareManager, setExpirationTimer]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      clearExpirationTimer();
    };
  }, [clearExpirationTimer]);

  // Handle incoming screen share request events
  const handleScreenShareRequestCreated = useCallback((request: ScreenShareRequest) => {
    // Only handle customer-initiated requests for our ticket
    if (request.ticketId === ticketIdRef.current &&
        request.sender.type === 'customer' &&
        request.status === 'pending') {
      console.debug('useEngineerScreenShareState: Incoming customer request created:', request.id);
      setIncomingRequest(request);
      setExpirationTimer(request);
    }
  }, [setExpirationTimer]);

  const handleScreenShareRequestUpdated = useCallback((request: ScreenShareRequest) => {
    // Clear incoming request if it's no longer pending
    if (incomingRequest?.id === request.id && request.status !== 'pending') {
      console.debug('useEngineerScreenShareState: Request no longer pending, clearing UI:', request.id);
      setIncomingRequest(undefined);
      clearExpirationTimer();
    }
  }, [incomingRequest?.id, clearExpirationTimer]);

  const handleScreenShareSessionCreated = useCallback((session: ScreenShareSession) => {
    // Handle sessions for our ticket
    if (session.ticketId === ticketIdRef.current && session.status === 'active') {
      console.debug('useEngineerScreenShareState: Active session created:', session.id);
      setActiveSession(session);
    }
  }, []);

  const handleScreenShareSessionUpdated = useCallback(async (session: ScreenShareSession) => {
    // Update or clear active session
    if (activeSession?.id === session.id) {
      if (session.status === 'active') {
        setActiveSession(session);
      } else {
        console.debug('useEngineerScreenShareState: Session no longer active, clearing:', session.id);
        setActiveSession(undefined);
        setRemoteStream(null);
      }
    } else if (session.ticketId === ticketIdRef.current && session.status === 'active') {
      // Handle new active sessions for our ticket
      console.debug('useEngineerScreenShareState: New active session detected:', session.id);
      setActiveSession(session);

      // Auto-subscribe if we're the engineer (subscriber)
      if (activeTicket?.assignedTo && session.subscriber.id === activeTicket.assignedTo.id) {
        console.debug('useEngineerScreenShareState: Engineer should auto-subscribe to active session:', session.id);

        try {
          const screenShareManager = createScreenShareManager(ticketIdRef.current);

          // Subscribe to stream (remote stream will be handled via events)
          await screenShareManager.subscribeToStream(session.id);
          console.debug('useEngineerScreenShareState: Engineer auto-subscribed to stream successfully');

          // Check if stream is immediately available
          const stream = screenShareManager.getRemoteStream();
          if (stream) {
            console.debug('useEngineerScreenShareState: Got remote stream immediately:', stream.id);
            setRemoteStream(stream);
          }
        } catch (error) {
          console.error('useEngineerScreenShareState: Error auto-subscribing to stream:', error);
        }
      }
    }
  }, [activeSession?.id, activeTicket?.assignedTo, createScreenShareManager]);

  // Handle remote stream availability event
  const handleScreenShareRemoteStreamAvailable = useCallback((sessionId: string, ticketId: string) => {
    if (ticketId === ticketIdRef.current && activeSession?.id === sessionId) {
      console.debug('useEngineerScreenShareState: Remote stream available event received:', sessionId);

      // Get the stream from the manager
      const screenShareManager = createScreenShareManager(ticketIdRef.current);
      const stream = screenShareManager.getRemoteStream();

      if (stream) {
        console.debug('useEngineerScreenShareState: Got remote stream from manager:', stream.id);
        setRemoteStream(stream);
      }
    }
  }, [activeSession?.id, createScreenShareManager]);

  // Memoize the callbacks object to prevent recreating the listener
  const screenShareListenerCallbacks = useMemo(() => ({
    onScreenShareRequestCreated: handleScreenShareRequestCreated,
    onScreenShareRequestUpdated: handleScreenShareRequestUpdated,
    onScreenShareSessionCreated: handleScreenShareSessionCreated,
    onScreenShareSessionUpdated: handleScreenShareSessionUpdated,
    onScreenShareRemoteStreamAvailable: handleScreenShareRemoteStreamAvailable
  }), [
    handleScreenShareRequestCreated,
    handleScreenShareRequestUpdated,
    handleScreenShareSessionCreated,
    handleScreenShareSessionUpdated,
    handleScreenShareRemoteStreamAvailable
  ]);

  // Listen for real-time ScreenShare events
  useScreenShareListener(screenShareListenerCallbacks);

  return {
    incomingRequest,
    activeSession,
    remoteStream,
    setRemoteStream
  };
};