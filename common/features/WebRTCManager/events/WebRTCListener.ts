import { type WebRTCState, type WebRTCError, type WebRTCEventType, type UserProfile } from '@common/types';

/**
 * Interface for objects that listen to WebRTC events
 * All methods are optional to allow listeners to subscribe to only the events they care about
 */
export interface WebRTCListenerCallbacks {
  /**
   * Called when WebRTC state changes
   * @param sessionId - The WebRTC session ID
   * @param state - The new WebRTC state
   * @param localUser - The local user
   * @param remoteUser - The remote user
   */
  onWebRTCStateChanged?(sessionId: string, state: WebRTCState, localUser: UserProfile, remoteUser: UserProfile): void;

  /**
   * Called when a WebRTC error occurs
   * @param sessionId - The WebRTC session ID
   * @param error - The WebRTC error
   * @param localUser - The local user
   * @param remoteUser - The remote user
   */
  onWebRTCError?(sessionId: string, error: WebRTCError, localUser: UserProfile, remoteUser: UserProfile): void;

  /**
   * Called when a remote stream is received
   * @param sessionId - The WebRTC session ID
   * @param streamInfo - Information about the remote stream (streams cannot be cross-tab serialized)
   * @param localUser - The local user
   * @param remoteUser - The remote user
   */
  onWebRTCRemoteStream?(sessionId: string, streamInfo: { id: string; active: boolean; videoTracks: number; audioTracks: number }, localUser: UserProfile, remoteUser: UserProfile): void;

  /**
   * Called when an ICE candidate is generated
   * @param sessionId - The WebRTC session ID
   * @param candidate - The ICE candidate
   * @param localUser - The local user
   * @param remoteUser - The remote user
   */
  onWebRTCIceCandidate?(sessionId: string, candidate: RTCIceCandidateInit, localUser: UserProfile, remoteUser: UserProfile): void;

  /**
   * Called when a WebRTC offer is created
   * @param sessionId - The WebRTC session ID
   * @param offer - The WebRTC offer
   * @param localUser - The local user
   * @param remoteUser - The remote user
   */
  onWebRTCOfferCreated?(sessionId: string, offer: RTCSessionDescriptionInit, localUser: UserProfile, remoteUser: UserProfile): void;

  /**
   * Called when a WebRTC answer is created
   * @param sessionId - The WebRTC session ID
   * @param answer - The WebRTC answer
   * @param localUser - The local user
   * @param remoteUser - The remote user
   */
  onWebRTCAnswerCreated?(sessionId: string, answer: RTCSessionDescriptionInit, localUser: UserProfile, remoteUser: UserProfile): void;
}

/**
 * Class that manages listening to global WebRTC events
 * Handles both same-tab (window events) and cross-tab (storage events) communication
 */
export class WebRTCListener {
  private callbacks: Partial<WebRTCListenerCallbacks>;
  private isListening: boolean = false;
  private handleStorageEvent: ((event: StorageEvent) => void) | null = null;
  private handleWindowEvent: ((event: CustomEvent) => void) | null = null;

