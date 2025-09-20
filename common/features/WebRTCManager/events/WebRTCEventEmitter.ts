import { type WebRTCState, type WebRTCError, type WebRTCEventType, type UserProfile } from '@common/types';

/**
 * Event emitter for WebRTC-related events
 * Abstracts the underlying event mechanism to allow for future technology changes
 */
export class WebRTCEventEmitter {
  constructor() {
    // No need for local listeners - everything goes through window events
  }

  /**
   * Emits a WebRTC state change event
   * @param sessionId - The WebRTC session ID
   * @param state - The new WebRTC state
   * @param localUser - The local user
   * @param remoteUser - The remote user
   */
  emitWebRTCStateChanged(sessionId: string, state: WebRTCState, localUser: UserProfile, remoteUser: UserProfile): void {
    this.emitWindowEvent('webrtcStateChanged', { sessionId, state, localUser, remoteUser });
  }

  /**
   * Emits a WebRTC error event
   * @param sessionId - The WebRTC session ID
   * @param error - The WebRTC error
   * @param localUser - The local user
   * @param remoteUser - The remote user
   */
  emitWebRTCError(sessionId: string, error: WebRTCError, localUser: UserProfile, remoteUser: UserProfile): void {
    this.emitWindowEvent('webrtcError', { sessionId, error, localUser, remoteUser });
  }

  /**
   * Emits a remote stream received event
   * @param sessionId - The WebRTC session ID
   * @param stream - The remote MediaStream (note: streams cannot be serialized, so we send metadata)
   * @param localUser - The local user
   * @param remoteUser - The remote user
   */
  emitWebRTCRemoteStream(sessionId: string, stream: MediaStream, localUser: UserProfile, remoteUser: UserProfile): void {
    // We can't serialize MediaStream, so we send metadata about it
    const streamInfo = {
      id: stream.id,
      active: stream.active,
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
    };
    this.emitWindowEvent('webrtcRemoteStream', { sessionId, streamInfo, localUser, remoteUser });
  }

  /**
   * Emits an ICE candidate event
   * @param sessionId - The WebRTC session ID
   * @param candidate - The ICE candidate
   * @param localUser - The local user
   * @param remoteUser - The remote user
   */
  emitWebRTCIceCandidate(sessionId: string, candidate: RTCIceCandidateInit, localUser: UserProfile, remoteUser: UserProfile): void {
    this.emitWindowEvent('webrtcIceCandidate', { sessionId, candidate, localUser, remoteUser });
  }

  /**
   * Emits an offer created event
   * @param sessionId - The WebRTC session ID
   * @param offer - The WebRTC offer
   * @param localUser - The local user
   * @param remoteUser - The remote user
   */
  emitWebRTCOfferCreated(sessionId: string, offer: RTCSessionDescriptionInit, localUser: UserProfile, remoteUser: UserProfile): void {
    this.emitWindowEvent('webrtcOfferCreated', { sessionId, offer, localUser, remoteUser });
  }

  /**
   * Emits an answer created event
   * @param sessionId - The WebRTC session ID
   * @param answer - The WebRTC answer
   * @param localUser - The local user
   * @param remoteUser - The remote user
   */
  emitWebRTCAnswerCreated(sessionId: string, answer: RTCSessionDescriptionInit, localUser: UserProfile, remoteUser: UserProfile): void {
    this.emitWindowEvent('webrtcAnswerCreated', { sessionId, answer, localUser, remoteUser });
  }

  /**
   * Emits events for both same-tab and cross-tab communication
   */
  private emitWindowEvent(type: WebRTCEventType, data: Record<string, unknown>): void {
    if (typeof window === 'undefined') return; // Skip in non-browser environments

    const eventPayload = {
      type,
      ...data,
      timestamp: Date.now()
    };

    // 1. Emit custom window event for same-tab communication
    const customEvent = new CustomEvent('webrtc-event', {
      detail: eventPayload
    });
    window.dispatchEvent(customEvent);

    // 2. Use localStorage to trigger storage events for cross-tab communication
    const eventKey = 'webrtcstore-event';
    localStorage.setItem(eventKey, JSON.stringify(eventPayload));

    // Clean up immediately to avoid cluttering localStorage
    localStorage.removeItem(eventKey);

    console.debug('WebRTCEventEmitter: Emitting both window and storage events:', type, data);
  }
}