import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebRTCListener, type WebRTCListenerCallbacks } from './WebRTCListener';
import type { UserProfile, WebRTCState, WebRTCError } from '@common/types';

describe('WebRTCListener', () => {
  let listener: WebRTCListener;
  let mockCallbacks: Partial<WebRTCListenerCallbacks>;
  let mockLocalUser: UserProfile;
  let mockRemoteUser: UserProfile;
  let mockSessionId: string;

  beforeEach(() => {
    vi.clearAllMocks();

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

    mockCallbacks = {
      onWebRTCStateChanged: vi.fn(),
      onWebRTCError: vi.fn(),
      onWebRTCRemoteStream: vi.fn(),
      onWebRTCIceCandidate: vi.fn(),
      onWebRTCOfferCreated: vi.fn(),
      onWebRTCAnswerCreated: vi.fn(),
    };

    listener = new WebRTCListener(mockCallbacks);
  });

  afterEach(() => {
    listener.stopListening();
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided callbacks', () => {
      // when creating listener
      const newListener = new WebRTCListener(mockCallbacks);

      // then should be defined and not listening initially
      expect(newListener).toBeDefined();
      expect(newListener.getIsListening()).toBe(false);
    });
  });

  describe('startListening', () => {
    it('should start listening to storage events', () => {
      // given listener is not listening
      expect(listener.getIsListening()).toBe(false);

      // when starting to listen
      listener.startListening();

      // then should be listening
      expect(listener.getIsListening()).toBe(true);
    });

    it('should not start listening multiple times', () => {
      // given listener is already listening
      listener.startListening();
      expect(listener.getIsListening()).toBe(true);

      // when starting to listen again
      listener.startListening();

      // then should still be listening (no error)
      expect(listener.getIsListening()).toBe(true);
    });

    it('should not start listening in non-browser environment', () => {
      // given window is undefined
      const originalWindow = global.window;
      // @ts-expect-error - intentionally setting window to undefined for test
      global.window = undefined;

      // when starting to listen
      listener.startListening();

      // then should not be listening
      expect(listener.getIsListening()).toBe(false);

      // cleanup
      global.window = originalWindow;
    });
  });

  describe('stopListening', () => {
    it('should stop listening to storage events', () => {
      // given listener is listening
      listener.startListening();
      expect(listener.getIsListening()).toBe(true);

      // when stopping listening
      listener.stopListening();

      // then should not be listening
      expect(listener.getIsListening()).toBe(false);
    });

    it('should not error when stopping if not listening', () => {
      // given listener is not listening
      expect(listener.getIsListening()).toBe(false);

      // when stopping listening
      listener.stopListening();

      // then should still not be listening (no error)
      expect(listener.getIsListening()).toBe(false);
    });
  });

  describe('updateCallbacks', () => {
    it('should update callbacks successfully', () => {
      // given new callbacks
      const newCallbacks: Partial<WebRTCListenerCallbacks> = {
        onWebRTCStateChanged: vi.fn(),
      };

      // when updating callbacks
      listener.updateCallbacks(newCallbacks);

      // then should update without error
      expect(listener).toBeDefined();
    });
  });

  describe('storage event handling', () => {
    beforeEach(() => {
      listener.startListening();
    });

    it('should handle webrtcStateChanged events', () => {
      // given state change event data
      const eventData = {
        type: 'webrtcStateChanged',
        sessionId: mockSessionId,
        state: 'connected' as WebRTCState,
        localUser: mockLocalUser,
        remoteUser: mockRemoteUser,
        timestamp: Date.now(),
      };

      // when storage event is fired
      const storageEvent = new StorageEvent('storage', {
        key: 'webrtcstore-event',
        newValue: JSON.stringify(eventData),
      });
      window.dispatchEvent(storageEvent);

      // then should call callback
      expect(mockCallbacks.onWebRTCStateChanged).toHaveBeenCalledWith(
        mockSessionId,
        'connected',
        mockLocalUser,
        mockRemoteUser
      );
    });

    it('should handle webrtcError events', () => {
      // given error event data
      const error: WebRTCError = {
        type: 'connection',
        message: 'Connection failed',
      };
      const eventData = {
        type: 'webrtcError',
        sessionId: mockSessionId,
        error,
        localUser: mockLocalUser,
        remoteUser: mockRemoteUser,
        timestamp: Date.now(),
      };

      // when storage event is fired
      const storageEvent = new StorageEvent('storage', {
        key: 'webrtcstore-event',
        newValue: JSON.stringify(eventData),
      });
      window.dispatchEvent(storageEvent);

      // then should call callback
      expect(mockCallbacks.onWebRTCError).toHaveBeenCalledWith(
        mockSessionId,
        error,
        mockLocalUser,
        mockRemoteUser
      );
    });

    it('should handle webrtcRemoteStream events', () => {
      // given remote stream event data
      const streamInfo = {
        id: 'stream-123',
        active: true,
        videoTracks: 1,
        audioTracks: 0,
      };
      const eventData = {
        type: 'webrtcRemoteStream',
        sessionId: mockSessionId,
        streamInfo,
        localUser: mockLocalUser,
        remoteUser: mockRemoteUser,
        timestamp: Date.now(),
      };

      // when storage event is fired
      const storageEvent = new StorageEvent('storage', {
        key: 'webrtcstore-event',
        newValue: JSON.stringify(eventData),
      });
      window.dispatchEvent(storageEvent);

      // then should call callback
      expect(mockCallbacks.onWebRTCRemoteStream).toHaveBeenCalledWith(
        mockSessionId,
        streamInfo,
        mockLocalUser,
        mockRemoteUser
      );
    });

    it('should handle webrtcIceCandidate events', () => {
      // given ICE candidate event data
      const candidate: RTCIceCandidateInit = {
        candidate: 'candidate:123',
        sdpMid: '0',
        sdpMLineIndex: 0,
      };
      const eventData = {
        type: 'webrtcIceCandidate',
        sessionId: mockSessionId,
        candidate,
        localUser: mockLocalUser,
        remoteUser: mockRemoteUser,
        timestamp: Date.now(),
      };

      // when storage event is fired
      const storageEvent = new StorageEvent('storage', {
        key: 'webrtcstore-event',
        newValue: JSON.stringify(eventData),
      });
      window.dispatchEvent(storageEvent);

      // then should call callback
      expect(mockCallbacks.onWebRTCIceCandidate).toHaveBeenCalledWith(
        mockSessionId,
        candidate,
        mockLocalUser,
        mockRemoteUser
      );
    });

    it('should handle webrtcOfferCreated events', () => {
      // given offer created event data
      const offer: RTCSessionDescriptionInit = {
        type: 'offer',
        sdp: 'v=0...',
      };
      const eventData = {
        type: 'webrtcOfferCreated',
        sessionId: mockSessionId,
        offer,
        localUser: mockLocalUser,
        remoteUser: mockRemoteUser,
        timestamp: Date.now(),
      };

      // when storage event is fired
      const storageEvent = new StorageEvent('storage', {
        key: 'webrtcstore-event',
        newValue: JSON.stringify(eventData),
      });
      window.dispatchEvent(storageEvent);

      // then should call callback
      expect(mockCallbacks.onWebRTCOfferCreated).toHaveBeenCalledWith(
        mockSessionId,
        offer,
        mockLocalUser,
        mockRemoteUser
      );
    });

    it('should handle webrtcAnswerCreated events', () => {
      // given answer created event data
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: 'v=0...',
      };
      const eventData = {
        type: 'webrtcAnswerCreated',
        sessionId: mockSessionId,
        answer,
        localUser: mockLocalUser,
        remoteUser: mockRemoteUser,
        timestamp: Date.now(),
      };

      // when storage event is fired
      const storageEvent = new StorageEvent('storage', {
        key: 'webrtcstore-event',
        newValue: JSON.stringify(eventData),
      });
      window.dispatchEvent(storageEvent);

      // then should call callback
      expect(mockCallbacks.onWebRTCAnswerCreated).toHaveBeenCalledWith(
        mockSessionId,
        answer,
        mockLocalUser,
        mockRemoteUser
      );
    });

    it('should ignore events with wrong key', () => {
      // given event with wrong key
      const eventData = {
        type: 'webrtcStateChanged',
        sessionId: mockSessionId,
        state: 'connected',
        localUser: mockLocalUser,
        remoteUser: mockRemoteUser,
      };

      // when storage event with wrong key is fired
      const storageEvent = new StorageEvent('storage', {
        key: 'wrong-key',
        newValue: JSON.stringify(eventData),
      });
      window.dispatchEvent(storageEvent);

      // then should not call any callbacks
      expect(mockCallbacks.onWebRTCStateChanged).not.toHaveBeenCalled();
    });

    it('should ignore events with no newValue', () => {
      // when storage event with no newValue is fired
      const storageEvent = new StorageEvent('storage', {
        key: 'webrtcstore-event',
        newValue: null,
      });
      window.dispatchEvent(storageEvent);

      // then should not call any callbacks
      expect(mockCallbacks.onWebRTCStateChanged).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON gracefully', () => {
      // when storage event with invalid JSON is fired
      const storageEvent = new StorageEvent('storage', {
        key: 'webrtcstore-event',
        newValue: 'invalid-json',
      });
      window.dispatchEvent(storageEvent);

      // then should not call any callbacks and not throw
      expect(mockCallbacks.onWebRTCStateChanged).not.toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      // given callback that throws error
      mockCallbacks.onWebRTCStateChanged = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      listener.updateCallbacks(mockCallbacks);

      const eventData = {
        type: 'webrtcStateChanged',
        sessionId: mockSessionId,
        state: 'connected',
        localUser: mockLocalUser,
        remoteUser: mockRemoteUser,
      };

      // when storage event is fired
      const storageEvent = new StorageEvent('storage', {
        key: 'webrtcstore-event',
        newValue: JSON.stringify(eventData),
      });

      // then should not throw but handle error gracefully
      expect(() => window.dispatchEvent(storageEvent)).not.toThrow();
      expect(mockCallbacks.onWebRTCStateChanged).toHaveBeenCalled();
    });

    it('should only call callbacks for events with complete data', () => {
      // given event with missing required data
      const eventData = {
        type: 'webrtcStateChanged',
        sessionId: mockSessionId,
        // missing state, localUser, remoteUser
      };

      // when storage event is fired
      const storageEvent = new StorageEvent('storage', {
        key: 'webrtcstore-event',
        newValue: JSON.stringify(eventData),
      });
      window.dispatchEvent(storageEvent);

      // then should not call callback
      expect(mockCallbacks.onWebRTCStateChanged).not.toHaveBeenCalled();
    });
  });
});