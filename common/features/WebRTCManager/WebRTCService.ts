import type { UserProfile, WebRTCState, WebRTCError, WebRTCSignal } from '@common/types';
import type { WebRTCSignalingStore } from './store';
import { ICEServerService } from './ICEServerService';
import { WebRTCEventEmitter } from './events';

export interface WebRTCServiceConfig {
  sessionId: string;
  localUser: UserProfile;
  remoteUser: UserProfile;
  isPublisher: boolean; // true for customer (publisher), false for engineer (subscriber)
  signalingStore: WebRTCSignalingStore;
}

export class WebRTCService {
  private readonly sessionId: string;
  private readonly localUser: UserProfile;
  private readonly remoteUser: UserProfile;
  private readonly isPublisher: boolean;
  private readonly signalingStore: WebRTCSignalingStore;
  private readonly eventEmitter: WebRTCEventEmitter;

  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private state: WebRTCState = 'initializing';
  private signalPollingInterval: number | null = null;


  constructor(config: WebRTCServiceConfig) {
    this.sessionId = config.sessionId;
    this.localUser = config.localUser;
    this.remoteUser = config.remoteUser;
    this.isPublisher = config.isPublisher;
    this.signalingStore = config.signalingStore;
    this.eventEmitter = new WebRTCEventEmitter();

    console.debug(`WebRTCService: Created for session ${this.sessionId}`, {
      localUser: `${this.localUser.id} (${this.localUser.type})`,
      remoteUser: `${this.remoteUser.id} (${this.remoteUser.type})`,
      isPublisher: this.isPublisher,
      role: this.isPublisher ? 'PUBLISHER' : 'SUBSCRIBER'
    });
  }


  /**
   * Gets current WebRTC state
   */
  getState(): WebRTCState {
    return this.state;
  }

  /**
   * Gets local media stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Gets remote media stream
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Initializes the WebRTC connection
   */
  async initializeConnection(): Promise<void> {
    try {
      this.setState('initializing');

      // Get ICE servers
      const iceConfig = await ICEServerService.getICEServers();
      if (iceConfig.error) {
        console.warn('WebRTCService: ICE server configuration warning', iceConfig.error);
      }

      // Create peer connection
      const config = ICEServerService.createPeerConnectionConfig(iceConfig.iceServers);
      this.peerConnection = new RTCPeerConnection(config);

      // Set up event listeners
      this.setupPeerConnectionEventListeners();

      // Start polling for signals
      this.startSignalPolling();

      this.setState('connecting');
      console.debug('WebRTCService: Initialized peer connection for session', this.sessionId);

    } catch (error) {
      const webrtcError: WebRTCError = {
        type: 'connection',
        message: 'Failed to initialize WebRTC connection',
        details: error instanceof Error ? error.message : error,
      };
      this.handleError(webrtcError);
      throw error;
    }
  }

