import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebRTCService } from './WebRTCService';
import { WebRTCSignalingStoreLocal } from './store';
import { ICEServerService } from './ICEServerService';
import type { UserProfile, WebRTCServiceConfig } from '@common/types';

// Mock WebRTCSignalingStoreLocal
vi.mock('./store');
const MockWebRTCSignalingStoreLocal = vi.mocked(WebRTCSignalingStoreLocal);

// Mock RTCPeerConnection
const mockPeerConnection = {
  createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'test-offer' }),
  createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'test-answer' }),
  setLocalDescription: vi.fn().mockResolvedValue(undefined),
  setRemoteDescription: vi.fn().mockResolvedValue(undefined),
  addTrack: vi.fn(),
  addIceCandidate: vi.fn().mockResolvedValue(undefined),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  iceConnectionState: 'new',
  connectionState: 'new',
  onicecandidate: null,
  onconnectionstatechange: null,
  oniceconnectionstatechange: null,
  ontrack: null,
};

global.RTCPeerConnection = vi.fn().mockImplementation(() => {
  return mockPeerConnection;
});

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getDisplayMedia: vi.fn(),
  },
  writable: true,
});

describe('WebRTCService', () => {
  let service: WebRTCService;
  let mockSignalingStore: any;
  let mockEventEmitter: any;
  let mockSignalChanges: any;
  let mockLocalUser: UserProfile;
  let mockRemoteUser: UserProfile;
  let config: WebRTCServiceConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    MockWebRTCSignalingStoreLocal.mockClear();

    // Reset RTCPeerConnection mock
    mockPeerConnection.createOffer.mockResolvedValue({ type: 'offer', sdp: 'test-offer' });
    mockPeerConnection.createAnswer.mockResolvedValue({ type: 'answer', sdp: 'test-answer' });
    mockPeerConnection.setLocalDescription.mockResolvedValue(undefined);
    mockPeerConnection.setRemoteDescription.mockResolvedValue(undefined);
    mockPeerConnection.addTrack.mockClear();
    mockPeerConnection.addIceCandidate.mockResolvedValue(undefined);
    mockPeerConnection.close.mockClear();

    // Ensure the constructor returns our mock
    (global.RTCPeerConnection as any).mockImplementation(() => mockPeerConnection);

    // Mock ICEServerService methods
    vi.spyOn(ICEServerService, 'getICEServers').mockResolvedValue({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'turn:turn.example.com:3478', username: 'test', credential: 'pass' },
      ],
      // No error property means success
    });

    vi.spyOn(ICEServerService, 'createPeerConnectionConfig').mockReturnValue({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'turn:turn.example.com:3478', username: 'test', credential: 'pass' },
      ],
      iceCandidatePoolSize: 10,
      iceTransportPolicy: 'all',
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require',
    });

    mockSignalingStore = {
      create: vi.fn(),
      getUnprocessedForSession: vi.fn().mockResolvedValue([]),
      markProcessed: vi.fn(),
      clear: vi.fn(),
      deleteBySessionId: vi.fn(),
      reload: vi.fn(),
    };
    MockWebRTCSignalingStoreLocal.mockImplementation(() => mockSignalingStore);

    mockEventEmitter = {
      emitWebRTCStateChanged: vi.fn(),
      emitWebRTCError: vi.fn(),
      emitWebRTCRemoteStream: vi.fn(),
      emitWebRTCIceCandidate: vi.fn(),
      emitWebRTCOfferCreated: vi.fn(),
      emitWebRTCAnswerCreated: vi.fn(),
    };

    mockSignalChanges = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    };

    mockLocalUser = {
      id: 'user-123',
      name: 'Alice',
      type: 'customer',
      email: 'alice@example.com',
    };

    mockRemoteUser = {
      id: 'user-456',
      name: 'Bob',
      type: 'engineer',
      email: 'bob@example.com',
    };

    config = {
      ticketId: 'ticket-001',
      sessionId: 'session-789',
      localUser: mockLocalUser,
      remoteUser: mockRemoteUser,
      isPublisher: true,
      signalingStore: mockSignalingStore,
      signalChanges: mockSignalChanges,
      eventEmitter: mockEventEmitter,
    };

    service = new WebRTCService(config);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      // when creating service
      const newService = new WebRTCService(config);

      // then should store configuration and have initial state
      expect(newService).toBeDefined();
      expect(newService.getState()).toBe('initializing');
    });
  });

  describe('basic state management', () => {
    it('should return current state', () => {
      // when getting state
      const state = service.getState();

      // then should return initializing state
      expect(state).toBe('initializing');
    });

    it('should return null for streams initially', () => {
      // when getting streams before initialization
      const localStream = service.getLocalStream();
      const remoteStream = service.getRemoteStream();

      // then should be null
      expect(localStream).toBeNull();
      expect(remoteStream).toBeNull();
    });
  });


  describe('initializeConnection', () => {
    it('should initialize peer connection successfully', async () => {
      // when initializing connection
      await service.initializeConnection();

      // then should create peer connection
      expect(global.RTCPeerConnection).toHaveBeenCalled();
      expect(service.getState()).toBe('connecting');
    });
  });

  describe('startScreenCapture', () => {
    it('should start screen capture successfully', async () => {
      // given initialized connection and mock screen capture
      await service.initializeConnection();

      const mockStream = {
        getTracks: vi.fn().mockReturnValue([{ kind: 'video', addEventListener: vi.fn() }]),
        getVideoTracks: vi.fn().mockReturnValue([{ addEventListener: vi.fn() }]),
        addEventListener: vi.fn(),
      };
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValue(mockStream as any);

      // when starting screen capture
      const stream = await service.startScreenCapture();

      // then should capture screen successfully
      expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled();
      expect(stream).toBe(mockStream);
      expect(service.getLocalStream()).toBe(mockStream);
    });

    it('should handle screen capture rejection', async () => {
      // given initialized connection and user rejects screen capture
      await service.initializeConnection();
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValue(new Error('User denied'));

      // when starting screen capture
      await expect(service.startScreenCapture()).rejects.toThrow('User denied');

      // then should handle error (screen capture failure doesn't change connection state)
      expect(service.getState()).toBe('connecting');
    });
  });

  describe('createOffer', () => {
    it('should create WebRTC offer', async () => {
      // given initialized connection
      await service.initializeConnection();

      // when creating offer
      const offer = await service.createOffer();

      // then should return offer
      expect(mockPeerConnection.createOffer).toHaveBeenCalled();
      expect(offer).toEqual({ type: 'offer', sdp: 'test-offer' });
    });
  });

  describe('handleOffer', () => {
    it('should handle incoming offer and create answer', async () => {
      // given initialized connection
      await service.initializeConnection();
      const offer = { type: 'offer' as const, sdp: 'incoming-offer' };

      // when handling offer
      const answer = await service.handleOffer(offer);

      // then should set remote description and create answer
      expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalledWith(offer);
      expect(mockPeerConnection.createAnswer).toHaveBeenCalled();
      expect(answer).toEqual({ type: 'answer', sdp: 'test-answer' });
    });
  });

  describe('handleAnswer', () => {
    it('should handle incoming answer', async () => {
      // given initialized connection
      await service.initializeConnection();
      const answer = { type: 'answer' as const, sdp: 'incoming-answer' };

      // when handling answer
      await service.handleAnswer(answer);

      // then should set remote description
      expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalledWith(answer);
    });
  });

  describe('stopScreenCapture', () => {
    it('should stop screen capture and cleanup', async () => {
      // given initialized connection and active screen capture
      await service.initializeConnection();

      const mockTrack = { stop: vi.fn() };
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([mockTrack]),
        getVideoTracks: vi.fn().mockReturnValue([{ addEventListener: vi.fn() }]),
        addEventListener: vi.fn(),
      };
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValue(mockStream as any);
      await service.startScreenCapture();

      // when stopping screen capture
      service.stopScreenCapture();

      // then should stop tracks and clear stream
      expect(mockTrack.stop).toHaveBeenCalled();
      expect(service.getLocalStream()).toBeNull();
    });
  });

  describe('dispose', () => {
    it('should dispose and cleanup all resources', async () => {
      // given initialized connection
      await service.initializeConnection();

      // when disposing
      service.dispose();

      // then should cleanup resources
      expect(mockPeerConnection.close).toHaveBeenCalled();
      expect(service.getState()).toBe('closed');
    });
  });

  describe('publisher vs subscriber behavior', () => {
    it('should handle publisher configuration', () => {
      // given publisher configuration
      const publisherConfig = { ...config, isPublisher: true };
      const publisherService = new WebRTCService(publisherConfig);

      // then should be configured as publisher
      expect(publisherService).toBeDefined();
      expect(publisherService.getState()).toBe('initializing');
    });

    it('should handle subscriber configuration', () => {
      // given subscriber configuration
      const subscriberConfig = { ...config, isPublisher: false };
      const subscriberService = new WebRTCService(subscriberConfig);

      // then should be configured as subscriber
      expect(subscriberService).toBeDefined();
      expect(subscriberService.getState()).toBe('initializing');
    });
  });
});