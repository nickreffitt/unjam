import { useCallback } from 'react';
import { type ScreenShareRequest, type ScreenShareSession } from '@common/types';
import { useScreenShareManager } from '@extension/ScreenShare/contexts/ScreenShareManagerContext';

export interface UseEngineerScreenShareActionsReturn {
  handleAcceptCustomerRequest: () => void;
  handleRejectCustomerRequest: () => void;
  handleSubscribeToStream: () => void;
  handleRequestScreenShare: () => void;
}

/**
 * Hook for managing engineer-side screen share actions (accept/reject requests, subscribe to streams)
 * Follows the same pattern as useTicketActions for consistency
 */
export const useEngineerScreenShareActions = (
  ticketId: string,
  incomingRequest: ScreenShareRequest | undefined,
  activeSession: ScreenShareSession | undefined,
  customerProfile: any,
  engineerProfile: any,
  onScreenShareRefresh?: () => void
): UseEngineerScreenShareActionsReturn => {
  const { createScreenShareManager } = useScreenShareManager();

  const handleAcceptCustomerRequest = useCallback(() => {
    if (!incomingRequest) {
      console.warn('No incoming request to accept');
      return;
    }

    (async () => {
      try {
        console.debug('Engineer accepting customer screenshare request:', incomingRequest.id);

        const screenShareManager = createScreenShareManager(ticketId);

        // For customer-initiated requests, the engineer is the receiver
        const engineerProfile = incomingRequest.receiver;

        const updatedRequest = screenShareManager.respondToRequest(incomingRequest, 'accepted', engineerProfile);
        console.debug('Customer request accepted, updated request:', updatedRequest);

        // Reload the ScreenShareManager to sync with the updated request in localStorage
        screenShareManager.reload();

      } catch (error) {
        console.error('Failed to accept customer screenshare request:', error);
      }
    })();
  }, [ticketId, createScreenShareManager, incomingRequest]);

  const handleRejectCustomerRequest = useCallback(() => {
    if (!incomingRequest) {
      console.warn('No incoming request to reject');
      return;
    }

    (async () => {
      try {
        console.debug('Engineer rejecting customer screenshare request:', incomingRequest.id);

        const screenShareManager = createScreenShareManager(ticketId);

        // For customer-initiated requests, the engineer is the receiver
        const engineerProfile = incomingRequest.receiver;

        const updatedRequest = screenShareManager.respondToRequest(incomingRequest, 'rejected', engineerProfile);
        console.debug('Customer request rejected, updated request:', updatedRequest);

        // Reload the ScreenShareManager to sync with the updated request in localStorage
        screenShareManager.reload();

      } catch (error) {
        console.error('Failed to reject customer screenshare request:', error);
      }
    })();
  }, [ticketId, createScreenShareManager, incomingRequest]);

  const handleSubscribeToStream = useCallback(() => {
    if (!activeSession) {
      console.warn('No active session to subscribe to');
      return;
    }

    (async () => {
      try {
        console.debug('Engineer subscribing to stream for session:', activeSession.id);

        const screenShareManager = createScreenShareManager(ticketId);

        // Subscribe to the stream (remote stream will be handled via events)
        await screenShareManager.subscribeToStream(activeSession.id);
        console.debug('Engineer subscribed to stream successfully');

        // Reload the ScreenShareManager to sync state
        screenShareManager.reload();

      } catch (error) {
        console.error('Failed to subscribe to stream:', error);
      }
    })();
  }, [ticketId, createScreenShareManager, activeSession]);

  const handleRequestScreenShare = useCallback(() => {
    if (!engineerProfile) {
      console.warn('No engineer profile available for screenshare request');
      return;
    }

    if (!customerProfile) {
      console.warn('No customer profile available for screenshare request');
      return;
    }

    (async () => {
      try {
        console.debug('Debug: Engineer requests screenshare');

        const screenShareManager = createScreenShareManager(ticketId);
        screenShareManager.requestScreenShare(engineerProfile, customerProfile);
        console.debug('Debug: Screenshare request created');

        // Reload the ScreenShareManager to sync with the new request in localStorage
        screenShareManager.reload();
        console.debug('Debug: ScreenShareManager reloaded');

        // Trigger external refresh callbacks
        if (onScreenShareRefresh) {
          onScreenShareRefresh();
          console.debug('Debug: ScreenShare component state refreshed');
        }

      } catch (error) {
        console.error('Debug: Failed to create screenshare request:', error);
      }
    })();
  }, [ticketId, createScreenShareManager, engineerProfile, customerProfile, onScreenShareRefresh]);

  return {
    handleAcceptCustomerRequest,
    handleRejectCustomerRequest,
    handleSubscribeToStream,
    handleRequestScreenShare
  };
};