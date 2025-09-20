import { useCallback, useRef } from 'react';
import { type UserProfile, type ScreenShareRequest } from '@common/types';
import { useScreenShareManager } from '@extension/ScreenShare/contexts/ScreenShareManagerContext';

export interface UseScreenShareActionsReturn {
  handleAcceptRequest: (request: ScreenShareRequest, onSessionStarted?: () => void) => Promise<void>;
  handleRejectRequest: (request: ScreenShareRequest) => void;
  handleScreenShareClick: () => Promise<void>;
}

export const useScreenShareActions = (
  ticketId: string,
  customerProfile: UserProfile,
  engineerProfile: UserProfile | undefined,
  refreshState: () => void,
  onCustomerRequestCreated?: () => void
): UseScreenShareActionsReturn => {
  const { createScreenShareManager } = useScreenShareManager();

  // Use refs to access current values in stable callbacks (same pattern as ChatBox)
  const ticketIdRef = useRef(ticketId);
  const customerProfileRef = useRef(customerProfile);
  const engineerProfileRef = useRef(engineerProfile);
  const refreshStateRef = useRef(refreshState);
  const createScreenShareManagerRef = useRef(createScreenShareManager);
  const onCustomerRequestCreatedRef = useRef(onCustomerRequestCreated);

  // Update refs on every render
  ticketIdRef.current = ticketId;
  customerProfileRef.current = customerProfile;
  engineerProfileRef.current = engineerProfile;
  refreshStateRef.current = refreshState;
  createScreenShareManagerRef.current = createScreenShareManager;
  onCustomerRequestCreatedRef.current = onCustomerRequestCreated;

  const handleAcceptRequest = useCallback(async (request: ScreenShareRequest, onSessionStarted?: () => void) => {
    console.debug('Accepting screenshare request:', request.id);
    try {
      const screenShareManager = createScreenShareManagerRef.current(ticketIdRef.current);

      // First, respond to the request to mark it as accepted
      screenShareManager.respondToRequest(request, 'accepted', customerProfileRef.current);
      console.debug('Screenshare request accepted');

      // Immediately start the session after accepting
      // For engineer-initiated requests: customer publishes, engineer subscribes
      if (request.sender.type === 'engineer' && engineerProfileRef.current) {
        console.debug('Starting session for accepted engineer request:', request.id);

        await screenShareManager.startSession(
          request.id,
          customerProfileRef.current,   // publisher (customer shares screen)
          engineerProfileRef.current    // subscriber (engineer views)
        );

        console.debug('Screen share session started with automatic publishing after accepting engineer request');

        // Notify parent that session has started (for same-tab updates)
        if (onSessionStarted) {
          console.debug('Notifying parent that session has started');
          onSessionStarted();
        }
      }

      // Reload the ScreenShareManager to sync with the updated request/session in localStorage
      screenShareManager.reload();
    } catch (error) {
      console.error('Failed to accept screenshare request:', error);
    }
  }, []); // Empty dependency array - stable callback

  const handleRejectRequest = useCallback((request: ScreenShareRequest) => {
    console.debug('Rejecting screenshare request:', request.id);
    try {
      const screenShareManager = createScreenShareManagerRef.current(ticketIdRef.current);
      screenShareManager.respondToRequest(request, 'rejected', customerProfileRef.current);
      console.debug('Screenshare request rejected');

      // Reload the ScreenShareManager to sync with the updated request in localStorage
      screenShareManager.reload();
    } catch (error) {
      console.error('Failed to reject screenshare request:', error);
    }
  }, []); // Empty dependency array - stable callback

  const handleScreenShareClick = useCallback(async () => {
    console.debug('Customer-initiated screenshare button clicked');

    // Check if we have an engineer to call
    if (!engineerProfileRef.current) {
      console.warn('No engineer profile available for screenshare request');
      return;
    }

    try {
      const screenShareManager = createScreenShareManagerRef.current(ticketIdRef.current);

      // First, check if there's already an accepted request from the engineer
      const activeRequest = screenShareManager.getActiveRequest();

      if (activeRequest &&
          activeRequest.status === 'accepted' &&
          activeRequest.sender.type === 'engineer' &&
          activeRequest.receiver.type === 'customer') {
        // Engineer has already requested and it's been accepted, start the session directly
        console.debug('Found accepted engineer request, starting session directly:', activeRequest.id);

        await screenShareManager.startSession(
          activeRequest.id,
          customerProfileRef.current,   // publisher (customer shares screen)
          engineerProfileRef.current    // subscriber (engineer views)
        );

        console.debug('Screen share session started with automatic publishing from accepted engineer request');
      } else {
        // No accepted engineer request, create a new customer-initiated request
        console.debug('No accepted engineer request found, creating customer-initiated request');

        screenShareManager.startCall(
          customerProfileRef.current,  // sender (customer)
          engineerProfileRef.current   // receiver (engineer)
        );

        console.debug('Customer-initiated screenshare request created');

        // Notify parent component that a customer request was created
        if (onCustomerRequestCreatedRef.current) {
          onCustomerRequestCreatedRef.current();
        }
      }

      // Reload the ScreenShareManager to sync with the updated request/session
      screenShareManager.reload();

      // Directly refresh the current tab
      refreshStateRef.current();
    } catch (error) {
      console.error('Failed to handle customer screenshare click:', error);
    }
  }, []); // Empty dependency array - stable callback

  return {
    handleAcceptRequest,
    handleRejectRequest,
    handleScreenShareClick
  };
};