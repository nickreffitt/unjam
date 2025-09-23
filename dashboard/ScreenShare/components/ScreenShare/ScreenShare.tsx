import React, { useRef, useEffect } from 'react';
import { Monitor, Phone, PhoneOff } from 'lucide-react';
import { useScreenShareState } from '@dashboard/ScreenShare/hooks/useScreenShareState';
import { useScreenShareActions } from '@dashboard/ScreenShare/hooks/useScreenShareActions';
import type { UserProfile } from '@common/types';

interface ScreenShareProps {
  ticketId: string;
  customer?: UserProfile;
}

const ScreenShare: React.FC<ScreenShareProps> = ({ ticketId, customer }) => {
  const { currentRequest, uiState, remoteStream } = useScreenShareState(ticketId);
  const { requestScreenShare, acceptCall, rejectCall } = useScreenShareActions(ticketId);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleRequestScreenShare = () => {
    if (!customer) {
      console.warn('No customer profile available for screen share request');
      return;
    }
    requestScreenShare(customer);
  };

  const handleAcceptCall = () => {
    if (uiState === 'incoming_call') {
      acceptCall(currentRequest);
    }
  };

  const handleRejectCall = () => {
    if (uiState === 'incoming_call') {
      rejectCall(currentRequest);
    }
  };

  // Attach remote stream to video element when available
  useEffect(() => {
    if (remoteStream && videoRef.current) {
      console.debug('ScreenShare: Attaching remote stream to video element:', remoteStream.id);
      console.debug('ScreenShare: Stream details:', {
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
            console.debug('ScreenShare: Video metadata loaded:', {
              videoWidth: videoRef.current?.videoWidth,
              videoHeight: videoRef.current?.videoHeight,
              duration: videoRef.current?.duration,
              readyState: videoRef.current?.readyState
            });
          };

          videoRef.current.onplaying = () => {
            console.debug('ScreenShare: Video started playing');
          };

          videoRef.current.onerror = (e) => {
            console.error('ScreenShare: Video element error:', e);
          };

          // Force play after setting srcObject
          videoRef.current.play().catch(error => {
            console.error('ScreenShare: Error playing video:', error);

            // If autoplay fails, try muted autoplay
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(err => {
                console.error('ScreenShare: Error playing video even when muted:', err);
              });
            }
          });

          // Log video element state
          console.debug('ScreenShare: Video element state after setting stream:', {
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
      console.debug('ScreenShare: Clearing video element stream');
      videoRef.current.srcObject = null;
    }
  }, [remoteStream]);

  return (
    <div className="unjam-bg-white unjam-rounded-lg unjam-shadow-sm unjam-border unjam-border-gray-200 unjam-p-6 unjam-mb-6">
      {(() => {
        switch (uiState) {
          case 'incoming_call':
            return (
              <div className="unjam-space-y-3">
                <div className="unjam-text-center unjam-text-gray-700 unjam-mb-4">
                  <p className="unjam-font-medium">Incoming screen share request from customer</p>
                  <p className="unjam-text-sm unjam-text-gray-500 unjam-mt-1">
                    {currentRequest?.sender.name || 'Customer'} wants to share their screen
                  </p>
                </div>
                <div className="unjam-flex unjam-gap-3">
                  <button
                    onClick={handleAcceptCall}
                    className="unjam-flex-1 unjam-bg-green-600 hover:unjam-bg-green-700 unjam-text-white unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-transition-colors unjam-flex unjam-items-center unjam-justify-center unjam-gap-2"
                  >
                    <Phone size={16} />
                    Accept
                  </button>
                  <button
                    onClick={handleRejectCall}
                    className="unjam-flex-1 unjam-bg-red-600 hover:unjam-bg-red-700 unjam-text-white unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-transition-colors unjam-flex unjam-items-center unjam-justify-center unjam-gap-2"
                  >
                    <PhoneOff size={16} />
                    Decline
                  </button>
                </div>
              </div>
            );

          case 'connection_lost':
            return (
              <div className="unjam-space-y-3">
                <div className="unjam-text-center unjam-text-yellow-700 unjam-mb-4">
                  <p className="unjam-font-medium">Connection Lost</p>
                  <p className="unjam-text-sm unjam-text-yellow-600 unjam-mt-1">
                    Screen share connection was lost. Returning to main view...
                  </p>
                </div>
              </div>
            );

          case 'connection_failed':
            return (
              <div className="unjam-space-y-3">
                <div className="unjam-text-center unjam-text-red-700 unjam-mb-4">
                  <p className="unjam-font-medium">Connection Failed</p>
                  <p className="unjam-text-sm unjam-text-red-600 unjam-mt-1">
                    Screen share connection failed. Returning to main view...
                  </p>
                </div>
              </div>
            );

          case 'requesting':
          case 'loading':
          case 'active_session':
          case 'idle':
          default:
            return (
              <button
                onClick={handleRequestScreenShare}
                disabled={uiState !== 'idle' || !customer}
                className="unjam-w-half unjam-bg-blue-600 hover:unjam-bg-blue-700 disabled:unjam-bg-gray-400 disabled:unjam-cursor-not-allowed unjam-text-white unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-transition-colors unjam-flex unjam-items-center unjam-justify-center unjam-gap-2"
              >
                <Monitor size={16} />
                {uiState === 'requesting' && 'Requesting...'}
                {uiState === 'loading' && 'Loading...'}
                {uiState === 'active_session' && 'Session Active'}
                {uiState === 'connection_lost' && 'Connection Lost'}
                {uiState === 'connection_failed' && 'Connection Failed'}
                {uiState === 'idle' && 'Request Screenshare'}
              </button>
            );
        }
      })()}

      {/* Video element to display the remote stream when active */}
      {uiState === 'active_session' && remoteStream && (
        <div className="unjam-mt-4 unjam-p-4 unjam-bg-gray-50 unjam-border unjam-border-gray-200 unjam-rounded-lg">
          <div className="unjam-flex unjam-items-center unjam-justify-between unjam-mb-3">
            <h3 className="unjam-text-lg unjam-font-semibold unjam-text-gray-900">
              {currentRequest?.sender.name || 'Customer'} Screen Share
            </h3>
            <div className="unjam-flex unjam-items-center unjam-gap-2">
              <div className="unjam-w-3 unjam-h-3 unjam-bg-green-500 unjam-rounded-full"></div>
              <span className="unjam-text-sm unjam-text-gray-600">Live</span>
            </div>
          </div>
          <video
            ref={videoRef}
            className="unjam-w-full unjam-h-96 unjam-bg-black unjam-rounded-lg unjam-object-contain"
            autoPlay
            playsInline
            muted
            controls
          />
          <p className="unjam-text-sm unjam-text-gray-500 unjam-mt-2">
            You are viewing {currentRequest?.sender.name || 'the customer'}'s screen
          </p>
        </div>
      )}
    </div>
  );
};

export default ScreenShare;