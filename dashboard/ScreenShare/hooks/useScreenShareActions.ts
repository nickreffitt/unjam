import { useMemo } from 'react';
import type { ScreenShareRequest, UserProfile } from '@common/types';
import { useScreenShareManager } from '@dashboard/ScreenShare/contexts/ScreenShareManagerContext';
import { useUserProfile } from '@dashboard/shared/contexts/AuthManagerContext';

export interface UseScreenShareActionsReturn {
  requestScreenShare: (customer: UserProfile) => void;
  acceptCall: (request: ScreenShareRequest | null) => void;
  rejectCall: (request: ScreenShareRequest | null) => void;
  endSession: () => void;
}

export const useScreenShareActions = (ticketId: string): UseScreenShareActionsReturn => {
  const { createScreenShareManager } = useScreenShareManager();
  const { currentUser } = useUserProfile();

  const screenShareManager = useMemo(() => {
    return createScreenShareManager(ticketId);
  }, [createScreenShareManager, ticketId]);

  const requestScreenShare = (customer: UserProfile) => {
    if (!currentUser || currentUser.type === 'engineer') {
      console.error('No engineer profile available for screen share request');
      return;
    }

    try {
      console.debug('Requesting screen share from customer:', customer.name);
      screenShareManager.requestScreenShare(currentUser, customer);
    } catch (error) {
      console.error('Failed to request screen share:', error);
    }
  };

  const acceptCall = (request: ScreenShareRequest | null) => {
    if (!currentUser || currentUser.type === 'engineer') {
      console.error('No engineer profile available to accept call');
      return;
    }
    if (!request) {
      console.error('Request not found');
      return;
    }

    try {
      console.debug('Accepting incoming screen share call:', request);
      
      screenShareManager.acceptCall(request.id, currentUser);
    } catch (error) {
      console.error('Failed to accept screen share call:', error);
    }
  };

  const rejectCall = (request: ScreenShareRequest | null) => {
    if (!currentUser || currentUser.type === 'engineer') {
      console.error('No engineer profile available to reject call');
      return;
    }
    if (!request) {
      console.error('Request not found');
      return;
    }

    try {
      console.debug('Rejecting incoming screen share call:', request);
      screenShareManager.rejectCall(request?.id, currentUser);
    } catch (error) {
      console.error('Failed to reject screen share call:', error);
    }
  };

  const endSession = () => {
    try {
      console.debug('Ending screen share session');
      // This would be implemented when the ScreenShareManager API is available
    } catch (error) {
      console.error('Failed to end screen share session:', error);
    }
  };

  return {
    requestScreenShare,
    acceptCall,
    rejectCall,
    endSession
  };
};