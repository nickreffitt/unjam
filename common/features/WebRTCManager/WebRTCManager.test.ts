import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebRTCManager } from './WebRTCManager';
import { WebRTCSignalingStore } from './store';
import type { UserProfile } from '@common/types';

// Mock WebRTCService
vi.mock('./WebRTCService', () => ({
  WebRTCService: vi.fn().mockImplementation(() => ({
    onStateChange: vi.fn(),
    onError: vi.fn(),
    onRemoteStream: vi.fn(),
    initializeConnection: vi.fn().mockResolvedValue(undefined),
    startScreenCapture: vi.fn().mockResolvedValue({ getTracks: () => [] }),
    createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'test-offer' }),
    handleOffer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'test-answer' }),
    handleAnswer: vi.fn().mockResolvedValue(undefined),
    handleIceCandidate: vi.fn().mockResolvedValue(undefined),
    stopScreenCapture: vi.fn(),
    dispose: vi.fn(),
    getLocalStream: vi.fn().mockReturnValue(null),
    getRemoteStream: vi.fn().mockReturnValue(null),
  })),
}));

describe('WebRTCManager', () => {
  const sessionId = 'session-123';
  let webrtcManager: WebRTCManager;
  let signalingStore: WebRTCSignalingStore;
  let mockWebRTCService: any;

  const mockLocalUser: UserProfile = {
    id: 'user-1',
    name: 'Alice',
    type: 'customer',
    email: 'alice@example.com',
  };

  const mockRemoteUser: UserProfile = {
    id: 'user-2',
    name: 'Bob',
    type: 'engineer',
    email: 'bob@example.com',
  };

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset console mocks
    vi.clearAllMocks();

    // Create store
    signalingStore = new WebRTCSignalingStore();

    // Create mock WebRTC service
    mockWebRTCService = {
      initializeConnection: vi.fn().mockResolvedValue(undefined),
      startScreenCapture: vi.fn().mockResolvedValue({ getTracks: () => [] }),
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'test-offer' }),
      handleOffer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'test-answer' }),
      handleAnswer: vi.fn().mockResolvedValue(undefined),
      handleIceCandidate: vi.fn().mockResolvedValue(undefined),
      stopScreenCapture: vi.fn(),
      dispose: vi.fn(),
      getLocalStream: vi.fn().mockReturnValue(null),
      getRemoteStream: vi.fn().mockReturnValue(null),
      getState: vi.fn().mockReturnValue('initializing'),
    };

    // Create manager with injected service
    webrtcManager = new WebRTCManager(
      sessionId,
      mockLocalUser,
      mockRemoteUser,
      true, // isPublisher
      mockWebRTCService
    );
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      // when creating manager
      // then should store configuration and have initial state
      expect(webrtcManager).toBeDefined();
      expect(webrtcManager.getState()).toBe('initializing');
    });

    it('should handle publisher configuration', () => {
      // given publisher configuration
      const publisherManager = new WebRTCManager(
        sessionId,
        mockLocalUser,
        mockRemoteUser,
        true,
        mockWebRTCService
      );

      // then should be configured correctly
      expect(publisherManager).toBeDefined();
      expect(publisherManager.getState()).toBe('initializing');
    });

    it('should handle subscriber configuration', () => {
      // given subscriber configuration
      const subscriberManager = new WebRTCManager(
        sessionId,
        mockRemoteUser,
        mockLocalUser,
        false,
        mockWebRTCService
      );

      // then should be configured correctly
      expect(subscriberManager).toBeDefined();
      expect(subscriberManager.getState()).toBe('initializing');
    });
  });


  describe('initializeConnection', () => {
    it('should initialize WebRTC connection', async () => {
      // when initializing connection
      await webrtcManager.initializeConnection();

      // then should call service initialization
      expect(mockWebRTCService.initializeConnection).toHaveBeenCalled();
    });
  });

  describe('startScreenSharing', () => {
    it('should start screen sharing for publishers', async () => {
      // when starting screen sharing
      const stream = await webrtcManager.startScreenSharing();

      // then should call service methods and return stream
      expect(mockWebRTCService.startScreenCapture).toHaveBeenCalled();
      expect(mockWebRTCService.createOffer).toHaveBeenCalled();
      expect(stream).toBeDefined();
    });
  });

  describe('acceptScreenShare', () => {
    it('should accept screen share offer', async () => {
      // given offer
      const offer = { type: 'offer' as const, sdp: 'test-offer' };

      // when accepting screen share
      const answer = await webrtcManager.acceptScreenShare(offer);

      // then should call service and return answer
      expect(mockWebRTCService.handleOffer).toHaveBeenCalledWith(offer);
      expect(answer).toBeDefined();
      expect(answer.type).toBe('answer');
    });
  });

  describe('handleAnswer', () => {
    it('should handle WebRTC answer', async () => {
      // given answer
      const answer = { type: 'answer' as const, sdp: 'test-answer' };

      // when handling answer
      await webrtcManager.handleAnswer(answer);

      // then should call service
      expect(mockWebRTCService.handleAnswer).toHaveBeenCalledWith(answer);
    });
  });

  describe('handleICECandidate', () => {
    it('should handle ICE candidate', async () => {
      // given ICE candidate
      const candidate = { candidate: 'test-candidate', sdpMid: 'test', sdpMLineIndex: 0 };

      // when handling ICE candidate
      await webrtcManager.handleICECandidate(candidate);

      // then should call service
      expect(mockWebRTCService.handleIceCandidate).toHaveBeenCalledWith(candidate);
    });
  });

  describe('stopScreenSharing', () => {
    it('should stop screen sharing and cleanup', () => {
      // when stopping screen sharing
      webrtcManager.stopScreenSharing();

      // then should call service cleanup
      expect(mockWebRTCService.stopScreenCapture).toHaveBeenCalled();
      expect(mockWebRTCService.dispose).toHaveBeenCalled();
    });
  });

  describe('stream getters', () => {
    it('should return null for streams initially', () => {
      // when getting streams
      const localStream = webrtcManager.getLocalStream();
      const remoteStream = webrtcManager.getRemoteStream();

      // then should delegate to service
      expect(mockWebRTCService.getLocalStream).toHaveBeenCalled();
      expect(mockWebRTCService.getRemoteStream).toHaveBeenCalled();
      expect(localStream).toBeNull();
      expect(remoteStream).toBeNull();
    });
  });

  describe('getState', () => {
    it('should delegate to WebRTC service', () => {
      // when getting state
      const state = webrtcManager.getState();

      // then should call service and return its state
      expect(mockWebRTCService.getState).toHaveBeenCalled();
      expect(state).toBe('initializing');
    });
  });

  describe('dispose', () => {
    it('should dispose and cleanup resources', () => {
      // when disposing
      webrtcManager.dispose();

      // then should cleanup resources
      expect(mockWebRTCService.stopScreenCapture).toHaveBeenCalled();
      expect(mockWebRTCService.dispose).toHaveBeenCalled();
    });
  });
});