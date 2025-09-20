import type { UserProfile, ScreenShareRequest, ScreenShareSession, WebRTCState } from '@common/types';
import { type ScreenShareRequestStore, type ScreenShareSessionStore } from './store';
import { createWebRTCManager, WebRTCSignalingStore, type WebRTCManager } from '@common/features/WebRTCManager';
import { WebRTCListener } from '@common/features/WebRTCManager/events';

/**
 * Callback interface for ScreenShareManager events
 */
export interface ScreenShareManagerCallbacks {
  /**
   * Called when a remote stream becomes available
   * @param sessionId - The session ID
   * @param stream - The remote media stream
   */
  onRemoteStreamAvailable?(sessionId: string, stream: MediaStream): void;

  /**
   * Called when WebRTC state changes
   * @param sessionId - The session ID
   * @param state - The new WebRTC state
   */
  onWebRTCStateChanged?(sessionId: string, state: WebRTCState): void;
}

export class ScreenShareManager {
  private readonly ticketId: string;
  private readonly requestStore: ScreenShareRequestStore;
  private readonly sessionStore: ScreenShareSessionStore;
  private readonly signalingStore: WebRTCSignalingStore;

  // WebRTC connection state - support both publisher and subscriber
  private publisherWebrtcManager: WebRTCManager | null = null;
  private subscriberWebrtcManager: WebRTCManager | null = null;
  private webrtcState: WebRTCState = 'initializing';
  private currentSessionId: string | null = null;
  private webrtcListener!: WebRTCListener;
  private callbacks: ScreenShareManagerCallbacks = {};


  constructor(
    ticketId: string,
    requestStore: ScreenShareRequestStore,
    sessionStore: ScreenShareSessionStore
  ) {
    this.ticketId = ticketId;
    this.requestStore = requestStore;
    this.sessionStore = sessionStore;
    this.signalingStore = new WebRTCSignalingStore();

    // Listen for WebRTC events to track remote stream availability
    this.setupWebRTCEventListeners();
  }

  /**
   * Engineer creates a screen share request to customer
   * @param engineer - The engineer requesting screen share
   * @param customer - The customer who will share their screen
   * @param autoAccept - Whether to auto-accept (for engineer-initiated requests)
   * @returns The created request
   */
  requestScreenShare(
    engineer: UserProfile,
    customer: UserProfile,
    autoAccept: boolean = false
  ): ScreenShareRequest {
    // Check if there's already an active request for this ticket
    const existingRequest = this.requestStore.getActiveByTicketId(this.ticketId);
    if (existingRequest) {
      throw new Error('There is already an active screen share request for this ticket');
    }

    // Validate user types
    if (engineer.type !== 'engineer') {
      throw new Error('Only engineers can request screen sharing');
    }
    if (customer.type !== 'customer') {
      throw new Error('Screen sharing can only be requested from customers');
    }

    const request = this.requestStore.create({
      ticketId: this.ticketId,
      requestedBy: engineer,
      requestedFrom: customer,
      status: autoAccept ? 'accepted' : 'pending',
      autoAccept,
    });

    console.debug('ScreenShareManager: Engineer requested screen share', request.id);
    return request;
  }

  /**
   * Customer responds to a screen share request
   * @param request - The request object to respond to
   * @param response - 'accepted' or 'rejected'
   * @param user - The user responding (must be the customer)
   * @returns The updated request
   */
  respondToRequest(
    request: ScreenShareRequest,
    response: 'accepted' | 'rejected',
    user: UserProfile
  ): ScreenShareRequest {
    // Validate user can respond to this request
    if (request.requestedFrom.id !== user.id) {
      throw new Error('Only the requested customer can respond to this request');
    }

    // Validate current status
    if (request.status !== 'pending') {
      throw new Error(`Cannot respond to request with status: ${request.status}`);
    }

    const updatedRequest = this.requestStore.updateStatus(request.id, response);
    if (!updatedRequest) {
      throw new Error('Failed to update request status');
    }

    console.debug(
      'ScreenShareManager: Customer',
      response,
      'screen share request',
      request.id
    );
    return updatedRequest;
  }

