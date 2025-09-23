import React, { forwardRef, useImperativeHandle } from 'react';
import { ScreenShare as ScreenShareIcon, CheckCircle, X, PhoneOff } from 'lucide-react';
import { useScreenShareState, useScreenShareActions } from '@extension/ScreenShare/hooks';
import { useUserProfile } from '@extension/shared/UserProfileContext';
import type { UserProfile } from '@common/types';

interface ScreenShareProps {
  ticketId: string;
  engineerProfile?: UserProfile;
  className?: string;
  onCustomerRequestCreated?: () => void;
  onSessionStarted?: () => void;
}

export interface ScreenShareRef {
  refreshScreenShareState: () => void;
}

const ScreenShare = forwardRef<ScreenShareRef, ScreenShareProps>(({ ticketId, engineerProfile, className = '', onCustomerRequestCreated, onSessionStarted }, ref) => {
  const { customerProfile } = useUserProfile();
  const { activeRequest, outgoingRequest, acceptedRequest, activeSession, refreshState } = useScreenShareState(ticketId);
  const { handleAcceptRequest, handleRejectRequest, handleScreenShareClick, handleStartSession, handleEndCall } = useScreenShareActions(
    ticketId,
    customerProfile,
    engineerProfile,
    refreshState,
    onCustomerRequestCreated
  );

  // Expose functions via ref (same pattern as ChatBox)
  useImperativeHandle(ref, () => ({
    refreshScreenShareState: refreshState
  }), [refreshState]);

  // Show incoming request UI if there's a pending request
  if (activeRequest && activeRequest.status === 'pending' && activeRequest.sender.type === 'engineer') {
    return (
      <div data-testid="screen-share" className={`unjam-w-120 unjam-bg-white unjam-flex unjam-items-center unjam-justify-center unjam-z-50 unjam-font-sans unjam-px-4 ${className}`}>
        <div className="unjam-text-center">
          <p className="unjam-text-blue-900 unjam-font-medium unjam-text-sm unjam-mb-3">
            {activeRequest.sender.name} wants to view your screen
          </p>
          <div className="unjam-flex unjam-gap-2">
            <button
              onClick={() => handleAcceptRequest(activeRequest, onSessionStarted)}
              className="unjam-flex-1 unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-1 hover:unjam-bg-gray-50"
            >
              <CheckCircle size={14} />
              Accept
            </button>
            <button
              onClick={() => handleRejectRequest(activeRequest)}
              className="unjam-flex-1 unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-1 hover:unjam-bg-gray-50"
            >
              <X size={14} />
              Reject
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show "Present Screen" button if there's an accepted request waiting to start
  if (acceptedRequest && acceptedRequest.status === 'accepted') {
    return (
      <div data-testid="screen-share" className={`unjam-w-120 unjam-bg-white unjam-flex unjam-items-center unjam-justify-center unjam-z-50 unjam-font-sans unjam-px-4 ${className}`}>
        <button
          onClick={() => handleStartSession(acceptedRequest, onSessionStarted)}
          className="unjam-w-full unjam-bg-green-600 hover:unjam-bg-green-700 unjam-border unjam-border-green-700 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-2 unjam-text-white"
        >
          <ScreenShareIcon size={16} />
          Present Screen
        </button>
      </div>
    );
  }

  // Show "Calling.." state if there's an outgoing pending request
  if (outgoingRequest && outgoingRequest.status === 'pending') {
    return (
      <div data-testid="screen-share" className={`unjam-w-120 unjam-bg-white unjam-flex unjam-items-center unjam-justify-center unjam-z-50 unjam-font-sans unjam-px-4 ${className}`}>
        <button
          disabled
          className="unjam-w-full unjam-bg-gray-100 unjam-border unjam-border-gray-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-2 unjam-cursor-not-allowed unjam-text-gray-500"
        >
          <ScreenShareIcon size={16} />
          Calling..
        </button>
      </div>
    );
  }

  // Show "End Call" state if there's an active session
  if (activeSession && activeSession.status === 'active') {
    return (
      <div data-testid="screen-share" className={`unjam-w-120 unjam-bg-white unjam-flex unjam-items-center unjam-justify-center unjam-z-50 unjam-font-sans unjam-px-4 ${className}`}>
        <button
          onClick={() => handleEndCall(activeSession)}
          className="unjam-w-full unjam-bg-red-500 unjam-border unjam-border-red-600 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-2 hover:unjam-bg-red-600 unjam-text-white"
        >
          <PhoneOff size={16} />
          End Call
        </button>
      </div>
    );
  }

  // Show default screenshare button
  return (
    <div data-testid="screen-share" className={`unjam-w-120 unjam-bg-white unjam-flex unjam-items-center unjam-justify-center unjam-z-50 unjam-font-sans unjam-px-4 ${className}`}>
      <button
        onClick={handleScreenShareClick}
        className="unjam-w-full unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-2 hover:unjam-bg-gray-50"
      >
        <ScreenShareIcon size={16} />
        Screenshare
      </button>
    </div>
  );
});

ScreenShare.displayName = 'ScreenShare';

export default ScreenShare;