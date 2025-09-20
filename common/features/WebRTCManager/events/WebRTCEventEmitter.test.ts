import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebRTCEventEmitter } from './WebRTCEventEmitter';
import type { UserProfile, WebRTCState, WebRTCError } from '@common/types';

// Mock localStorage
const mockLocalStorage = {
  setItem: vi.fn(),
  removeItem: vi.fn(),
  getItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('WebRTCEventEmitter', () => {
  let emitter: WebRTCEventEmitter;
  let mockLocalUser: UserProfile;
  let mockRemoteUser: UserProfile;
  let mockSessionId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    emitter = new WebRTCEventEmitter();

    mockLocalUser = {
      id: 'user-1',
      name: 'Alice',
      type: 'customer',
      email: 'alice@example.com',
    };

    mockRemoteUser = {
      id: 'user-2',
      name: 'Bob',
      type: 'engineer',
      email: 'bob@example.com',
    };

    mockSessionId = 'session-123';
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create instance without errors', () => {
      // when creating emitter
      const newEmitter = new WebRTCEventEmitter();

      // then should be defined
      expect(newEmitter).toBeDefined();
    });
  });

  describe('emitWebRTCStateChanged', () => {
    it('should emit state change event with correct data', () => {
      // given state change data
      const state: WebRTCState = 'connected';

      // when emitting state change
      emitter.emitWebRTCStateChanged(mockSessionId, state, mockLocalUser, mockRemoteUser);

      // then should set localStorage with correct event data
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'webrtcstore-event',
        expect.stringContaining('"type":"webrtcStateChanged"')
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'webrtcstore-event',
        expect.stringContaining('"sessionId":"session-123"')
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'webrtcstore-event',
        expect.stringContaining('"state":"connected"')
      );

      // and should clean up immediately
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('webrtcstore-event');
    });
  });

  describe('emitWebRTCError', () => {
    it('should emit error event with correct data', () => {
      // given error data
      const error: WebRTCError = {
        type: 'connection',
        message: 'Connection failed',
        details: 'Network timeout',
      };

      // when emitting error
      emitter.emitWebRTCError(mockSessionId, error, mockLocalUser, mockRemoteUser);

      // then should set localStorage with correct event data
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'webrtcstore-event',
        expect.stringContaining('"type":"webrtcError"')
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'webrtcstore-event',
        expect.stringContaining('"sessionId":"session-123"')
      );

      // and should clean up immediately
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('webrtcstore-event');
    });
  });

  describe('emitWebRTCRemoteStream', () => {
    it('should emit remote stream event with stream metadata', () => {
      // given mock stream
      const mockStream = {
        id: 'stream-123',
        active: true,
        getVideoTracks: vi.fn().mockReturnValue([{}, {}]), // 2 video tracks
        getAudioTracks: vi.fn().mockReturnValue([{}]), // 1 audio track
      } as unknown as MediaStream;

      // when emitting remote stream
      emitter.emitWebRTCRemoteStream(mockSessionId, mockStream, mockLocalUser, mockRemoteUser);

      // then should set localStorage with stream metadata
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'webrtcstore-event',
        expect.stringContaining('"type":"webrtcRemoteStream"')
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'webrtcstore-event',
        expect.stringContaining('"streamInfo":{"id":"stream-123","active":true,"videoTracks":2,"audioTracks":1}')
      );

      // and should clean up immediately
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('webrtcstore-event');
    });
  });

  describe('emitWebRTCIceCandidate', () => {
    it('should emit ICE candidate event with correct data', () => {
      // given ICE candidate
      const candidate: RTCIceCandidateInit = {
        candidate: 'candidate:123456789 1 udp 2122260223 192.168.1.100 54400 typ host generation 0',
        sdpMid: '0',
        sdpMLineIndex: 0,
      };

      // when emitting ICE candidate
      emitter.emitWebRTCIceCandidate(mockSessionId, candidate, mockLocalUser, mockRemoteUser);

      // then should set localStorage with correct event data
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'webrtcstore-event',
        expect.stringContaining('"type":"webrtcIceCandidate"')
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'webrtcstore-event',
        expect.stringContaining('"sessionId":"session-123"')
      );

      // and should clean up immediately
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('webrtcstore-event');
    });
  });

  describe('emitWebRTCOfferCreated', () => {
    it('should emit offer created event with correct data', () => {
      // given WebRTC offer
      const offer: RTCSessionDescriptionInit = {
        type: 'offer',
        sdp: 'v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\n...',
      };

      // when emitting offer created
      emitter.emitWebRTCOfferCreated(mockSessionId, offer, mockLocalUser, mockRemoteUser);

      // then should set localStorage with correct event data
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'webrtcstore-event',
        expect.stringContaining('"type":"webrtcOfferCreated"')
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'webrtcstore-event',
        expect.stringContaining('"sessionId":"session-123"')
      );

      // and should clean up immediately
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('webrtcstore-event');
    });
  });

  describe('emitWebRTCAnswerCreated', () => {
    it('should emit answer created event with correct data', () => {
      // given WebRTC answer
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: 'v=0\r\no=- 987654321 2 IN IP4 127.0.0.1\r\n...',
      };

      // when emitting answer created
      emitter.emitWebRTCAnswerCreated(mockSessionId, answer, mockLocalUser, mockRemoteUser);

      // then should set localStorage with correct event data
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'webrtcstore-event',
        expect.stringContaining('"type":"webrtcAnswerCreated"')
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'webrtcstore-event',
        expect.stringContaining('"sessionId":"session-123"')
      );

      // and should clean up immediately
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('webrtcstore-event');
    });
  });

  describe('non-browser environment', () => {
    it('should not emit events when window is undefined', () => {
      // given window is undefined
      const originalWindow = global.window;
      // @ts-expect-error - intentionally setting window to undefined for test
      global.window = undefined;

      // when emitting state change
      emitter.emitWebRTCStateChanged(mockSessionId, 'connected', mockLocalUser, mockRemoteUser);

      // then should not call localStorage
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();

      // cleanup
      global.window = originalWindow;
    });
  });
});