  /**
   * Customer initiates a call (without prior engineer request)
   * @param customer - The customer starting the call
   * @param engineer - The engineer who will receive the call
   * @returns The created request (auto-accepted from customer side)
   */
  startCall(customer: UserProfile, engineer: UserProfile): ScreenShareRequest {
    // Check if there's already an active request for this ticket
    const existingRequest = this.requestStore.getActiveByTicketId(this.ticketId);
    if (existingRequest) {
      throw new Error('There is already an active screen share request for this ticket');
    }

    // Validate user types
    if (customer.type !== 'customer') {
      throw new Error('Only customers can start screen share calls');
    }
    if (engineer.type !== 'engineer') {
      throw new Error('Screen share calls can only be made to engineers');
    }

    // Customer-initiated call: customer requests from engineer, but needs engineer acceptance
    const request = this.requestStore.create({
      ticketId: this.ticketId,
      requestedBy: customer,
      requestedFrom: engineer,
      status: 'pending', // Engineer needs to accept the call
      autoAccept: false,
    });

    console.debug('ScreenShareManager: Customer started call', request.id);
    return request;
  }

  /**
   * Engineer accepts a customer-initiated call
   * @param requestId - The request ID to accept
   * @param engineer - The engineer accepting the call
   * @returns The updated request
   */
  acceptCall(requestId: string, engineer: UserProfile): ScreenShareRequest {
    const request = this.requestStore.getById(requestId);
    if (!request) {
      throw new Error('Screen share request not found');
    }

    // Validate this is a customer-initiated call
    if (request.requestedBy.type !== 'customer') {
      throw new Error('This method is only for customer-initiated calls');
    }

    // Validate engineer can accept this call
    if (request.requestedFrom.id !== engineer.id) {
      throw new Error('Only the target engineer can accept this call');
    }

    // Validate current status
    if (request.status !== 'pending') {
      throw new Error(`Cannot accept call with status: ${request.status}`);
    }

    const updatedRequest = this.requestStore.updateStatus(requestId, 'accepted');
    if (!updatedRequest) {
      throw new Error('Failed to accept call');
    }

    console.debug('ScreenShareManager: Engineer accepted call', requestId);
    return updatedRequest;
  }

  /**
   * Engineer rejects a customer-initiated call
   * @param requestId - The request ID to reject
   * @param engineer - The engineer rejecting the call
   * @returns The updated request
   */
  rejectCall(requestId: string, engineer: UserProfile): ScreenShareRequest {
    const request = this.requestStore.getById(requestId);
    if (!request) {
      throw new Error('Screen share request not found');
    }

    // Validate this is a customer-initiated call
    if (request.requestedBy.type !== 'customer') {
      throw new Error('This method is only for customer-initiated calls');
    }

    // Validate engineer can reject this call
    if (request.requestedFrom.id !== engineer.id) {
      throw new Error('Only the target engineer can reject this call');
    }

    // Validate current status
    if (request.status !== 'pending') {
      throw new Error(`Cannot reject call with status: ${request.status}`);
    }

    const updatedRequest = this.requestStore.updateStatus(requestId, 'rejected');
    if (!updatedRequest) {
      throw new Error('Failed to reject call');
    }

    console.debug('ScreenShareManager: Engineer rejected call', requestId);
    return updatedRequest;
  }

