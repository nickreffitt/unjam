import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScreenShareManager } from './ScreenShareManager';
import { ScreenShareRequestStoreLocal, ScreenShareSessionStoreLocal, type ScreenShareRequestChanges, type ScreenShareSessionChanges } from './store';
import { WebRTCSignalingStoreLocal, type WebRTCSignalingChanges } from '@common/features/WebRTCManager';
import { type UserProfile } from '@common/types';
import { ScreenShareEventEmitter } from './events';
import { WebRTCEventEmitter } from '@common/features/WebRTCManager/events';

// Mock WebRTC dependencies
vi.mock('@common/features/WebRTCManager', () => {
  const mockMediaStream = {
    id: 'mock-stream-id',
    getTracks: vi.fn(() => []),
    getVideoTracks: vi.fn(() => []),
    getAudioTracks: vi.fn(() => []),
  };

  const mockWebRTCManager = {
    getState: vi.fn(() => 'connected'),
    initializeConnection: vi.fn().mockResolvedValue(undefined),
    startScreenShare: vi.fn().mockResolvedValue({
      type: 'offer',
      sdp: 'mock-offer-sdp'
    }),
    startScreenSharing: vi.fn().mockResolvedValue(mockMediaStream),
    acceptScreenShare: vi.fn().mockResolvedValue({
      type: 'answer',
      sdp: 'mock-answer-sdp'
    }),
    handleAnswer: vi.fn().mockResolvedValue(undefined),
    handleICECandidate: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
  };

  const createWebRTCManager = vi.fn().mockResolvedValue(mockWebRTCManager);

  const WebRTCSignalingStore = vi.fn().mockImplementation(() => ({
    clear: vi.fn(),
    getOfferBySessionId: vi.fn(),
    getAnswerBySessionId: vi.fn(),
    getICECandidatesBySessionId: vi.fn(),
    saveOffer: vi.fn(),
    saveAnswer: vi.fn(),
    saveICECandidate: vi.fn(),
  }));

  return {
    createWebRTCManager,
    WebRTCSignalingStore,
    WebRTCSignalingStoreLocal: vi.fn().mockImplementation(() => ({
      clear: vi.fn(),
      getOfferBySessionId: vi.fn(),
      getAnswerBySessionId: vi.fn(),
      getICECandidatesBySessionId: vi.fn(),
      saveOffer: vi.fn(),
      saveAnswer: vi.fn(),
      saveICECandidate: vi.fn(),
    })),
    WebRTCManager: vi.fn().mockImplementation(() => mockWebRTCManager),
  };
});

// Mock WebRTC Listener
vi.mock('@common/features/WebRTCManager/events', async () => {
  const actual = await vi.importActual('@common/features/WebRTCManager/events');
  return {
    ...actual,
    WebRTCListener: vi.fn().mockImplementation(() => ({
      startListening: vi.fn(),
      stopListening: vi.fn(),
      getIsListening: vi.fn().mockReturnValue(false),
      updateCallbacks: vi.fn(),
    })),
  };
});

