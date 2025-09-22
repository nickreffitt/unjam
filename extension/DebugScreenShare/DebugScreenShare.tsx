import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { type UserProfile } from '@common/types';
import { useEngineerScreenShareState, useEngineerScreenShareActions } from '@extension/ScreenShare/hooks';

interface DebugScreenShareProps {
  ticketId: string;
  customerProfile: UserProfile;
  engineerProfile?: UserProfile;
  onScreenShareRefresh?: () => void;
  className?: string;
}

export interface DebugScreenShareRef {
  refreshScreenShareState: () => void;
}

const DebugScreenShare = forwardRef<DebugScreenShareRef, DebugScreenShareProps>(({
  ticketId,
  customerProfile,
  engineerProfile,
  onScreenShareRefresh,
  className = ''
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Use engineer screen share hooks to simulate engineer-side behavior
  const {
    incomingRequest,
    activeSession,
    remoteStream
  } = useEngineerScreenShareState(ticketId, { id: ticketId, assignedTo: engineerProfile });

  const {
    handleAcceptCustomerRequest,
    handleRejectCustomerRequest,
    handleRequestScreenShare
  } = useEngineerScreenShareActions(
    ticketId,
    incomingRequest,
    activeSession,
    customerProfile,
    engineerProfile,
    onScreenShareRefresh
  );

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refreshScreenShareState: onScreenShareRefresh || (() => {})
  }), [onScreenShareRefresh]);

  // Attach remote stream to video element when available
  React.useEffect(() => {
    if (remoteStream && videoRef.current) {
      console.debug('DebugScreenShare: Attaching remote stream to video element:', remoteStream.id);
      console.debug('DebugScreenShare: Stream details:', {
        active: remoteStream.active,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length,
        videoTrackStates: remoteStream.getVideoTracks().map(track => ({
          id: track.id,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted
        }))
      });

      // Force video element to reset first
      videoRef.current.srcObject = null;

      // Wait a tick then set the new stream
      setTimeout(() => {
        if (videoRef.current && remoteStream) {
          videoRef.current.srcObject = remoteStream;

          // Add event listeners to debug video element
          videoRef.current.onloadedmetadata = () => {
            console.debug('DebugScreenShare: Video metadata loaded:', {
              videoWidth: videoRef.current?.videoWidth,
              videoHeight: videoRef.current?.videoHeight,
              duration: videoRef.current?.duration,
              readyState: videoRef.current?.readyState
            });
          };

          videoRef.current.onplaying = () => {
            console.debug('DebugScreenShare: Video started playing');
          };

          videoRef.current.onerror = (e) => {
            console.error('DebugScreenShare: Video element error:', e);
          };

          // Force play after setting srcObject
          videoRef.current.play().catch(error => {
            console.error('DebugScreenShare: Error playing video:', error);

            // If autoplay fails, try muted autoplay
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(err => {
                console.error('DebugScreenShare: Error playing video even when muted:', err);
              });
            }
          });

          // Log video element state
          console.debug('DebugScreenShare: Video element state after setting stream:', {
            srcObject: videoRef.current.srcObject,
            readyState: videoRef.current.readyState,
            networkState: videoRef.current.networkState,
            paused: videoRef.current.paused,
            muted: videoRef.current.muted,
            autoplay: videoRef.current.autoplay
          });
        }
      }, 100);
    } else if (!remoteStream && videoRef.current) {
      console.debug('DebugScreenShare: Clearing video element stream');
      videoRef.current.srcObject = null;
    }
  }, [remoteStream]);

  return (
    <div data-testid="debug-screen-share" className={`unjam-w-120 unjam-bg-white unjam-rounded-lg unjam-shadow unjam-border unjam-border-gray-300 unjam-p-4 unjam-font-sans ${className}`}>
      <h3 className="unjam-font-semibold unjam-mb-3 unjam-text-purple-800">Debug Screen Share (Engineer View)</h3>

      <div className="unjam-space-y-3">
        {/* Engineer request button */}
        <button
          onClick={handleRequestScreenShare}
          className="unjam-block unjam-w-full unjam-text-sm unjam-bg-green-200 hover:unjam-bg-green-300 unjam-px-3 unjam-py-2 unjam-rounded unjam-font-medium"
        >
          Engineer Requests Screenshare
        </button>

        {/* Engineer-side Accept/Reject UI for customer-initiated requests */}
        {incomingRequest && incomingRequest.status === 'pending' && (
          <div className="unjam-p-3 unjam-bg-blue-50 unjam-border unjam-border-blue-200 unjam-rounded">
            <p className="unjam-text-sm unjam-text-blue-800 unjam-font-medium unjam-mb-2">
              {incomingRequest.sender.name} wants to share their screen
            </p>
            <div className="unjam-flex unjam-gap-2">
              <button
                onClick={handleAcceptCustomerRequest}
                className="unjam-flex-1 unjam-text-sm unjam-bg-green-200 hover:unjam-bg-green-300 unjam-px-3 unjam-py-2 unjam-rounded unjam-font-medium"
              >
                Accept
              </button>
              <button
                onClick={handleRejectCustomerRequest}
                className="unjam-flex-1 unjam-text-sm unjam-bg-red-200 hover:unjam-bg-red-300 unjam-px-3 unjam-py-2 unjam-rounded unjam-font-medium"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Screen Share Session Status and Video Display */}
        {activeSession && (
          <div className="unjam-p-3 unjam-bg-purple-50 unjam-border unjam-border-purple-200 unjam-rounded">
            <p className="unjam-text-sm unjam-text-purple-800 unjam-font-medium unjam-mb-2">
              Screen Share Session: {activeSession.status}
            </p>
            <p className="unjam-text-sm unjam-text-purple-600 unjam-mb-2">
              Publisher: {activeSession.publisher.name} | Subscriber: {activeSession.subscriber.name}
            </p>

            {/* Video element to display the remote stream */}
            {remoteStream && (
              <div className="unjam-mt-3">
                <p className="unjam-text-sm unjam-text-purple-600 unjam-mb-2">
                  Remote Stream Active
                </p>
                <video
                  ref={videoRef}
                  className="unjam-w-full unjam-h-48 unjam-bg-black unjam-rounded unjam-object-contain"
                  autoPlay
                  playsInline
                  muted
                  controls
                  style={{ minHeight: '192px', display: 'block' }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

DebugScreenShare.displayName = 'DebugScreenShare';

export default DebugScreenShare;