  /**
   * Starts screen capture (publisher only)
   */
  async startScreenCapture(): Promise<MediaStream> {
    if (!this.isPublisher) {
      throw new Error('Only publishers can start screen capture');
    }

    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.debug('WebRTCService: Starting screen capture');

      // Request screen capture
      this.localStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false, // Screen sharing audio can be complex, start without it
      });

      // Add stream to peer connection
      this.localStream.getTracks().forEach(track => {
        const sender = this.peerConnection!.addTrack(track, this.localStream!);
        console.debug('WebRTCService: Added track to peer connection', {
          trackId: track.id,
          trackKind: track.kind,
          trackEnabled: track.enabled,
          trackMuted: track.muted,
          trackReadyState: track.readyState,
          senderActive: !!sender
        });
      });

      // Handle stream ending (user stops sharing)
      this.localStream.getVideoTracks()[0].addEventListener('ended', () => {
        console.debug('WebRTCService: Screen sharing ended by user');
        this.stopScreenCapture();
      });

      console.debug('WebRTCService: Screen capture started', {
        tracks: this.localStream.getTracks().length,
        videoTrack: !!this.localStream.getVideoTracks()[0],
      });

      return this.localStream;

    } catch (error) {
      const webrtcError: WebRTCError = {
        type: 'media',
        message: 'Failed to start screen capture',
        details: error instanceof Error ? error.message : error,
      };
      this.handleError(webrtcError);
      throw error;
    }
  }

  /**
   * Stops screen capture
   */
  stopScreenCapture(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
      console.debug('WebRTCService: Stopped screen capture');
    }
  }

  /**
   * Creates WebRTC offer (usually called by publisher)
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.debug('WebRTCService: Creating offer');

      // For publisher: don't specify constraints to let browser handle based on added tracks
      // For subscriber: specify we want to receive video
      const offerOptions = this.isPublisher
        ? {}
        : { offerToReceiveVideo: true, offerToReceiveAudio: false };

      const offer = await this.peerConnection.createOffer(offerOptions);

      await this.peerConnection.setLocalDescription(offer);

      // Send offer through signaling
      this.sendSignal('offer', offer);

      // Emit event for cross-tab communication
      this.eventEmitter.emitWebRTCOfferCreated(
        this.sessionId,
        offer,
        this.localUser,
        this.remoteUser
      );

      console.debug('WebRTCService: Created and sent offer');
      return offer;

    } catch (error) {
      const webrtcError: WebRTCError = {
        type: 'signaling',
        message: 'Failed to create WebRTC offer',
        details: error instanceof Error ? error.message : error,
      };
      this.handleError(webrtcError);
      throw error;
    }
  }

  /**
   * Handles WebRTC offer and creates answer (usually called by subscriber)
   */
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.debug('WebRTCService: Handling offer');

      await this.peerConnection.setRemoteDescription(offer);

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer through signaling
      this.sendSignal('answer', answer);

      // Emit event for cross-tab communication
      this.eventEmitter.emitWebRTCAnswerCreated(
        this.sessionId,
        answer,
        this.localUser,
        this.remoteUser
      );

      console.debug('WebRTCService: Created and sent answer');
      return answer;

    } catch (error) {
      const webrtcError: WebRTCError = {
        type: 'signaling',
        message: 'Failed to handle WebRTC offer',
        details: error instanceof Error ? error.message : error,
      };
      this.handleError(webrtcError);
      throw error;
    }
  }

  /**
   * Handles WebRTC answer
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.debug('WebRTCService: Handling answer');

      await this.peerConnection.setRemoteDescription(answer);

      console.debug('WebRTCService: Set remote description from answer');

    } catch (error) {
      const webrtcError: WebRTCError = {
        type: 'signaling',
        message: 'Failed to handle WebRTC answer',
        details: error instanceof Error ? error.message : error,
      };
      this.handleError(webrtcError);
      throw error;
    }
  }

  /**
   * Handles ICE candidate
   */
  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.debug('WebRTCService: Added ICE candidate');

    } catch (error) {
      console.warn('WebRTCService: Failed to add ICE candidate', error);
      // Don't throw here as ICE candidates can fail without breaking the connection
    }
  }

  /**
   * Disposes of the WebRTC service and cleans up resources
   */
  dispose(): void {
    console.debug(`WebRTCService: Disposing service for ${this.localUser.type} ${this.localUser.id} (${this.isPublisher ? 'PUBLISHER' : 'SUBSCRIBER'}) in session ${this.sessionId}`);

    // Stop signal polling
    if (this.signalPollingInterval) {
      console.debug(`WebRTCService: Stopping signal polling for ${this.localUser.type} ${this.localUser.id} (${this.isPublisher ? 'PUBLISHER' : 'SUBSCRIBER'}) in session ${this.sessionId}`);
      clearInterval(this.signalPollingInterval);
      this.signalPollingInterval = null;
    }

    // Stop local stream
    this.stopScreenCapture();

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Clear streams
    this.localStream = null;
    this.remoteStream = null;

    // Clean up signaling data for this session
    this.signalingStore.deleteBySessionId(this.sessionId);

    this.setState('closed');
  }

  /**
   * Sets up peer connection event listeners
   */
  private setupPeerConnectionEventListeners(): void {
    if (!this.peerConnection) return;

    // ICE candidate event
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.debug('WebRTCService: Generated ICE candidate');
        const candidateInit = event.candidate.toJSON();

        // Send signal for peer-to-peer communication
        this.sendSignal('ice-candidate', candidateInit);

        // Emit event for cross-tab communication
        this.eventEmitter.emitWebRTCIceCandidate(
          this.sessionId,
          candidateInit,
          this.localUser,
          this.remoteUser
        );
      }
    };

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const connectionState = this.peerConnection!.connectionState;
      console.debug('WebRTCService: Connection state changed to', connectionState);

      switch (connectionState) {
        case 'connected':
          this.setState('connected');
          break;
        case 'disconnected':
          this.setState('disconnected');
          break;
        case 'failed':
          this.setState('failed');
          this.handleError({
            type: 'connection',
            message: 'WebRTC connection failed',
          });
          break;
        case 'closed':
          this.setState('closed');
          break;
      }
    };

    // ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection!.iceConnectionState;
      console.debug('WebRTCService: ICE connection state changed to', iceState);

      if (iceState === 'failed') {
        this.handleError({
          type: 'ice',
          message: 'ICE connection failed',
        });
      }
    };

    // Remote stream
    this.peerConnection.ontrack = (event) => {
      console.debug('WebRTCService: Received remote track');

      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.setState('streaming');

        // Emit event for cross-tab communication
        this.eventEmitter.emitWebRTCRemoteStream(
          this.sessionId,
          this.remoteStream,
          this.localUser,
          this.remoteUser
        );
      }
    };
  }

  /**
   * Sends a signal through the signaling store
   */
  private sendSignal(type: WebRTCSignal['type'], payload: any): void {
    this.signalingStore.create({
      sessionId: this.sessionId,
      from: this.localUser,
      to: this.remoteUser,
      type,
      payload,
    });
  }

  /**
   * Starts polling for signals
   */
  private startSignalPolling(): void {
    console.debug(`WebRTCService: Starting signal polling for ${this.localUser.type} ${this.localUser.id} (${this.isPublisher ? 'PUBLISHER' : 'SUBSCRIBER'}) in session ${this.sessionId}`);
    // Poll for signals every 1 second
    this.signalPollingInterval = window.setInterval(() => {
      this.processIncomingSignals();
    }, 1000);
  }

  /**
   * Processes incoming signals from the signaling store
   */
  private async processIncomingSignals(): Promise<void> {
    try {
      const unprocessedSignals = this.signalingStore.getUnprocessedForSession(
        this.sessionId,
        this.localUser.id
      );

      console.debug(`WebRTCService: Polling for signals - found ${unprocessedSignals.length} unprocessed signals for ${this.localUser.type} ${this.localUser.id} (${this.isPublisher ? 'PUBLISHER' : 'SUBSCRIBER'}) in session ${this.sessionId}`);
      if (unprocessedSignals.length > 0) {
        unprocessedSignals.forEach(signal => {
          console.debug(`  Signal: ${signal.type} from ${signal.from.type} ${signal.from.id} → ${signal.to.type} ${signal.to.id}`);
        });
      }

      for (const signal of unprocessedSignals) {
        await this.processSignal(signal);
        this.signalingStore.markProcessed(signal.id);
      }

    } catch (error) {
      console.error('WebRTCService: Error processing signals', error);
    }
  }

  /**
   * Processes a single signal
   */
  private async processSignal(signal: WebRTCSignal): Promise<void> {
    console.debug('WebRTCService: Processing signal', signal.type, 'from', signal.from.id);

    try {
      switch (signal.type) {
        case 'offer':
          await this.handleOffer(signal.payload);
          break;

        case 'answer':
          await this.handleAnswer(signal.payload);
          break;

        case 'ice-candidate':
          await this.handleIceCandidate(signal.payload);
          break;

        default:
          console.warn('WebRTCService: Unknown signal type', signal.type);
      }

    } catch (error) {
      console.error('WebRTCService: Error processing signal', signal.type, error);
    }
  }

  /**
   * Sets the state and emits event
   */
  private setState(newState: WebRTCState): void {
    if (this.state !== newState) {
      const previousState = this.state;
      this.state = newState;

      console.debug('WebRTCService: State changed from', previousState, 'to', newState);

      // Emit event for cross-tab communication
      this.eventEmitter.emitWebRTCStateChanged(
        this.sessionId,
        newState,
        this.localUser,
        this.remoteUser
      );
    }
  }

  /**
   * Handles errors and emits event
   */
  private handleError(error: WebRTCError): void {
    console.error('WebRTCService: Error occurred', error);

    // Emit event for cross-tab communication
    this.eventEmitter.emitWebRTCError(
      this.sessionId,
      error,
      this.localUser,
      this.remoteUser
    );

    // Set failed state for connection/ice errors
    if (error.type === 'connection' || error.type === 'ice') {
      this.setState('failed');
    }
  }
}