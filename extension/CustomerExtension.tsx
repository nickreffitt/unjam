import React, { useState, useRef, useEffect, useCallback } from 'react';
import TicketBox from '@extension/Ticket/components/TicketBox/TicketBox';
import TicketModal from '@extension/Ticket/components/TicketModal/TicketModal';
import ChatBox, { type ChatBoxRef } from '@extension/ChatBox/ChatBox';
import ScreenShare, { type ScreenShareRef } from '@extension/ScreenShare/ScreenShare';
import type { TicketStatus, Ticket, ScreenShareRequest, ScreenShareSession } from '@common/types';
import { useTicketManager } from '@extension/Ticket/contexts/TicketManagerContext';
import { useUserProfile } from '@extension/shared/UserProfileContext';
import { useTicketState } from '@extension/Ticket/hooks';
import { useChatManager } from '@extension/ChatBox/contexts/ChatManagerContext';
import { useScreenShareManager } from '@extension/ScreenShare/contexts/ScreenShareManagerContext';
import '@extension/styles.css';

const AUTO_COMPLETE_TIMEOUT_MINUTES = 30;

const CustomerExtension: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTicketVisible, setIsTicketVisible] = useState(true);
  const [incomingScreenShareRequest, setIncomingScreenShareRequest] = useState<ScreenShareRequest | undefined>();
  const [activeScreenShareSession, setActiveScreenShareSession] = useState<ScreenShareSession | undefined>();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const chatBoxRef = useRef<ChatBoxRef>(null);
  const screenShareRef = useRef<ScreenShareRef>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const expirationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get customer profile and ticket manager from contexts
  const { customerProfile } = useUserProfile();
  const { ticketManager, ticketStore } = useTicketManager();
  const { createChatStore } = useChatManager();
  const { createScreenShareManager } = useScreenShareManager();

  // Use dedicated hooks for state
  const { activeTicket, setActiveTicket, isChatVisible, setIsChatVisible } = useTicketState();

  const handleTicketCreated = (ticketId: string) => {
    console.debug('Ticket created with ID:', ticketId);
    // Since storage events only work cross-tab, manually get the created ticket and update context
    const createdTicket = ticketManager.getActiveTicket();
    if (createdTicket) {
      console.debug('Setting active ticket in context:', createdTicket.id);
      setActiveTicket(createdTicket);
    } else {
      console.warn('No active ticket found after creation');
    }
    // Close the modal and show the ticket
    setIsTicketVisible(true);
    setIsModalOpen(false);
  };

  const handleTicketHide = () => {
    setIsTicketVisible(false);
  };

  const handleCreateNewTicketClick = () => {
    // If ticket exists and is not resolved, just show the existing ticket
    if (activeTicket && activeTicket.status !== 'completed' && activeTicket.status !== 'auto-completed') {
      setIsTicketVisible(true);
    } else {
      // Only allow creating new ticket if no ticket exists or current ticket is completed
      setIsModalOpen(true);
    }
  };

  const handleMarkFixed = () => {
    if (activeTicket) {
      const updatedTicket = {
        ...activeTicket,
        status: 'completed' as TicketStatus,
      };
      ticketStore.update(activeTicket.id, updatedTicket);
      // Manually update context for same-tab updates (storage events only work cross-tab)
      setActiveTicket(updatedTicket);
      console.debug('Customer marked ticket as fixed');
    }
  };

  const handleConfirmFixed = async () => {
    if (activeTicket) {
      try {
        const updatedTicket = await ticketManager.markAsResolved(activeTicket.id);
        // Manually update context for same-tab updates (storage events only work cross-tab)
        setActiveTicket(updatedTicket);
        console.debug('Customer confirmed fix');
      } catch (error) {
        console.error('Failed to confirm fix:', error);
      }
    }
  };

  const handleMarkStillBroken = async () => {
    if (activeTicket) {
      try {
        const updatedTicket = await ticketManager.markStillBroken(activeTicket.id);
        // Manually update context for same-tab updates (storage events only work cross-tab)
        setActiveTicket(updatedTicket);
        console.debug('Customer marked as still broken');
      } catch (error) {
        console.error('Failed to mark as still broken:', error);
      }
    }
  };

  const handleSubmitRating = (rating: number, feedback?: string) => {
    console.debug('Rating submitted:', { rating, feedback });
    setActiveTicket(null);
    setIsTicketVisible(false);
  };

  // Function to clear existing expiration timer
  const clearExpirationTimer = useCallback(() => {
    if (expirationTimerRef.current) {
      clearTimeout(expirationTimerRef.current);
      expirationTimerRef.current = null;
    }
  }, []);

  // Function to set expiration timer for incoming customer request
  const setExpirationTimer = useCallback((request: ScreenShareRequest) => {
    clearExpirationTimer();

    const now = new Date();
    const timeUntilExpiry = request.expiresAt.getTime() - now.getTime();

    if (timeUntilExpiry > 0) {
      console.debug('CustomerExtension: Setting expiration timer for incoming request:', timeUntilExpiry, 'ms');
      expirationTimerRef.current = setTimeout(() => {
        console.debug('CustomerExtension: Incoming request expired, hiding UI');
        setIncomingScreenShareRequest(undefined);
      }, timeUntilExpiry);
    } else {
      // Request already expired, hide immediately
      console.debug('CustomerExtension: Incoming request already expired');
      setIncomingScreenShareRequest(undefined);
    }
  }, [clearExpirationTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearExpirationTimer();
    };
  }, [clearExpirationTimer]);

  // Attach remote stream to video element when available
  useEffect(() => {
    if (remoteStream && videoRef.current) {
      console.debug('Attaching remote stream to video element:', remoteStream.id);
      console.debug('Stream details:', {
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
            console.debug('Video metadata loaded:', {
              videoWidth: videoRef.current!.videoWidth,
              videoHeight: videoRef.current!.videoHeight,
              duration: videoRef.current!.duration,
              readyState: videoRef.current!.readyState
            });
          };

          videoRef.current.onplaying = () => {
            console.debug('Video started playing');
          };

          videoRef.current.onerror = (e) => {
            console.error('Video element error:', e);
          };

          // Force play after setting srcObject
          videoRef.current.play().catch(error => {
            console.error('Error playing video:', error);

            // If autoplay fails, try muted autoplay
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(err => {
                console.error('Error playing video even when muted:', err);
              });
            }
          });

          // Log video element state
          console.debug('Video element state after setting stream:', {
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
      console.debug('Clearing video element stream');
      videoRef.current.srcObject = null;
    }
  }, [remoteStream]);

  // Function to check for incoming customer requests
  const checkForIncomingRequests = () => {
    if (!activeTicket) return;

    try {
      const screenShareManager = createScreenShareManager(activeTicket.id);
      const activeRequest = screenShareManager.getActiveRequest();

      // Only show if request is for our active ticket, is from a customer, and is pending
      if (activeRequest &&
          activeRequest.ticketId === activeTicket.id &&
          activeRequest.requestedBy.type === 'customer' &&
          activeRequest.status === 'pending') {
        console.debug('Engineer received customer screen share request:', activeRequest.id);
        setIncomingScreenShareRequest(activeRequest);

        // Set expiration timer to automatically hide the UI when request expires
        setExpirationTimer(activeRequest);
      } else {
        // Clear any existing incoming request if it's no longer valid
        setIncomingScreenShareRequest(undefined);
        clearExpirationTimer();
      }
    } catch (error) {
      console.error('Error checking for incoming screen share requests:', error);
    }
  };

  const handleAcceptCustomerRequest = () => {
    if (incomingScreenShareRequest && activeTicket?.assignedTo) {
      console.debug('Engineer accepting customer screenshare request:', incomingScreenShareRequest.id);
      try {
        const screenShareManager = createScreenShareManager(activeTicket.id);
        screenShareManager.respondToRequest(incomingScreenShareRequest, 'accepted', activeTicket.assignedTo);
        console.debug('Customer request accepted');

        // Reload and refresh state for same-tab updates
        screenShareManager.reload();
        if (screenShareRef.current) {
          screenShareRef.current.refreshScreenShareState();
        }

        // Clear the timer since we handled the request
        clearExpirationTimer();

        // Check for any new incoming requests
        checkForIncomingRequests();
      } catch (error) {
        console.error('Failed to accept customer screenshare request:', error);
      }
    }
  };

  const handleRejectCustomerRequest = () => {
    if (incomingScreenShareRequest && activeTicket?.assignedTo) {
      console.debug('Engineer rejecting customer screenshare request:', incomingScreenShareRequest.id);
      try {
        const screenShareManager = createScreenShareManager(activeTicket.id);
        screenShareManager.respondToRequest(incomingScreenShareRequest, 'rejected', activeTicket.assignedTo);
        console.debug('Customer request rejected');

        // Reload and refresh state for same-tab updates
        screenShareManager.reload();
        if (screenShareRef.current) {
          screenShareRef.current.refreshScreenShareState();
        }

        // Clear the timer since we handled the request
        clearExpirationTimer();

        // Check for any new incoming requests
        checkForIncomingRequests();
      } catch (error) {
        console.error('Failed to reject customer screenshare request:', error);
      }
    }
  };

  // Function to check for active screen share sessions
  const checkForActiveSession = async () => {
    if (!activeTicket) return;

    try {
      const screenShareManager = createScreenShareManager(activeTicket.id);

      // Register callbacks for WebRTC events
      screenShareManager.setCallbacks({
        onRemoteStreamAvailable: (sessionId, stream) => {
          console.debug('CustomerExtension: Remote stream available via callback:', sessionId, stream.id);
          setRemoteStream(stream);
        },
        onWebRTCStateChanged: (sessionId, state) => {
          console.debug('CustomerExtension: WebRTC state changed via callback:', sessionId, state);
        }
      });

      const activeSession = screenShareManager.getActiveSession();

      if (activeSession) {
        console.debug('Found active screen share session:', activeSession.id, 'status:', activeSession.status);
        setActiveScreenShareSession(activeSession);

        // If session is active and we're the subscriber (engineer), auto-subscribe to the stream
        if (activeSession.status === 'active' &&
            activeSession.subscriber.id === activeTicket.assignedTo?.id) {
          console.debug('CustomerExtension: Engineer should auto-subscribe to active session:', activeSession.id);

          // Auto-subscribe to the stream for the engineer
          try {
            // Register callbacks before subscribing
            screenShareManager.setCallbacks({
              onRemoteStreamAvailable: (sessionId, stream) => {
                console.debug('CustomerExtension: Remote stream available via auto-subscription callback:', sessionId, stream.id);
                setRemoteStream(stream);
              },
              onWebRTCStateChanged: (sessionId, state) => {
                console.debug('CustomerExtension: WebRTC state changed via auto-subscription callback:', sessionId, state);
              }
            });

            await screenShareManager.subscribeToStream(activeSession.id);
            console.debug('CustomerExtension: Engineer auto-subscribed to stream successfully');

            const stream = screenShareManager.getRemoteStream();
            if (stream && stream !== remoteStream) {
              console.debug('Got remote stream from screen share manager:', stream.id);
              setRemoteStream(stream);
            }
          } catch (error) {
            console.error('Error auto-subscribing to stream:', error);
          }
        }
      } else {
        setActiveScreenShareSession(undefined);
        setRemoteStream(null);
      }
    } catch (error) {
      console.error('Error checking for active screen share session:', error);
    }
  };


  // Function for engineer to subscribe to an active stream
  const handleSubscribeToStream = async () => {
    if (!activeScreenShareSession || !activeTicket?.assignedTo) {
      console.warn('No active session or engineer profile for subscription');
      return;
    }

    console.debug('Engineer subscribing to stream for session:', activeScreenShareSession.id);
    try {
      const screenShareManager = createScreenShareManager(activeTicket.id);

      // Register callbacks before subscribing
      screenShareManager.setCallbacks({
        onRemoteStreamAvailable: (sessionId, stream) => {
          console.debug('CustomerExtension: Remote stream available:', sessionId, stream.id);
          setRemoteStream(stream);
        },
        onWebRTCStateChanged: (sessionId, state) => {
          console.debug('CustomerExtension: WebRTC state changed:', sessionId, state);
        }
      });

      // Subscribe to the stream
      await screenShareManager.subscribeToStream(activeScreenShareSession.id);
      console.debug('Engineer subscribed to stream successfully');

      // Start polling for the remote stream
      const startTime = Date.now();
      let pollCount = 0;
      const pollForRemoteStream = () => {
        pollCount++;
        const currentState = screenShareManager.getWebRTCState();
        const stream = screenShareManager.getRemoteStream();
        console.debug(`Poll #${pollCount} - WebRTC state: ${currentState}, Stream: ${stream ? stream.id : 'null'}`);

        if (stream) {
          console.debug('Got remote stream via polling:', stream.id);
          setRemoteStream(stream);

          // Log additional stream debugging info
          setTimeout(() => {
            const currentState = screenShareManager.getWebRTCState();
            console.debug(`Post-stream poll #${pollCount} - WebRTC state: ${currentState}`);
          }, 1000);
        } else if (Date.now() - startTime < 10000) {
          // Poll again in 500ms if under 10 seconds
          setTimeout(pollForRemoteStream, 500);
        } else {
          console.warn('Timeout waiting for remote stream after 10 seconds');
        }
      };

      // Start polling immediately
      pollForRemoteStream();

      // Reload and refresh state
      screenShareManager.reload();
      checkForActiveSession();
    } catch (error) {
      console.error('Failed to subscribe to stream:', error);
    }
  };


  const getButtonText = () => {
    // If ticket exists and is not completed, show "Show Active Ticket"
    if (activeTicket && activeTicket.status !== 'completed' && activeTicket.status !== 'auto-completed') {
      return 'Show Active Ticket';
    }
    // If no ticket exists or ticket is completed, allow creating new ticket
    return 'Create New Ticket';
  };

  const generateRandomMessage = () => {
    const words = [
      'thanks', 'for', 'helping', 'me', 'yes', 'that', 'fixed', 'it', 'no', 'still', 'broken',
      'I', 'see', 'the', 'issue', 'now', 'oh', 'okay', 'let', 'me', 'try', 'that',
      'working', 'on', 'it', 'hmm', 'interesting', 'perfect', 'great', 'awesome', 'nice',
      'understood', 'got', 'it', 'makes', 'sense', 'thank', 'you', 'so', 'much'
    ];

    try {
      const messageLength = Math.floor(Math.random() * 10) + 2; // 2 to 12 words
      const selectedWords = [];

      for (let i = 0; i < messageLength; i++) {
        const randomIndex = Math.floor(Math.random() * words.length);
        const selectedWord = words[randomIndex];
        if (selectedWord) {
          selectedWords.push(selectedWord);
        }
      }

      if (selectedWords.length === 0) {
        return 'Thanks for the help!';
      }

      return `${selectedWords.join(' ')}.`;
    } catch (error) {
      console.error('Error generating random message:', error);
      return 'Thanks for the help!';
    }
  };

  const handleSendRandomEngineerMessage = () => {
    const randomMessage = generateRandomMessage();
    console.debug('Generated engineer message:', randomMessage);

    if (randomMessage && typeof randomMessage === 'string' && chatBoxRef.current) {
      chatBoxRef.current.injectEngineerMessage(randomMessage);
    } else {
      console.error('Failed to generate valid message or chat not available');
    }
  };

  return (
    <div className="unjam-min-h-screen unjam-bg-gray-100 unjam-flex unjam-items-center unjam-justify-center unjam-font-sans">
      <div className="unjam-text-center">
        <h1 className="unjam-text-3xl unjam-font-bold unjam-text-gray-800 unjam-mb-8">
          Customer Support
        </h1>
        
        <button
          onClick={handleCreateNewTicketClick}
          className="unjam-bg-blue-600 hover:unjam-bg-blue-700 unjam-text-white unjam-font-semibold unjam-py-3 unjam-px-6 unjam-rounded-lg unjam-shadow-lg unjam-transition-colors"
        >
          {getButtonText()}
        </button>

        {/* Debug controls for testing different states */}
        {process.env.NODE_ENV === 'development' && activeTicket && (
          <div className="unjam-mt-8 unjam-p-4 unjam-bg-white unjam-rounded-lg unjam-shadow unjam-max-w-sm unjam-mx-auto">
            <h3 className="unjam-font-semibold unjam-mb-2">Debug Controls</h3>
            <div className="unjam-space-y-2">
              <button
                onClick={() => {
                  if (activeTicket) {
                    const updatedTicket = { ...activeTicket, status: 'waiting' as TicketStatus };
                    ticketStore.update(activeTicket.id, updatedTicket);
                    // Manually update context for same-tab updates (storage events only work cross-tab)
                    setActiveTicket(updatedTicket);
                  }
                }}
                className="unjam-block unjam-w-full unjam-text-sm unjam-bg-orange-200 hover:unjam-bg-orange-300 unjam-px-2 unjam-py-1 unjam-rounded"
              >
                Set to Waiting
              </button>
              <button
                onClick={() => {
                  if (activeTicket) {
                    const updatedTicket = {
                      ...activeTicket,
                      status: 'in-progress' as TicketStatus,
                      assignedTo: {
                        id: 'ENG-001',
                        name: 'John',
                        type: 'engineer' as const,
                        email: 'john@engineer.com'
                      },
                      claimedAt: new Date()
                    };
                    ticketStore.update(activeTicket.id, updatedTicket);
                    // Manually update context for same-tab updates (storage events only work cross-tab)
                    setActiveTicket(updatedTicket);
                  }
                }}
                className="unjam-block unjam-w-full unjam-text-sm unjam-bg-blue-200 hover:unjam-bg-blue-300 unjam-px-2 unjam-py-1 unjam-rounded"
              >
                Set to In Progress (John)
              </button>
              <button
                onClick={() => {
                  if (activeTicket) {
                    // Calculate auto-complete timeout
                    const timeoutMinutes = AUTO_COMPLETE_TIMEOUT_MINUTES;
                    const now = new Date();
                    const autoCompleteTimeoutAt = new Date(now.getTime() + (timeoutMinutes * 60 * 1000));

                    const updatedTicket: Ticket = { 
                      ...activeTicket, 
                      status: 'awaiting-confirmation',
                      markedAsFixedAt: new Date(),
                      autoCompleteTimeoutAt,
                    };
                    ticketStore.update(activeTicket.id, updatedTicket);
                    // Manually update context for same-tab updates (storage events only work cross-tab)
                    setActiveTicket(updatedTicket);
                  }
                }}
                className="unjam-block unjam-w-full unjam-text-sm unjam-bg-green-200 hover:unjam-bg-green-300 unjam-px-2 unjam-py-1 unjam-rounded"
              >
                Set to Awaiting Confirmation
              </button>
              <button
                onClick={() => {
                  if (activeTicket) {
                    const updatedTicket = {
                      ...activeTicket,
                      status: 'completed' as TicketStatus,
                      resolvedAt: new Date()
                    };
                    ticketStore.update(activeTicket.id, updatedTicket);
                    // Manually update context for same-tab updates (storage events only work cross-tab)
                    setActiveTicket(updatedTicket);
                  }
                }}
                className="unjam-block unjam-w-full unjam-text-sm unjam-bg-purple-200 hover:unjam-bg-purple-300 unjam-px-2 unjam-py-1 unjam-rounded"
              >
                Set to Completed
              </button>
              <button
                onClick={() => setIsChatVisible(!isChatVisible)}
                className={`unjam-block unjam-w-full unjam-text-sm unjam-px-2 unjam-py-1 unjam-rounded unjam-font-medium ${
                  isChatVisible
                    ? 'unjam-bg-red-200 hover:unjam-bg-red-300'
                    : 'unjam-bg-teal-200 hover:unjam-bg-teal-300'
                }`}
              >
                {isChatVisible ? 'Hide Chat' : 'Show Chat'}
              </button>
              {isChatVisible && (
                <>
                  <button
                    onClick={handleSendRandomEngineerMessage}
                    className="unjam-block unjam-w-full unjam-text-sm unjam-bg-indigo-200 hover:unjam-bg-indigo-300 unjam-px-2 unjam-py-1 unjam-rounded unjam-mt-2 unjam-font-medium"
                  >
                    Send Random Engineer Message
                  </button>
                  <button
                    onClick={() => {
                      if (activeTicket && activeTicket.assignedTo) {
                        console.debug('Debug: Triggering engineer typing indicator for customer to see');
                        const chatStore = createChatStore(activeTicket.id);
                        chatStore.markIsTyping(activeTicket.assignedTo);
                        // Also trigger same-tab UI update
                        if (chatBoxRef.current) {
                          chatBoxRef.current.triggerTypingIndicator(activeTicket.assignedTo);
                        }
                      } else {
                        console.warn('Debug: No active ticket or assigned engineer for typing simulation');
                      }
                    }}
                    className="unjam-block unjam-w-full unjam-text-sm unjam-bg-yellow-200 hover:unjam-bg-yellow-300 unjam-px-2 unjam-py-1 unjam-rounded unjam-mt-2 unjam-font-medium"
                  >
                    Trigger Engineer Typing
                  </button>
                  <button
                    onClick={() => {
                      if (activeTicket && activeTicket.assignedTo) {
                        console.debug('Debug: Engineer requests screenshare');
                        try {
                          const screenShareManager = createScreenShareManager(activeTicket.id);
                          screenShareManager.requestScreenShare(activeTicket.assignedTo, customerProfile);
                          console.debug('Debug: Screenshare request created');

                          // Reload the ScreenShareManager to sync with the new request in localStorage
                          screenShareManager.reload();
                          console.debug('Debug: ScreenShareManager reloaded');

                          // Manually refresh the ScreenShare component state for same-tab updates
                          if (screenShareRef.current) {
                            screenShareRef.current.refreshScreenShareState();
                            console.debug('Debug: ScreenShare component state refreshed');
                          }

                          // Check for any incoming customer requests (for when customer initiates screenshare)
                          checkForIncomingRequests();
                          // Also check for active sessions
                          checkForActiveSession();
                        } catch (error) {
                          console.error('Debug: Failed to create screenshare request:', error);
                        }
                      } else {
                        console.warn('Debug: No active ticket or assigned engineer for screenshare request');
                      }
                    }}
                    className="unjam-block unjam-w-full unjam-text-sm unjam-bg-green-200 hover:unjam-bg-green-300 unjam-px-2 unjam-py-1 unjam-rounded unjam-mt-2 unjam-font-medium"
                  >
                    Engineer Requests Screenshare
                  </button>

                  {/* Engineer-side Accept/Reject UI for customer-initiated requests */}
                  {incomingScreenShareRequest && incomingScreenShareRequest.status === 'pending' && (
                    <div className="unjam-mt-2 unjam-p-2 unjam-bg-blue-50 unjam-border unjam-border-blue-200 unjam-rounded">
                      <p className="unjam-text-xs unjam-text-blue-800 unjam-font-medium unjam-mb-2">
                        {incomingScreenShareRequest.requestedBy.name} wants to share their screen
                      </p>
                      <div className="unjam-flex unjam-gap-1">
                        <button
                          onClick={handleAcceptCustomerRequest}
                          className="unjam-flex-1 unjam-text-xs unjam-bg-green-200 hover:unjam-bg-green-300 unjam-px-2 unjam-py-1 unjam-rounded unjam-font-medium"
                        >
                          Accept
                        </button>
                        <button
                          onClick={handleRejectCustomerRequest}
                          className="unjam-flex-1 unjam-text-xs unjam-bg-red-200 hover:unjam-bg-red-300 unjam-px-2 unjam-py-1 unjam-rounded unjam-font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Screen Share Session Status and Video Display */}
                  {activeScreenShareSession && (
                    <div className="unjam-mt-2 unjam-p-2 unjam-bg-purple-50 unjam-border unjam-border-purple-200 unjam-rounded">
                      <p className="unjam-text-xs unjam-text-purple-800 unjam-font-medium unjam-mb-2">
                        Screen Share Session: {activeScreenShareSession.status}
                      </p>
                      <p className="unjam-text-xs unjam-text-purple-600 unjam-mb-2">
                        Publisher: {activeScreenShareSession.publisher.name} |
                        Subscriber: {activeScreenShareSession.subscriber.name}
                      </p>

                      {/* Manual subscription button for debugging */}
                      {activeScreenShareSession.status === 'active' &&
                       activeScreenShareSession.subscriber.id === activeTicket?.assignedTo?.id &&
                       !remoteStream && (
                        <button
                          onClick={handleSubscribeToStream}
                          className="unjam-w-full unjam-text-xs unjam-bg-purple-200 hover:unjam-bg-purple-300 unjam-px-2 unjam-py-1 unjam-rounded unjam-font-medium unjam-mb-2"
                        >
                          Manual Subscribe to Stream (Debug)
                        </button>
                      )}

                      {/* Video element to display the remote stream */}
                      {remoteStream && (
                        <div className="unjam-mt-2">
                          <p className="unjam-text-xs unjam-text-purple-600 unjam-mb-1">
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
                </>
              )}
            </div>
          </div>
        )}

      </div>

      <TicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customerProfile={customerProfile}
        onTicketCreated={handleTicketCreated}
      />

      {/* Stacked container for ChatBox, ScreenShare, and TicketBox */}
      <div className="unjam-fixed unjam-bottom-4 unjam-right-4 unjam-flex unjam-flex-col unjam-gap-4">
        {isChatVisible && activeTicket && activeTicket.assignedTo && (
          <ChatBox
            ref={chatBoxRef}
            ticketId={activeTicket.id}
            engineerName={activeTicket.assignedTo.name}
            engineerProfile={activeTicket.assignedTo}
            onClose={() => setIsChatVisible(false)}
          />
        )}

        {activeTicket && activeTicket.assignedTo && (
          <ScreenShare
            ref={screenShareRef}
            ticketId={activeTicket.id}
            engineerProfile={activeTicket.assignedTo}
            onCustomerRequestCreated={checkForIncomingRequests}
            onSessionStarted={checkForActiveSession}
          />
        )}

        {activeTicket && isTicketVisible && (
          <TicketBox
            ticket={activeTicket}
            onHide={handleTicketHide}
            onMarkFixed={handleMarkFixed}
            onConfirmFixed={handleConfirmFixed}
            onMarkStillBroken={handleMarkStillBroken}
            onSubmitRating={handleSubmitRating}
            onToggleChat={() => setIsChatVisible(!isChatVisible)}
            isChatVisible={isChatVisible}
          />
        )}
      </div>
    </div>
  );
};

export default CustomerExtension;