import type { UserProfile, ScreenShareRequest, ScreenShareSession, WebRTCState } from '@common/types';
import { type ScreenShareRequestStore, type ScreenShareSessionStore } from './store';
import { createWebRTCManager, WebRTCSignalingStore, type WebRTCManager } from '@common/features/WebRTCManager';
import { WebRTCListener } from '@common/features/WebRTCManager/events';
import { ScreenShareEventEmitter } from './events';

export class ScreenShareManager {
  private readonly ticketId: string;
  private readonly requestStore: ScreenShareRequestStore;
  private readonly sessionStore: ScreenShareSessionStore;
  private readonly signalingStore: WebRTCSignalingStore;

  // WebRTC connection state - single manager per role
  private webrtcManager: WebRTCManager | null = null;
  private isPublisher: boolean | null = null; // null = no role set yet
  private webrtcState: WebRTCState = 'initializing';
  private currentSessionId: string | null = null;
  private webrtcListener!: WebRTCListener;
  private readonly eventEmitter: ScreenShareEventEmitter;


  constructor(
    ticketId: string,
    requestStore: ScreenShareRequestStore,
    sessionStore: ScreenShareSessionStore
  ) {
    this.ticketId = ticketId;
    this.requestStore = requestStore;
    this.sessionStore = sessionStore;
    this.signalingStore = new WebRTCSignalingStore();
    this.eventEmitter = new ScreenShareEventEmitter();

    console.debug('ScreenShareManager: Constructor called for ticket', ticketId);

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
      sender: engineer,
      receiver: customer,
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
    if (request.receiver.id !== user.id) {
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
      sender: customer,
      receiver: engineer,
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
    if (request.sender.type !== 'customer') {
      throw new Error('This method is only for customer-initiated calls');
    }

    // Validate engineer can accept this call
    if (request.receiver.id !== engineer.id) {
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
    if (request.sender.type !== 'customer') {
      throw new Error('This method is only for customer-initiated calls');
    }

    // Validate engineer can reject this call
    if (request.receiver.id !== engineer.id) {
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
   * Start a screen share session after request is accepted and automatically begin publishing
   * @param requestId - The accepted request ID
   * @param publisher - The customer who will share (must match request)
   * @param subscriber - The engineer who will view (must match request)
   * @returns The active session with stream ready
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

    if (request.sender.type === 'engineer') {
      // Engineer requested from customer
      expectedPublisher = request.receiver; // customer
      expectedSubscriber = request.sender; // engineer
    } else {
      // Customer requested from engineer (call)
      expectedPublisher = request.sender; // customer
      expectedSubscriber = request.receiver; // engineer
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
      // Initialize WebRTC connection for publisher (customer side)
      console.debug('ScreenShareManager: Initializing WebRTC connection for publisher in session', session.id);

      // Create WebRTC manager instance for publisher
      this.webrtcManager = await createWebRTCManager(
        session.id,
        publisher,  // local user (publisher/customer)
        subscriber, // remote user (subscriber/engineer)
        true,       // isPublisher = true for customer
        this.signalingStore
      );

      this.isPublisher = true;

      // Initialize the WebRTC connection
      await this.webrtcManager.initializeConnection();

      // Track current session for WebRTC events
      this.currentSessionId = session.id;

      // Keep session in initializing state until WebRTC is fully connected
      this.webrtcState = 'connecting';
      this.syncSessionWithWebRTCState(this.webrtcState);
      console.debug('ScreenShareManager: WebRTC connection initialized for session', session.id);

      // Now automatically start screen capture and publishing
      console.debug('ScreenShareManager: Starting screen capture for session', session.id);

      const mediaStream = await this.webrtcManager.startScreenSharing();

      // Update session to active with stream details
      const activeSession = this.sessionStore.update(session.id, {
        status: 'active',
        streamId: mediaStream.id,
      });

      if (!activeSession) {
        throw new Error('Failed to update session with stream details');
      }

      this.webrtcState = 'connected';
      this.syncSessionWithWebRTCState(this.webrtcState);
      console.debug('ScreenShareManager: Screen sharing started automatically, stream ID:', mediaStream.id);

      return activeSession;
    } catch (error) {
      // If WebRTC initialization or publishing fails, mark session as error and cleanup
      console.error('ScreenShareManager: Failed to initialize session or start publishing', session.id, error);

      this.webrtcState = 'failed';
      this.syncSessionWithWebRTCState(this.webrtcState);

      // Cleanup WebRTC manager
      if (this.webrtcManager) {
        this.webrtcManager.dispose();
        this.webrtcManager = null;
        this.isPublisher = null;
      }

      throw new Error(`Failed to initialize and start screen sharing: ${error instanceof Error ? error.message : String(error)}`);
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

      // If WebRTC manager doesn't exist, initialize it for the subscriber (engineer)
      if (!this.webrtcManager) {
        console.debug('ScreenShareManager: Initializing WebRTC connection for subscriber (engineer)');

        // Create WebRTC manager instance for the subscriber
        this.webrtcManager = await createWebRTCManager(
          sessionId,
          session.subscriber,  // local user (engineer)
          session.publisher,   // remote user (customer)
          false,               // isPublisher = false for engineer (subscriber)
          this.signalingStore
        );

        this.isPublisher = false;

        // Initialize the WebRTC connection
        await this.webrtcManager.initializeConnection();

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
      this.webrtcManager = null;
      this.isPublisher = null;

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
      if (this.webrtcManager) {
        console.debug('ScreenShareManager: Cleaning up WebRTC resources for session', sessionId);
        if (this.isPublisher) {
          this.webrtcManager.stopScreenSharing();
        } else {
          this.webrtcManager.dispose();
        }
        this.webrtcManager = null;
        this.isPublisher = null;
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
      if (this.webrtcManager) {
        this.webrtcManager.dispose();
        this.webrtcManager = null;
        this.isPublisher = null;
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
    if (request.sender.id !== user.id) {
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
      case 'streaming':
        // Session is active and streaming when WebRTC is streaming
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
    if (this.webrtcManager) {
      if (this.isPublisher) {
        this.webrtcManager.stopScreenSharing();
      } else {
        this.webrtcManager.dispose();
      }
      this.webrtcManager = null;
      this.isPublisher = null;
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
    // Local stream comes from the WebRTC manager when acting as publisher
    return (this.isPublisher && this.webrtcManager) ? this.webrtcManager.getLocalStream() : null;
  }

  /**
   * Get the remote media stream (if available)
   * @returns The remote media stream or null
   */
  getRemoteStream(): MediaStream | null {
    // Remote stream comes from the WebRTC manager when acting as subscriber
    return (this.isPublisher === false && this.webrtcManager) ? this.webrtcManager.getRemoteStream() : null;
  }


  /**
   * Set up WebRTC event listeners to track stream availability
   * @private
   */
  private setupWebRTCEventListeners(): void {
    console.debug('ScreenShareManager: Setting up WebRTC event listeners for ticket', this.ticketId);
    this.webrtcListener = new WebRTCListener({
      // Listen for remote stream events
      onWebRTCRemoteStream: (sessionId, streamInfo, _localUser, _remoteUser) => {
        console.debug('ScreenShareManager: WebRTC remote stream event received', {
          sessionId,
          currentSessionId: this.currentSessionId,
          ticketId: this.ticketId,
          localUser: _localUser?.id,
          remoteUser: _remoteUser?.id,
          streamInfo
        });

        // Only handle events for our current session
        if (sessionId === this.currentSessionId) {
          console.debug('ScreenShareManager: Remote stream received for session', sessionId, streamInfo);

          // Get the actual MediaStream object from the WebRTC manager (when subscriber)
          const remoteStream = this.getRemoteStream();
          if (remoteStream) {
            console.debug('ScreenShareManager: Remote stream available, emitting event');
            // Emit event instead of using callback
            this.eventEmitter.emitScreenShareRemoteStreamAvailable(sessionId, this.ticketId);
          } else {
            console.debug('ScreenShareManager: No remote stream found in subscriber manager');
          }
        } else {
          console.debug('ScreenShareManager: Session ID mismatch, ignoring remote stream event');
        }
      },

      // Listen for WebRTC state changes
      onWebRTCStateChanged: (sessionId, state, _localUser, _remoteUser) => {
        // Only handle events for our current session
        if (sessionId === this.currentSessionId) {
          console.debug('ScreenShareManager: WebRTC state changed for session', sessionId, 'to', state);
          this.webrtcState = state;
          this.syncSessionWithWebRTCState(state);
          // State changes are handled by updating the session, no need for additional events
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
   * Reset manager state without destroying listeners (for reuse)
   */
  reset(): void {
    this.stopScreenSharing();
    this.signalingStore.clear();
    this.currentSessionId = null;
    this.webrtcState = 'initializing';
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