  constructor(callbacks: Partial<WebRTCListenerCallbacks>) {
    this.callbacks = callbacks;
  }

  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<WebRTCListenerCallbacks>): void {
    this.callbacks = callbacks;
  }

  /**
   * Starts listening to both storage events (cross-tab) and window events (same-tab)
   */
  startListening(): void {
    if (this.isListening || typeof window === 'undefined') return;

    // Listen for storage events (cross-tab communication)
    this.handleStorageEvent = (event: StorageEvent) => {

      // Only process events for our specific key
      if (event.key !== 'webrtcstore-event' || !event.newValue) return;

      console.debug('WebRTCListener: Processing WebRTC storage event');

      try {
        const eventData = JSON.parse(event.newValue);
        this.processEventData(eventData);
      } catch (error) {
        console.error('WebRTCListener: Error parsing storage event data:', error);
      }
    };

    // Listen for window events (same-tab communication)
    this.handleWindowEvent = (event: CustomEvent) => {
      console.debug('WebRTCListener: Received window event', event.detail?.type);
      try {
        this.processEventData(event.detail);
      } catch (error) {
        console.error('WebRTCListener: Error processing window event data:', error);
      }
    };

    window.addEventListener('storage', this.handleStorageEvent);
    window.addEventListener('webrtc-event', this.handleWindowEvent as EventListener);
    this.isListening = true;
    console.debug('WebRTCListener: Started listening to global WebRTC events via storage and window events');
  }

  /**
   * Processes event data from either storage or window events
   */
  private processEventData(eventData: Record<string, unknown>): void {
    try {
      const {
        type,
        sessionId,
        state,
        error,
        streamInfo,
        candidate,
        offer,
        answer,
        localUser,
        remoteUser
      } = eventData as {
        type?: string;
        sessionId?: string;
        state?: unknown;
        error?: unknown;
        streamInfo?: unknown;
        candidate?: unknown;
        offer?: unknown;
        answer?: unknown;
        localUser?: { id?: string };
        remoteUser?: { id?: string };
      };

      console.debug('WebRTCListener: Parsed event data', {
        type,
        sessionId,
        hasStreamInfo: !!streamInfo,
        localUser: localUser?.id,
        remoteUser: remoteUser?.id
      });

      switch (type as WebRTCEventType) {
        case 'webrtcStateChanged':
          if (this.callbacks.onWebRTCStateChanged && sessionId && state && localUser && remoteUser) {
            try {
              this.callbacks.onWebRTCStateChanged(sessionId, state, localUser, remoteUser);
            } catch (error) {
              console.error('WebRTCListener: Error in onWebRTCStateChanged:', error);
            }
          }
          break;

        case 'webrtcError':
          if (this.callbacks.onWebRTCError && sessionId && error && localUser && remoteUser) {
            try {
              this.callbacks.onWebRTCError(sessionId, error, localUser, remoteUser);
            } catch (callbackError) {
              console.error('WebRTCListener: Error in onWebRTCError:', callbackError);
            }
          }
          break;

        case 'webrtcRemoteStream':
          if (this.callbacks.onWebRTCRemoteStream && sessionId && streamInfo && localUser && remoteUser) {
            try {
              this.callbacks.onWebRTCRemoteStream(sessionId, streamInfo, localUser, remoteUser);
            } catch (error) {
              console.error('WebRTCListener: Error in onWebRTCRemoteStream:', error);
            }
          }
          break;

        case 'webrtcIceCandidate':
          if (this.callbacks.onWebRTCIceCandidate && sessionId && candidate && localUser && remoteUser) {
            try {
              this.callbacks.onWebRTCIceCandidate(sessionId, candidate, localUser, remoteUser);
            } catch (error) {
              console.error('WebRTCListener: Error in onWebRTCIceCandidate:', error);
            }
          }
          break;

        case 'webrtcOfferCreated':
          if (this.callbacks.onWebRTCOfferCreated && sessionId && offer && localUser && remoteUser) {
            try {
              this.callbacks.onWebRTCOfferCreated(sessionId, offer, localUser, remoteUser);
            } catch (error) {
              console.error('WebRTCListener: Error in onWebRTCOfferCreated:', error);
            }
          }
          break;

        case 'webrtcAnswerCreated':
          if (this.callbacks.onWebRTCAnswerCreated && sessionId && answer && localUser && remoteUser) {
            try {
              this.callbacks.onWebRTCAnswerCreated(sessionId, answer, localUser, remoteUser);
            } catch (error) {
              console.error('WebRTCListener: Error in onWebRTCAnswerCreated:', error);
            }
          }
          break;
      }
    } catch (error) {
      console.error('WebRTCListener: Error processing event data:', error);
    }
  }

  /**
   * Stops listening to both storage and window events
   */
  stopListening(): void {
    if (!this.isListening) return;

    if (this.handleStorageEvent) {
      window.removeEventListener('storage', this.handleStorageEvent);
      this.handleStorageEvent = null;
    }

    if (this.handleWindowEvent) {
      window.removeEventListener('webrtc-event', this.handleWindowEvent as EventListener);
      this.handleWindowEvent = null;
    }

    this.isListening = false;
    console.debug('WebRTCListener: Stopped listening to global WebRTC events');
  }

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}