  /**
   * Start a screen share session after request is accepted
   * @param requestId - The accepted request ID
   * @param publisher - The customer who will share (must match request)
   * @param subscriber - The engineer who will view (must match request)
   * @returns The created session
   */
  async startSession(
    requestId: string,
    publisher: UserProfile,
    subscriber: UserProfile
  ): Promise<ScreenShareSession> {
    const request = this.requestStore.getById(requestId);
    if (!request) {
      throw new Error('Screen share request not found');
    }

    // Validate request is accepted
    if (request.status !== 'accepted') {
      throw new Error('Can only start session for accepted requests');
    }

    // Check if there's already an active session for this ticket
    const existingSession = this.sessionStore.getActiveByTicketId(this.ticketId);
    if (existingSession) {
      throw new Error('There is already an active screen share session for this ticket');
    }

    // Validate users match the request
    // For engineer-initiated requests: customer publishes, engineer subscribes
    // For customer-initiated requests: customer publishes, engineer subscribes
    let expectedPublisher: UserProfile;
    let expectedSubscriber: UserProfile;

    if (request.requestedBy.type === 'engineer') {
      // Engineer requested from customer
      expectedPublisher = request.requestedFrom; // customer
      expectedSubscriber = request.requestedBy; // engineer
    } else {
      // Customer requested from engineer (call)
      expectedPublisher = request.requestedBy; // customer
      expectedSubscriber = request.requestedFrom; // engineer
    }

    if (publisher.id !== expectedPublisher.id) {
      throw new Error('Publisher must be the customer involved in the request');
    }
    if (subscriber.id !== expectedSubscriber.id) {
      throw new Error('Subscriber must be the engineer involved in the request');
    }

    // Create session record first
    const session = this.sessionStore.create({
      ticketId: this.ticketId,
      requestId,
      publisher,
      subscriber,
      status: 'initializing',
    });

    try {
      // Initialize WebRTC connection immediately
      console.debug('ScreenShareManager: Initializing WebRTC connection for session', session.id);

      // Create WebRTC manager instance for publisher
      this.publisherWebrtcManager = await createWebRTCManager(
        session.id,
        publisher,  // local user (publisher)
        subscriber, // remote user (subscriber)
        true,       // isPublisher = true for customer
        this.signalingStore
      );

      // Initialize the WebRTC connection
      await this.publisherWebrtcManager.initializeConnection();

      // Track current session for WebRTC events
      this.currentSessionId = session.id;

      // Keep session in initializing state until WebRTC is fully connected
      this.webrtcState = 'connecting';
      this.syncSessionWithWebRTCState(this.webrtcState);
      console.debug('ScreenShareManager: WebRTC connection initialized for session', session.id);

      return session;
    } catch (error) {
      // If WebRTC initialization fails, mark session as error and cleanup
      console.error('ScreenShareManager: Failed to initialize WebRTC for session', session.id, error);

      this.webrtcState = 'failed';
      this.syncSessionWithWebRTCState(this.webrtcState);

      // Cleanup WebRTC managers
      if (this.publisherWebrtcManager) {
        this.publisherWebrtcManager.dispose();
        this.publisherWebrtcManager = null;
      }
      if (this.subscriberWebrtcManager) {
        this.subscriberWebrtcManager.dispose();
        this.subscriberWebrtcManager = null;
      }

      throw new Error(`Failed to initialize WebRTC connection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Customer publishes their stream (starts screen capture and WebRTC publishing)
   * @param sessionId - The session ID
   * @returns The updated session with stream details
   */
  async publishStream(sessionId: string): Promise<ScreenShareSession> {
    const session = this.sessionStore.getById(sessionId);
    if (!session) {
      throw new Error('Screen share session not found');
    }

    // Validate session is in correct state
    if (session.status !== 'initializing') {
      throw new Error('Can only publish stream for initializing sessions');
    }

    // Validate publisher WebRTC manager is available
    if (!this.publisherWebrtcManager) {
      throw new Error('Publisher WebRTC connection not initialized - call startSession first');
    }

    try {
      console.debug('ScreenShareManager: Starting screen capture for session', sessionId);

      // Start actual screen capture via WebRTC
      const mediaStream = await this.publisherWebrtcManager.startScreenSharing();

      // Update session with actual stream details
      const updatedSession = this.sessionStore.update(sessionId, {
        status: 'active',
        streamId: mediaStream.id,
      });

      if (!updatedSession) {
        throw new Error('Failed to update session with stream details');
      }

      this.webrtcState = 'connected';
      this.syncSessionWithWebRTCState(this.webrtcState);
      console.debug('ScreenShareManager: Screen sharing started, stream ID:', mediaStream.id);

      return updatedSession;
    } catch (error) {
      // If screen capture fails, mark session as error
      console.error('ScreenShareManager: Failed to start screen sharing for session', sessionId, error);

      this.webrtcState = 'failed';
      this.syncSessionWithWebRTCState(this.webrtcState);

      throw new Error(`Failed to start screen sharing: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Engineer subscribes to an active stream (sets up WebRTC subscription)
   * @param sessionId - The session ID to subscribe to
   * @returns The session with stream details
   */
  async subscribeToStream(sessionId: string): Promise<ScreenShareSession> {
    const session = this.sessionStore.getById(sessionId);
    if (!session) {
      throw new Error('Screen share session not found');
    }

    // Validate session is active and has a stream
    if (session.status !== 'active') {
      throw new Error('Can only subscribe to active sessions');
    }

    if (!session.streamId) {
      throw new Error('Session does not have an active stream');
    }

    try {
      console.debug('ScreenShareManager: Setting up WebRTC subscription for session', sessionId);

      // If subscriber WebRTC manager doesn't exist, initialize it for the subscriber (engineer)
      if (!this.subscriberWebrtcManager) {
        console.debug('ScreenShareManager: Initializing WebRTC connection for subscriber (engineer)');

        // Create WebRTC manager instance for the subscriber
        this.subscriberWebrtcManager = await createWebRTCManager(
          sessionId,
          session.subscriber,  // local user (engineer)
          session.publisher,   // remote user (customer)
          false,               // isPublisher = false for engineer (subscriber)
          this.signalingStore
        );

        // Initialize the WebRTC connection
        await this.subscriberWebrtcManager.initializeConnection();

        // Track current session for WebRTC events
        this.currentSessionId = sessionId;

        this.webrtcState = 'connecting';
        console.debug('ScreenShareManager: WebRTC connection initialized for subscriber');
      }

      // The WebRTC manager will automatically handle signaling (offers, answers, ICE candidates)
      // through its internal event listeners. No need to manually process offers here.
      this.webrtcState = 'connected';
      this.syncSessionWithWebRTCState(this.webrtcState);
      console.debug('ScreenShareManager: Engineer ready to subscribe to stream', session.streamId);

      return session;
    } catch (error) {
      console.error('ScreenShareManager: Failed to setup subscription for session', sessionId, error);

      this.webrtcState = 'failed';
      this.syncSessionWithWebRTCState(this.webrtcState);
      this.subscriberWebrtcManager = null;

      throw new Error(`Failed to setup stream subscription: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * End a screen share session
   * @param sessionId - The session ID to end
   * @param user - The user ending the session (must be publisher or subscriber)
   * @returns The ended session
   */
  endSession(sessionId: string, user: UserProfile): ScreenShareSession {
    const session = this.sessionStore.getById(sessionId);
    if (!session) {
      throw new Error('Screen share session not found');
    }

    // Validate user can end this session
    if (session.publisher.id !== user.id && session.subscriber.id !== user.id) {
      throw new Error('Only the publisher or subscriber can end the session');
    }

    // Validate session can be ended
    if (session.status === 'ended') {
      throw new Error('Session is already ended');
    }

    try {
      // Cleanup WebRTC resources first
      if (this.publisherWebrtcManager) {
        console.debug('ScreenShareManager: Cleaning up publisher WebRTC resources for session', sessionId);
        this.publisherWebrtcManager.stopScreenSharing();
        this.publisherWebrtcManager = null;
      }
      if (this.subscriberWebrtcManager) {
        console.debug('ScreenShareManager: Cleaning up subscriber WebRTC resources for session', sessionId);
        this.subscriberWebrtcManager.dispose();
        this.subscriberWebrtcManager = null;
      }

      this.webrtcState = 'closed';

      // End session record
      const endedSession = this.sessionStore.endSession(sessionId);
      if (!endedSession) {
        throw new Error('Failed to end session');
      }

      console.debug('ScreenShareManager: Ended session', sessionId);
      return endedSession;
    } catch (error) {
      console.error('ScreenShareManager: Error ending session', sessionId, error);

      // Still try to end the session record even if WebRTC cleanup fails
      const endedSession = this.sessionStore.endSession(sessionId);

      // Cleanup WebRTC state regardless
      if (this.publisherWebrtcManager) {
        this.publisherWebrtcManager.dispose();
        this.publisherWebrtcManager = null;
      }
      if (this.subscriberWebrtcManager) {
        this.subscriberWebrtcManager.dispose();
        this.subscriberWebrtcManager = null;
      }
      this.webrtcState = 'closed';

      if (!endedSession) {
        throw new Error('Failed to end session');
      }

      return endedSession;
    }
  }

  /**
   * Cancel/delete a screen share request
   * @param requestId - The request ID to cancel
   * @param user - The user canceling (must be the requester)
   * @returns True if canceled successfully
   */
  cancelRequest(requestId: string, user: UserProfile): boolean {
    const request = this.requestStore.getById(requestId);
    if (!request) {
      throw new Error('Screen share request not found');
    }

    // Validate user can cancel this request
    if (request.requestedBy.id !== user.id) {
      throw new Error('Only the requester can cancel the request');
    }

    // Validate request can be canceled
    if (request.status === 'cancelled') {
      throw new Error('Request is already cancelled');
    }

    const deleted = this.requestStore.delete(requestId);
    if (!deleted) {
      throw new Error('Failed to cancel request');
    }

    console.debug('ScreenShareManager: Cancelled request', requestId);
    return true;
  }

  /**
   * Reloads screen share data from storage
   * Used to sync with changes made in the same tab (for demo/testing)
   */
  reload(): void {
    this.requestStore.reload();
    this.sessionStore.reload();
    console.debug('ScreenShareManager: Reloaded data from storage');
  }

  /**
   * Get the active screen share request for this ticket
   * @returns The active request or undefined
   */
  getActiveRequest(): ScreenShareRequest | undefined {
    return this.requestStore.getActiveByTicketId(this.ticketId);
  }

  /**
   * Get the active screen share session for this ticket
   * @returns The active session or undefined
   */
  getActiveSession(): ScreenShareSession | undefined {
    return this.sessionStore.getActiveByTicketId(this.ticketId);
  }

  /**
   * Get all requests for this ticket
   * @returns Array of requests
   */
  getAllRequests(): ScreenShareRequest[] {
    return this.requestStore.getByTicketId(this.ticketId);
  }

  /**
   * Get all sessions for this ticket
   * @returns Array of sessions
   */
  getAllSessions(): ScreenShareSession[] {
    return this.sessionStore.getByTicketId(this.ticketId);
  }

  // ===== WebRTC Utility Methods =====

  /**
   * Get current WebRTC connection state
   * @returns Current WebRTC state
   */
  getWebRTCState(): WebRTCState {
    return this.webrtcState;
  }

  /**
   * Register callbacks for ScreenShareManager events
   * @param callbacks - The callback functions to register
   */
  setCallbacks(callbacks: ScreenShareManagerCallbacks): void {
    this.callbacks = { ...callbacks };
  }

  /**
   * Update existing callbacks
   * @param callbacks - The callback functions to update
   */
  updateCallbacks(callbacks: Partial<ScreenShareManagerCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Synchronize session status with WebRTC state changes
   * @param webrtcState - The new WebRTC state
   * @private
   */
  private syncSessionWithWebRTCState(webrtcState: WebRTCState): void {
    const activeSession = this.getActiveSession();
    if (!activeSession) {
      return;
    }

    let newSessionStatus: 'initializing' | 'active' | 'error' | 'disconnected' | undefined;

    switch (webrtcState) {
      case 'connecting':
        // Keep session in initializing state during connection
        newSessionStatus = 'initializing';
        break;
      case 'connected':
        // Session becomes active when WebRTC is connected
        newSessionStatus = 'active';
        break;
      case 'failed':
        // Session goes to error state when WebRTC fails
        newSessionStatus = 'error';
        break;
      case 'disconnected':
        // Session becomes disconnected when WebRTC disconnects
        newSessionStatus = 'disconnected';
        break;
      case 'closed':
        // Session ends when WebRTC is closed
        // Don't update here - endSession handles this
        break;
    }

    if (newSessionStatus && activeSession.status !== newSessionStatus) {
      console.debug('ScreenShareManager: Syncing session status with WebRTC state', {
        sessionId: activeSession.id,
        webrtcState,
        oldStatus: activeSession.status,
        newStatus: newSessionStatus,
      });

      this.sessionStore.update(activeSession.id, { status: newSessionStatus });
    }
  }




  /**
   * Stop screen sharing and cleanup WebRTC connection
   */
  stopScreenSharing(): void {
    if (this.publisherWebrtcManager) {
      this.publisherWebrtcManager.stopScreenSharing();
      this.publisherWebrtcManager = null;
    }
    if (this.subscriberWebrtcManager) {
      this.subscriberWebrtcManager.dispose();
      this.subscriberWebrtcManager = null;
    }

    this.webrtcState = 'closed';
    // Note: Don't sync session state here as this is called from endSession
    console.debug('ScreenShareManager: Screen sharing stopped and WebRTC connection closed');
  }

  /**
   * Get the local media stream (if available)
   * @returns The local media stream or null
   */
  getLocalStream(): MediaStream | null {
    // Local stream comes from the publisher WebRTC manager
    return this.publisherWebrtcManager?.getLocalStream() || null;
  }

  /**
   * Get the remote media stream (if available)
   * @returns The remote media stream or null
   */
  getRemoteStream(): MediaStream | null {
    // Remote stream comes from the subscriber WebRTC manager
    return this.subscriberWebrtcManager?.getRemoteStream() || null;
  }


  /**
   * Set up WebRTC event listeners to track stream availability
   * @private
   */
  private setupWebRTCEventListeners(): void {
    this.webrtcListener = new WebRTCListener({
      // Listen for remote stream events
      onWebRTCRemoteStream: (sessionId, streamInfo, _localUser, _remoteUser) => {
        // Only handle events for our current session
        if (sessionId === this.currentSessionId) {
          console.debug('ScreenShareManager: Remote stream received for session', sessionId, streamInfo);

          // Get the actual MediaStream object from the subscriber WebRTC manager
          const remoteStream = this.subscriberWebrtcManager?.getRemoteStream();
          if (remoteStream && this.callbacks.onRemoteStreamAvailable) {
            console.debug('ScreenShareManager: Triggering onRemoteStreamAvailable callback');
            try {
              this.callbacks.onRemoteStreamAvailable(sessionId, remoteStream);
            } catch (error) {
              console.error('ScreenShareManager: Error in onRemoteStreamAvailable callback:', error);
            }
          }
        }
      },

      // Listen for WebRTC state changes
      onWebRTCStateChanged: (sessionId, state, _localUser, _remoteUser) => {
        // Only handle events for our current session
        if (sessionId === this.currentSessionId) {
          console.debug('ScreenShareManager: WebRTC state changed for session', sessionId, 'to', state);
          this.webrtcState = state;
          this.syncSessionWithWebRTCState(state);

          // Trigger callback for state changes
          if (this.callbacks.onWebRTCStateChanged) {
            try {
              this.callbacks.onWebRTCStateChanged(sessionId, state);
            } catch (error) {
              console.error('ScreenShareManager: Error in onWebRTCStateChanged callback:', error);
            }
          }
        }
      },

      // Listen for WebRTC errors
      onWebRTCError: (sessionId, error, _localUser, _remoteUser) => {
        // Only handle events for our current session
        if (sessionId === this.currentSessionId) {
          console.error('ScreenShareManager: WebRTC error for session', sessionId, error);
          this.webrtcState = 'failed';
          this.syncSessionWithWebRTCState('failed');
        }
      },
    });

    // Start listening to WebRTC events
    this.webrtcListener.startListening();
  }

  /**
   * Cleanup WebRTC resources when manager is destroyed
   */
  dispose(): void {
    this.stopScreenSharing();
    this.signalingStore.clear();
    this.currentSessionId = null;
    if (this.webrtcListener) {
      this.webrtcListener.stopListening();
    }
  }
}