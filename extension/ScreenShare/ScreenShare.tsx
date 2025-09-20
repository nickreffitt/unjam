import React, { forwardRef, useImperativeHandle } from 'react';
import { ScreenShare as ScreenShareIcon, CheckCircle, X } from 'lucide-react';
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
  const { activeRequest, refreshState } = useScreenShareState(ticketId);
  const { handleAcceptRequest, handleRejectRequest, handleScreenShareClick } = useScreenShareActions(
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
      <div data-testid="screen-share" className={`unjam-w-120 unjam-min-h-16 unjam-bg-white unjam-rounded-lg unjam-shadow-lg unjam-border unjam-border-blue-400 unjam-bg-blue-50 unjam-p-4 unjam-z-50 unjam-font-sans ${className}`}>
        <div className="unjam-text-center">
          <p className="unjam-text-blue-900 unjam-font-medium unjam-mb-3">
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

  // Show default screenshare button
  return (
    <div data-testid="screen-share" className={`unjam-w-120 unjam-h-16 unjam-bg-white unjam-rounded-lg unjam-shadow-lg unjam-border unjam-border-gray-400 unjam-flex unjam-items-center unjam-justify-center unjam-z-50 unjam-font-sans ${className}`}>
      <button
        onClick={handleScreenShareClick}
        className="unjam-w-half unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-2 hover:unjam-bg-gray-50"
      >
        <ScreenShareIcon size={16} />
        Screenshare
      </button>
    </div>
  );
});

ScreenShare.displayName = 'ScreenShare';

export default ScreenShare;