import type { UserProfile, WebRTCState } from '@common/types';
import type { WebRTCSignalingChanges, WebRTCSignalingStore } from '@common/features/WebRTCManager/store';
import type { WebRTCService } from './WebRTCService';
import { type WebRTCEventEmitter } from './events';
import type { ICEServerService } from './ICEServerService';

export class WebRTCManager {
  private readonly sessionId: string;
  private readonly localUser: UserProfile;
  private readonly remoteUser: UserProfile;
  private readonly isPublisher: boolean;
  private readonly webrtcService: WebRTCService;

  constructor(
    sessionId: string,
    localUser: UserProfile,
    remoteUser: UserProfile,
    isPublisher: boolean,
    webrtcService: WebRTCService,
  ) {
    this.sessionId = sessionId;
    this.localUser = localUser;
    this.remoteUser = remoteUser;
    this.isPublisher = isPublisher;
    this.webrtcService = webrtcService;

    console.debug('WebRTCManager: Created for session', this.sessionId, {
      localUser: this.localUser.id,
      remoteUser: this.remoteUser.id,
      isPublisher: this.isPublisher,
    });
  }


  /**
   * Get current WebRTC connection state
   * @returns Current WebRTC state
   */
  getState(): WebRTCState {
    return this.webrtcService.getState();
  }

  /**
   * Initialize WebRTC connection
   * @returns Promise that resolves when connection is established
   */
  async initializeConnection(): Promise<void> {
    try {
      // Note: WebRTCService is now injected and emits events directly through its own event emitter
      // No need to set up callbacks here since events are already being emitted at the service level

      // Initialize the connection
      await this.webrtcService.initializeConnection();

      console.debug('WebRTCManager: WebRTC connection initialized', {
        sessionId: this.sessionId,
        localUser: this.localUser.id,
        remoteUser: this.remoteUser.id,
        isPublisher: this.isPublisher,
      });
    } catch (error) {
      console.error('WebRTCManager: Failed to initialize WebRTC connection', error);
      throw error;
    }
  }

  /**
   * Start screen sharing (for customer/publisher)
   * @returns Promise that resolves with the local media stream
   */
  async startScreenSharing(): Promise<MediaStream> {
    try {
      console.debug('WebRTCManager: Starting screen sharing');
      const stream = await this.webrtcService.startScreenCapture();

      // Create and send offer
      const offer = await this.webrtcService.createOffer();
      console.debug('WebRTCManager: Created WebRTC offer', offer.type);

      return stream;
    } catch (error) {
      console.error('WebRTCManager: Failed to start screen sharing', error);
      throw error;
    }
  }

  /**
   * Accept incoming screen share (for engineer/subscriber)
   * @param offer - The WebRTC offer from the publisher
   * @returns Promise that resolves with the answer
   */
  async acceptScreenShare(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    try {
      console.debug('WebRTCManager: Accepting screen share offer');
      const answer = await this.webrtcService.handleOffer(offer);
      console.debug('WebRTCManager: Created WebRTC answer', answer.type);
      return answer;
    } catch (error) {
      console.error('WebRTCManager: Failed to accept screen share', error);
      throw error;
    }
  }

  /**
   * Handle WebRTC answer (for customer/publisher)
   * @param answer - The WebRTC answer from the subscriber
   * @returns Promise that resolves when answer is processed
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      console.debug('WebRTCManager: Handling screen share answer');
      await this.webrtcService.handleAnswer(answer);
      console.debug('WebRTCManager: WebRTC answer handled successfully');
    } catch (error) {
      console.error('WebRTCManager: Failed to handle screen share answer', error);
      throw error;
    }
  }

  /**
   * Handle ICE candidate exchange
   * @param candidate - The ICE candidate
   * @returns Promise that resolves when candidate is processed
   */
  async handleICECandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.webrtcService.handleIceCandidate(candidate);
    } catch (error) {
      console.error('WebRTCManager: Failed to handle ICE candidate', error);
      throw error;
    }
  }

  /**
   * Stop screen sharing and cleanup WebRTC connection
   */
  stopScreenSharing(): void {
    this.webrtcService.stopScreenCapture();
    this.webrtcService.dispose();

    console.debug('WebRTCManager: Screen sharing stopped and WebRTC connection closed');
  }

  /**
   * Get the local media stream (if available)
   * @returns The local media stream or null
   */
  getLocalStream(): MediaStream | null {
    return this.webrtcService.getLocalStream();
  }

  /**
   * Get the remote media stream (if available)
   * @returns The remote media stream or null
   */
  getRemoteStream(): MediaStream | null {
    return this.webrtcService.getRemoteStream();
  }

  /**
   * Cleanup WebRTC resources when manager is destroyed
   */
  dispose(): void {
    this.stopScreenSharing();
  }
}

/**
 * Factory function to create a WebRTCManager with proper dependency injection
 */
export async function createWebRTCManager(
  ticketId: string,
  sessionId: string,
  localUser: UserProfile,
  remoteUser: UserProfile,
  isPublisher: boolean,
  signalingStore: WebRTCSignalingStore,
  signalChanges: WebRTCSignalingChanges,
  eventEmitter: WebRTCEventEmitter,
  iceServerService: ICEServerService
): Promise<WebRTCManager> {
  // Dynamically import WebRTCService to avoid circular dependencies
  const { WebRTCService } = await import('./WebRTCService');

  // Create WebRTC service with proper configuration
  const webrtcService = new WebRTCService({
    ticketId,
    sessionId,
    localUser,
    remoteUser,
    isPublisher,
    signalingStore,
    signalChanges,
    eventEmitter,
    iceServerService
  });

  // Create and return WebRTCManager with injected service
  return new WebRTCManager(
    sessionId,
    localUser,
    remoteUser,
    isPublisher,
    webrtcService
  );
}