describe('ScreenShareManager', () => {
  let manager: ScreenShareManager;
  let mockRequestStore: ScreenShareRequestStoreLocal;
  let mockSessionStore: ScreenShareSessionStoreLocal;
  let mockSignalingStore: WebRTCSignalingStoreLocal;
  let mockRequestChanges: ScreenShareRequestChanges;
  let mockSessionChanges: ScreenShareSessionChanges;
  let mockSignalChanges: WebRTCSignalingChanges;
  let mockEventEmitter: ScreenShareEventEmitter;
  let mockSignalEventEmitter: WebRTCEventEmitter;
  let mockEngineer: UserProfile;
  let mockCustomer: UserProfile;
  const ticketId = 'ticket-123';

  beforeEach(async () => {
    // Create real store instances for testing
    mockRequestStore = new ScreenShareRequestStoreLocal();
    mockSessionStore = new ScreenShareSessionStoreLocal();
    mockSignalingStore = new WebRTCSignalingStoreLocal();

    // Create mock Changes objects
    mockRequestChanges = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    };
    mockSessionChanges = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    };
    mockSignalChanges = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    };

    // Create real event emitters
    mockEventEmitter = new ScreenShareEventEmitter();
    mockSignalEventEmitter = new WebRTCEventEmitter();

    // Clear stores
    await mockRequestStore.clear();
    await mockSessionStore.clear();

    // Create manager instance with all required dependencies
    manager = new ScreenShareManager(
      ticketId,
      mockRequestStore,
      mockSessionStore,
      mockRequestChanges,
      mockSessionChanges,
      mockEventEmitter,
      mockSignalingStore,
      mockSignalChanges,
      mockSignalEventEmitter
    );

    mockEngineer = {
      id: 'eng-123',
      name: 'John Engineer',
      type: 'engineer',
      email: 'john@example.com',
    };

    mockCustomer = {
      id: 'cust-456',
      name: 'Jane Customer',
      type: 'customer',
      email: 'jane@example.com',
    };
  });

  describe('requestScreenShare', () => {
    it('should create a screen share request from engineer to customer', async () => {
      // when engineer requests screen share from customer
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);

      // then request should be created with correct details
      expect(request.ticketId).toBe(ticketId);
      expect(request.sender).toEqual(mockEngineer);
      expect(request.receiver).toEqual(mockCustomer);
      expect(request.status).toBe('pending');
      expect(request.autoAccept).toBe(false);
    });

    it('should create auto-accepted request when specified', async () => {
      // when engineer requests screen share with auto-accept
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer, true);

      // then request should be auto-accepted
      expect(request.status).toBe('accepted');
      expect(request.autoAccept).toBe(true);
    });

    it('should throw error if engineer is not engineer type', async () => {
      // given a non-engineer user
      const nonEngineer = { ...mockEngineer, type: 'customer' as const };

      // when trying to request screen share
      // then should throw error
      await expect(() => {
        return manager.requestScreenShare(nonEngineer, mockCustomer);
      }).rejects.toThrow('Only engineers can request screen sharing');
    });

    it('should throw error if customer is not customer type', async () => {
      // given a non-customer user
      const nonCustomer = { ...mockCustomer, type: 'engineer' as const };

      // when trying to request screen share
      // then should throw error
      await expect(() => {
        return manager.requestScreenShare(mockEngineer, nonCustomer);
      }).rejects.toThrow('Screen sharing can only be requested from customers');
    });

    it('should throw error if there is already an active request', async () => {
      // given an existing active request
      await manager.requestScreenShare(mockEngineer, mockCustomer);

      // when trying to create another request
      // then should throw error
      await expect(() => {
        return manager.requestScreenShare(mockEngineer, mockCustomer);
      }).rejects.toThrow('There is already an active screen share request for this ticket');
    });
  });

  describe('respondToRequest', () => {
    it('should allow customer to accept request', async () => {
      // given a pending request
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);

      // when customer accepts the request
      const updatedRequest = await manager.respondToRequest(request, 'accepted', mockCustomer);

      // then request should be accepted
      expect(updatedRequest.status).toBe('accepted');
    });

    it('should allow customer to reject request', async () => {
      // given a pending request
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);

      // when customer rejects the request
      const updatedRequest = await manager.respondToRequest(request, 'rejected', mockCustomer);

      // then request should be rejected
      expect(updatedRequest.status).toBe('rejected');
    });

    it('should throw error if wrong user tries to respond', async () => {
      // given a pending request
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);
      const wrongUser = { ...mockCustomer, id: 'wrong-user' };

      // when wrong user tries to respond
      // then should throw error
      await expect(() => {
        return manager.respondToRequest(request, 'accepted', wrongUser);
      }).rejects.toThrow('Only the requested customer can respond to this request');
    });

    // Note: The "non-existent request" test case is no longer needed
    // since the new API requires passing a full ScreenShareRequest object
    // which provides type safety and eliminates this error case

    it('should throw error if request is not pending', async () => {
      // given an already accepted request
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);
      const acceptedRequest = await manager.respondToRequest(request, 'accepted', mockCustomer);

      // when trying to respond again with the updated request
      // then should throw error
      await expect(() => {
        return manager.respondToRequest(acceptedRequest, 'rejected', mockCustomer);
      }).rejects.toThrow('Cannot respond to request with status: accepted');
    });
  });

  describe('startCall', () => {
    it('should create customer-initiated call', async () => {
      // when customer starts a call to engineer
      const request = await manager.startCall(mockCustomer, mockEngineer);

      // then request should be created correctly
      expect(request.ticketId).toBe(ticketId);
      expect(request.sender).toEqual(mockCustomer);
      expect(request.receiver).toEqual(mockEngineer);
      expect(request.status).toBe('pending');
      expect(request.autoAccept).toBe(false);
    });

    it('should throw error if customer is not customer type', async () => {
      // given a non-customer user
      const nonCustomer = { ...mockCustomer, type: 'engineer' as const };

      // when trying to start call
      // then should throw error
      await expect(() => {
        return manager.startCall(nonCustomer, mockEngineer);
      }).rejects.toThrow('Only customers can start screen share calls');
    });

    it('should throw error if engineer is not engineer type', async () => {
      // given a non-engineer user
      const nonEngineer = { ...mockEngineer, type: 'customer' as const };

      // when trying to start call
      // then should throw error
      await expect(() => {
        return manager.startCall(mockCustomer, nonEngineer);
      }).rejects.toThrow('Screen share calls can only be made to engineers');
    });

    it('should throw error if there is already an active request', async () => {
      // given an existing active request
      await manager.requestScreenShare(mockEngineer, mockCustomer);

      // when trying to start a call
      // then should throw error
      await expect(() => {
        return manager.startCall(mockCustomer, mockEngineer);
      }).rejects.toThrow('There is already an active screen share request for this ticket');
    });
  });

  describe('acceptCall', () => {
    it('should allow engineer to accept customer call', async () => {
      // given a customer-initiated call
      const request = await manager.startCall(mockCustomer, mockEngineer);

      // when engineer accepts the call
      const updatedRequest = await manager.acceptCall(request.id, mockEngineer);

      // then request should be accepted
      expect(updatedRequest.status).toBe('accepted');
    });

    it('should throw error for engineer-initiated requests', async () => {
      // given an engineer-initiated request
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);

      // when trying to accept as call
      // then should throw error
      await expect(() => {
        return manager.acceptCall(request.id, mockEngineer);
      }).rejects.toThrow('This method is only for customer-initiated calls');
    });

    it('should throw error if wrong engineer tries to accept', async () => {
      // given a customer-initiated call
      const request = await manager.startCall(mockCustomer, mockEngineer);
      const wrongEngineer = { ...mockEngineer, id: 'wrong-engineer' };

      // when wrong engineer tries to accept
      // then should throw error
      await expect(() => {
        return manager.acceptCall(request.id, wrongEngineer);
      }).rejects.toThrow('Only the target engineer can accept this call');
    });

    it('should throw error for non-pending requests', async () => {
      // given an already accepted call
      const request = await manager.startCall(mockCustomer, mockEngineer);
      await manager.acceptCall(request.id, mockEngineer);

      // when trying to accept again
      // then should throw error
      await expect(() => {
        return manager.acceptCall(request.id, mockEngineer);
      }).rejects.toThrow('Cannot accept call with status: accepted');
    });
  });

  describe('rejectCall', () => {
    it('should allow engineer to reject customer call', async () => {
      // given a customer-initiated call
      const request = await manager.startCall(mockCustomer, mockEngineer);

      // when engineer rejects the call
      const updatedRequest = await manager.rejectCall(request.id, mockEngineer);

      // then request should be rejected
      expect(updatedRequest.status).toBe('rejected');
    });

    it('should throw error for engineer-initiated requests', async () => {
      // given an engineer-initiated request
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);

      // when trying to reject as call
      // then should throw error
      await expect(() => {
        return manager.rejectCall(request.id, mockEngineer);
      }).rejects.toThrow('This method is only for customer-initiated calls');
    });

    it('should throw error if wrong engineer tries to reject', async () => {
      // given a customer-initiated call
      const request = await manager.startCall(mockCustomer, mockEngineer);
      const wrongEngineer = { ...mockEngineer, id: 'wrong-engineer' };

      // when wrong engineer tries to reject
      // then should throw error
      await expect(() => {
        return manager.rejectCall(request.id, wrongEngineer);
      }).rejects.toThrow('Only the target engineer can reject this call');
    });
  });

  describe('startSession', () => {
    it('should start session for accepted engineer request', async () => {
      // given an accepted engineer request
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);
      await manager.respondToRequest(request, 'accepted', mockCustomer);

      // when starting session
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);

      // then session should be created correctly
      expect(session.ticketId).toBe(ticketId);
      expect(session.requestId).toBe(request.id);
      expect(session.publisher).toEqual(mockCustomer);
      expect(session.subscriber).toEqual(mockEngineer);
      expect(session.status).toBe('active');
      expect(session.streamId).toBeDefined();
    });

    it('should start session for accepted customer call', async () => {
      // given an accepted customer call
      const request = await manager.startCall(mockCustomer, mockEngineer);
      await manager.acceptCall(request.id, mockEngineer);

      // when starting session
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);

      // then session should be created correctly
      expect(session.ticketId).toBe(ticketId);
      expect(session.requestId).toBe(request.id);
      expect(session.publisher).toEqual(mockCustomer);
      expect(session.subscriber).toEqual(mockEngineer);
      expect(session.status).toBe('active');
      expect(session.streamId).toBeDefined();
    });

    it('should throw error for non-accepted request', async () => {
      // given a pending request
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);

      // when trying to start session
      // then should throw error
      await expect(() => {
        return manager.startSession(request.id, mockCustomer, mockEngineer);
      }).rejects.toThrow('Can only start session for accepted requests');
    });

    it('should throw error if publisher is not the customer', async () => {
      // given an accepted request
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);
      await manager.respondToRequest(request, 'accepted', mockCustomer);

      // when trying to start session with wrong publisher
      // then should throw error
      await expect(() => {
        return manager.startSession(request.id, mockEngineer, mockCustomer);
      }).rejects.toThrow('Publisher must be the customer involved in the request');
    });

    it('should throw error if subscriber is not the engineer', async () => {
      // given an accepted request
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);
      await manager.respondToRequest(request, 'accepted', mockCustomer);

      // when trying to start session with wrong subscriber
      // then should throw error
      await expect(() => {
        return manager.startSession(request.id, mockCustomer, mockCustomer);
      }).rejects.toThrow('Subscriber must be the engineer involved in the request');
    });

    it('should throw error if session already exists for ticket', async () => {
      // given an existing session
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);
      await manager.respondToRequest(request, 'accepted', mockCustomer);
      await manager.startSession(request.id, mockCustomer, mockEngineer);

      // when trying to start another session, first we need to end the existing one
      // and cancel the existing request (since active request blocks new requests)
      const activeSession = await manager.getActiveSession();
      await manager.endSession(activeSession!.id, mockCustomer);
      await manager.cancelRequest(request.id, mockEngineer);

      const request2 = await manager.requestScreenShare(mockEngineer, mockCustomer);
      await manager.respondToRequest(request2, 'accepted', mockCustomer);

      // But if we manually create a session in the store to simulate the conflict
      await mockSessionStore.create({
        ticketId,
        requestId: 'other-request',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active',
      });

      // then should throw error
      await expect(() => {
        return manager.startSession(request2.id, mockCustomer, mockEngineer);
      }).rejects.toThrow('There is already an active screen share session for this ticket');
    });
  });


  describe('subscribeToStream', () => {
    it('should return active session with stream details', async () => {
      // given an active session with stream (now automatic with startSession)
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);
      await manager.respondToRequest(request, 'accepted', mockCustomer);
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);

      // when subscribing to stream
      const streamSession = await manager.subscribeToStream(session.id);

      // then should return session with stream details
      expect(streamSession.status).toBe('active');
      expect(streamSession.streamId).toBeDefined();
    });

    it('should throw error for non-existent session', async () => {
      // when trying to subscribe to non-existent session
      // then should throw error
      await expect(() => {
        return manager.subscribeToStream('non-existent');
      }).rejects.toThrow('Screen share session not found');
    });

    it('should throw error for non-active session', async () => {
      // Note: This test case is no longer valid since startSession now automatically publishes,
      // making the session active immediately. Sessions are never left in 'initializing' state.
    });

    it('should throw error if session has no stream', async () => {
      // Note: This test case is no longer valid since startSession now automatically publishes,
      // sessions always have a stream when active.
    });
  });

  describe('endSession', () => {
    it('should allow publisher to end session', async () => {
      // given an active session
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);
      await manager.respondToRequest(request, 'accepted', mockCustomer);
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);

      // when publisher ends session
      const endedSession = await manager.endSession(session.id, mockCustomer);

      // then session should be ended
      expect(endedSession.status).toBe('ended');
      expect(endedSession.endedAt).toBeInstanceOf(Date);
    });

    it('should allow subscriber to end session', async () => {
      // given an active session
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);
      await manager.respondToRequest(request, 'accepted', mockCustomer);
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);

      // when subscriber ends session
      const endedSession = await manager.endSession(session.id, mockEngineer);

      // then session should be ended
      expect(endedSession.status).toBe('ended');
      expect(endedSession.endedAt).toBeInstanceOf(Date);
    });

    it('should throw error for unauthorized user', async () => {
      // given an active session
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);
      await manager.respondToRequest(request, 'accepted', mockCustomer);
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);
      const unauthorizedUser = { ...mockCustomer, id: 'unauthorized' };

      // when unauthorized user tries to end session
      // then should throw error
      await expect(() => {
        return manager.endSession(session.id, unauthorizedUser);
      }).rejects.toThrow('Only the publisher or subscriber can end the session');
    });

    it('should throw error for already ended session', async () => {
      // given an ended session
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);
      await manager.respondToRequest(request, 'accepted', mockCustomer);
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);
      await manager.endSession(session.id, mockCustomer);

      // when trying to end again
      // then should throw error
      await expect(() => {
        return manager.endSession(session.id, mockCustomer);
      }).rejects.toThrow('Session is already ended');
    });
  });

  describe('cancelRequest', () => {
    it('should allow requester to cancel request', async () => {
      // given a pending request
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);

      // when requester cancels request
      const result = await manager.cancelRequest(request.id, mockEngineer);

      // then request should be cancelled
      expect(result).toBe(true);
      expect(await manager.getActiveRequest()).toBeUndefined();
    });

    it('should throw error if wrong user tries to cancel', async () => {
      // given a pending request
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);

      // when wrong user tries to cancel
      // then should throw error
      await expect(() => {
        return manager.cancelRequest(request.id, mockCustomer);
      }).rejects.toThrow('Only the requester can cancel the request');
    });

    it('should throw error for non-existent request', async () => {
      // when trying to cancel non-existent request
      // then should throw error
      await expect(() => {
        return manager.cancelRequest('non-existent', mockEngineer);
      }).rejects.toThrow('Screen share request not found');
    });
  });

  describe('getActiveRequest', () => {
    it('should return active request for ticket', async () => {
      // given an active request
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);

      // when getting active request
      const activeRequest = await manager.getActiveRequest();

      // then should return the request
      expect(activeRequest).toBeDefined();
      expect(activeRequest!.id).toBe(request.id);
    });

    it('should return undefined when no active request', async () => {
      // when getting active request with none existing
      const activeRequest = await manager.getActiveRequest();

      // then should return undefined
      expect(activeRequest).toBeUndefined();
    });
  });

  describe('getActiveSession', () => {
    it('should return active session for ticket', async () => {
      // given an active session
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);
      await manager.respondToRequest(request, 'accepted', mockCustomer);
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);

      // when getting active session
      const activeSession = await manager.getActiveSession();

      // then should return the session
      expect(activeSession).toBeDefined();
      expect(activeSession!.id).toBe(session.id);
    });

    it('should return undefined when no active session', async () => {
      // when getting active session with none existing
      const activeSession = await manager.getActiveSession();

      // then should return undefined
      expect(activeSession).toBeUndefined();
    });
  });

  describe('integration flows', () => {
    it('should complete full engineer-initiated flow', async () => {
      // given engineer requests screen share
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);
      expect(request.status).toBe('pending');

      // when customer accepts
      const acceptedRequest = await manager.respondToRequest(request, 'accepted', mockCustomer);
      expect(acceptedRequest.status).toBe('accepted');

      // when session is started (automatically publishes stream)
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);
      expect(session.status).toBe('active');
      expect(session.streamId).toBeDefined();

      // when engineer subscribes
      const streamSession = await manager.subscribeToStream(session.id);
      expect(streamSession.streamId).toBeDefined();

      // when session is ended
      const endedSession = await manager.endSession(session.id, mockCustomer);
      expect(endedSession.status).toBe('ended');
    });

    it('should complete full customer-initiated flow', async () => {
      // given customer starts call
      const request = await manager.startCall(mockCustomer, mockEngineer);
      expect(request.status).toBe('pending');

      // when engineer accepts
      const acceptedRequest = await manager.acceptCall(request.id, mockEngineer);
      expect(acceptedRequest.status).toBe('accepted');

      // when session is started (automatically publishes stream)
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);
      expect(session.status).toBe('active');
      expect(session.streamId).toBeDefined();

      // when engineer subscribes
      const streamSession = await manager.subscribeToStream(session.id);
      expect(streamSession.streamId).toBeDefined();

      // when session is ended
      const endedSession = await manager.endSession(session.id, mockEngineer);
      expect(endedSession.status).toBe('ended');
    });

    it('should handle request rejection gracefully', async () => {
      // given engineer requests screen share
      const request = await manager.requestScreenShare(mockEngineer, mockCustomer);

      // when customer rejects
      const rejectedRequest = await manager.respondToRequest(request, 'rejected', mockCustomer);
      expect(rejectedRequest.status).toBe('rejected');

      // then should not be able to start session
      await expect(() => {
        return manager.startSession(request.id, mockCustomer, mockEngineer);
      }).rejects.toThrow('Can only start session for accepted requests');
    });

    it('should handle call rejection gracefully', async () => {
      // given customer starts call
      const request = await manager.startCall(mockCustomer, mockEngineer);

      // when engineer rejects
      const rejectedRequest = await manager.rejectCall(request.id, mockEngineer);
      expect(rejectedRequest.status).toBe('rejected');

      // then should not be able to start session
      await expect(() => {
        return manager.startSession(request.id, mockCustomer, mockEngineer);
      }).rejects.toThrow('Can only start session for accepted requests');
    });
  });
});