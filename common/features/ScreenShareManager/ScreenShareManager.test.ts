import { describe, it, expect, beforeEach } from 'vitest';
import { ScreenShareManager } from './ScreenShareManager';
import { ScreenShareRequestStore, ScreenShareSessionStore } from './store';
import { type UserProfile } from '@common/types';

describe('ScreenShareManager', () => {
  let manager: ScreenShareManager;
  let mockRequestStore: ScreenShareRequestStore;
  let mockSessionStore: ScreenShareSessionStore;
  let mockEngineer: UserProfile;
  let mockCustomer: UserProfile;
  const ticketId = 'ticket-123';

  beforeEach(() => {
    // Create real store instances for testing
    mockRequestStore = new ScreenShareRequestStore();
    mockSessionStore = new ScreenShareSessionStore();

    // Clear stores
    mockRequestStore.clear();
    mockSessionStore.clear();

    manager = new ScreenShareManager(ticketId, mockRequestStore, mockSessionStore);

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
    it('should create a screen share request from engineer to customer', () => {
      // when engineer requests screen share from customer
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);

      // then request should be created with correct details
      expect(request.ticketId).toBe(ticketId);
      expect(request.requestedBy).toEqual(mockEngineer);
      expect(request.requestedFrom).toEqual(mockCustomer);
      expect(request.status).toBe('pending');
      expect(request.autoAccept).toBe(false);
    });

    it('should create auto-accepted request when specified', () => {
      // when engineer requests screen share with auto-accept
      const request = manager.requestScreenShare(mockEngineer, mockCustomer, true);

      // then request should be auto-accepted
      expect(request.status).toBe('accepted');
      expect(request.autoAccept).toBe(true);
    });

    it('should throw error if engineer is not engineer type', () => {
      // given a non-engineer user
      const nonEngineer = { ...mockEngineer, type: 'customer' as const };

      // when trying to request screen share
      // then should throw error
      expect(() => {
        manager.requestScreenShare(nonEngineer, mockCustomer);
      }).toThrow('Only engineers can request screen sharing');
    });

    it('should throw error if customer is not customer type', () => {
      // given a non-customer user
      const nonCustomer = { ...mockCustomer, type: 'engineer' as const };

      // when trying to request screen share
      // then should throw error
      expect(() => {
        manager.requestScreenShare(mockEngineer, nonCustomer);
      }).toThrow('Screen sharing can only be requested from customers');
    });

    it('should throw error if there is already an active request', () => {
      // given an existing active request
      manager.requestScreenShare(mockEngineer, mockCustomer);

      // when trying to create another request
      // then should throw error
      expect(() => {
        manager.requestScreenShare(mockEngineer, mockCustomer);
      }).toThrow('There is already an active screen share request for this ticket');
    });
  });

  describe('respondToRequest', () => {
    it('should allow customer to accept request', () => {
      // given a pending request
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);

      // when customer accepts the request
      const updatedRequest = manager.respondToRequest(request, 'accepted', mockCustomer);

      // then request should be accepted
      expect(updatedRequest.status).toBe('accepted');
    });

    it('should allow customer to reject request', () => {
      // given a pending request
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);

      // when customer rejects the request
      const updatedRequest = manager.respondToRequest(request, 'rejected', mockCustomer);

      // then request should be rejected
      expect(updatedRequest.status).toBe('rejected');
    });

    it('should throw error if wrong user tries to respond', () => {
      // given a pending request
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      const wrongUser = { ...mockCustomer, id: 'wrong-user' };

      // when wrong user tries to respond
      // then should throw error
      expect(() => {
        manager.respondToRequest(request, 'accepted', wrongUser);
      }).toThrow('Only the requested customer can respond to this request');
    });

    // Note: The "non-existent request" test case is no longer needed
    // since the new API requires passing a full ScreenShareRequest object
    // which provides type safety and eliminates this error case

    it('should throw error if request is not pending', () => {
      // given an already accepted request
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      const acceptedRequest = manager.respondToRequest(request, 'accepted', mockCustomer);

      // when trying to respond again with the updated request
      // then should throw error
      expect(() => {
        manager.respondToRequest(acceptedRequest, 'rejected', mockCustomer);
      }).toThrow('Cannot respond to request with status: accepted');
    });
  });

  describe('startCall', () => {
    it('should create customer-initiated call', () => {
      // when customer starts a call to engineer
      const request = manager.startCall(mockCustomer, mockEngineer);

      // then request should be created correctly
      expect(request.ticketId).toBe(ticketId);
      expect(request.requestedBy).toEqual(mockCustomer);
      expect(request.requestedFrom).toEqual(mockEngineer);
      expect(request.status).toBe('pending');
      expect(request.autoAccept).toBe(false);
    });

    it('should throw error if customer is not customer type', () => {
      // given a non-customer user
      const nonCustomer = { ...mockCustomer, type: 'engineer' as const };

      // when trying to start call
      // then should throw error
      expect(() => {
        manager.startCall(nonCustomer, mockEngineer);
      }).toThrow('Only customers can start screen share calls');
    });

    it('should throw error if engineer is not engineer type', () => {
      // given a non-engineer user
      const nonEngineer = { ...mockEngineer, type: 'customer' as const };

      // when trying to start call
      // then should throw error
      expect(() => {
        manager.startCall(mockCustomer, nonEngineer);
      }).toThrow('Screen share calls can only be made to engineers');
    });

    it('should throw error if there is already an active request', () => {
      // given an existing active request
      manager.requestScreenShare(mockEngineer, mockCustomer);

      // when trying to start a call
      // then should throw error
      expect(() => {
        manager.startCall(mockCustomer, mockEngineer);
      }).toThrow('There is already an active screen share request for this ticket');
    });
  });

  describe('acceptCall', () => {
    it('should allow engineer to accept customer call', () => {
      // given a customer-initiated call
      const request = manager.startCall(mockCustomer, mockEngineer);

      // when engineer accepts the call
      const updatedRequest = manager.acceptCall(request.id, mockEngineer);

      // then request should be accepted
      expect(updatedRequest.status).toBe('accepted');
    });

    it('should throw error for engineer-initiated requests', () => {
      // given an engineer-initiated request
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);

      // when trying to accept as call
      // then should throw error
      expect(() => {
        manager.acceptCall(request.id, mockEngineer);
      }).toThrow('This method is only for customer-initiated calls');
    });

    it('should throw error if wrong engineer tries to accept', () => {
      // given a customer-initiated call
      const request = manager.startCall(mockCustomer, mockEngineer);
      const wrongEngineer = { ...mockEngineer, id: 'wrong-engineer' };

      // when wrong engineer tries to accept
      // then should throw error
      expect(() => {
        manager.acceptCall(request.id, wrongEngineer);
      }).toThrow('Only the target engineer can accept this call');
    });

    it('should throw error for non-pending requests', () => {
      // given an already accepted call
      const request = manager.startCall(mockCustomer, mockEngineer);
      manager.acceptCall(request.id, mockEngineer);

      // when trying to accept again
      // then should throw error
      expect(() => {
        manager.acceptCall(request.id, mockEngineer);
      }).toThrow('Cannot accept call with status: accepted');
    });
  });

  describe('rejectCall', () => {
    it('should allow engineer to reject customer call', () => {
      // given a customer-initiated call
      const request = manager.startCall(mockCustomer, mockEngineer);

      // when engineer rejects the call
      const updatedRequest = manager.rejectCall(request.id, mockEngineer);

      // then request should be rejected
      expect(updatedRequest.status).toBe('rejected');
    });

    it('should throw error for engineer-initiated requests', () => {
      // given an engineer-initiated request
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);

      // when trying to reject as call
      // then should throw error
      expect(() => {
        manager.rejectCall(request.id, mockEngineer);
      }).toThrow('This method is only for customer-initiated calls');
    });

    it('should throw error if wrong engineer tries to reject', () => {
      // given a customer-initiated call
      const request = manager.startCall(mockCustomer, mockEngineer);
      const wrongEngineer = { ...mockEngineer, id: 'wrong-engineer' };

      // when wrong engineer tries to reject
      // then should throw error
      expect(() => {
        manager.rejectCall(request.id, wrongEngineer);
      }).toThrow('Only the target engineer can reject this call');
    });
  });

  describe('startSession', () => {
    it('should start session for accepted engineer request', async () => {
      // given an accepted engineer request
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      manager.respondToRequest(request, 'accepted', mockCustomer);

      // when starting session
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);

      // then session should be created correctly
      expect(session.ticketId).toBe(ticketId);
      expect(session.requestId).toBe(request.id);
      expect(session.publisher).toEqual(mockCustomer);
      expect(session.subscriber).toEqual(mockEngineer);
      expect(session.status).toBe('initializing');
    });

    it('should start session for accepted customer call', async () => {
      // given an accepted customer call
      const request = manager.startCall(mockCustomer, mockEngineer);
      manager.acceptCall(request.id, mockEngineer);

      // when starting session
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);

      // then session should be created correctly
      expect(session.ticketId).toBe(ticketId);
      expect(session.requestId).toBe(request.id);
      expect(session.publisher).toEqual(mockCustomer);
      expect(session.subscriber).toEqual(mockEngineer);
      expect(session.status).toBe('initializing');
    });

    it('should throw error for non-accepted request', async () => {
      // given a pending request
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);

      // when trying to start session
      // then should throw error
      await expect(() => {
        return manager.startSession(request.id, mockCustomer, mockEngineer);
      }).rejects.toThrow('Can only start session for accepted requests');
    });

    it('should throw error if publisher is not the customer', async () => {
      // given an accepted request
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      manager.respondToRequest(request, 'accepted', mockCustomer);

      // when trying to start session with wrong publisher
      // then should throw error
      await expect(() => {
        return manager.startSession(request.id, mockEngineer, mockCustomer);
      }).rejects.toThrow('Publisher must be the customer involved in the request');
    });

    it('should throw error if subscriber is not the engineer', async () => {
      // given an accepted request
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      manager.respondToRequest(request, 'accepted', mockCustomer);

      // when trying to start session with wrong subscriber
      // then should throw error
      await expect(() => {
        return manager.startSession(request.id, mockCustomer, mockCustomer);
      }).rejects.toThrow('Subscriber must be the engineer involved in the request');
    });

    it('should throw error if session already exists for ticket', async () => {
      // given an existing session
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      manager.respondToRequest(request, 'accepted', mockCustomer);
      await manager.startSession(request.id, mockCustomer, mockEngineer);

      // when trying to start another session, first we need to end the existing one
      // and cancel the existing request (since active request blocks new requests)
      manager.endSession(manager.getActiveSession()!.id, mockCustomer);
      manager.cancelRequest(request.id, mockEngineer);

      const request2 = manager.requestScreenShare(mockEngineer, mockCustomer);
      manager.respondToRequest(request2, 'accepted', mockCustomer);

      // But if we manually create a session in the store to simulate the conflict
      mockSessionStore.create({
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

  describe('publishStream', () => {
    it('should publish stream and activate session', async () => {
      // given an initializing session
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      manager.respondToRequest(request, 'accepted', mockCustomer);
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);

      // when publishing stream
      const updatedSession = await manager.publishStream(session.id);

      // then session should be active with stream ID
      expect(updatedSession.status).toBe('active');
      expect(updatedSession.streamId).toBeDefined();
    });

    it('should throw error for non-existent session', async () => {
      // when trying to publish to non-existent session
      // then should throw error
      await expect(() => {
        return manager.publishStream('non-existent');
      }).rejects.toThrow('Screen share session not found');
    });

    it('should throw error if session is not initializing', async () => {
      // given an active session
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      manager.respondToRequest(request, 'accepted', mockCustomer);
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);
      await manager.publishStream(session.id);

      // when trying to publish again
      // then should throw error
      await expect(() => {
        return manager.publishStream(session.id);
      }).rejects.toThrow('Can only publish stream for initializing sessions');
    });
  });

  describe('subscribeToStream', () => {
    it('should return active session with stream details', async () => {
      // given an active session with stream
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      manager.respondToRequest(request, 'accepted', mockCustomer);
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);
      const activeSession = await manager.publishStream(session.id);

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
      // given an initializing session
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      manager.respondToRequest(request, 'accepted', mockCustomer);
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);

      // when trying to subscribe
      // then should throw error
      await expect(() => {
        return manager.subscribeToStream(session.id);
      }).rejects.toThrow('Can only subscribe to active sessions');
    });

    it('should throw error if session has no stream', async () => {
      // given a session without stream (shouldn't happen in normal flow)
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      manager.respondToRequest(request, 'accepted', mockCustomer);
      const session = await manager.startSession(request.id, mockCustomer, mockEngineer);

      // Manually set to active without stream (edge case)
      mockSessionStore.update(session.id, { status: 'active' });

      // when trying to subscribe
      // then should throw error
      await expect(() => {
        return manager.subscribeToStream(session.id);
      }).rejects.toThrow('Session does not have an active stream');
    });
  });

  describe('endSession', () => {
    it('should allow publisher to end session', () => {
      // given an active session
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      manager.respondToRequest(request, 'accepted', mockCustomer);
      const session = manager.startSession(request.id, mockCustomer, mockEngineer);
      manager.publishStream(session.id, 'stream-123');

      // when publisher ends session
      const endedSession = manager.endSession(session.id, mockCustomer);

      // then session should be ended
      expect(endedSession.status).toBe('ended');
      expect(endedSession.endedAt).toBeInstanceOf(Date);
    });

    it('should allow subscriber to end session', () => {
      // given an active session
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      manager.respondToRequest(request, 'accepted', mockCustomer);
      const session = manager.startSession(request.id, mockCustomer, mockEngineer);
      manager.publishStream(session.id, 'stream-123');

      // when subscriber ends session
      const endedSession = manager.endSession(session.id, mockEngineer);

      // then session should be ended
      expect(endedSession.status).toBe('ended');
      expect(endedSession.endedAt).toBeInstanceOf(Date);
    });

    it('should throw error for unauthorized user', () => {
      // given an active session
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      manager.respondToRequest(request, 'accepted', mockCustomer);
      const session = manager.startSession(request.id, mockCustomer, mockEngineer);
      const unauthorizedUser = { ...mockCustomer, id: 'unauthorized' };

      // when unauthorized user tries to end session
      // then should throw error
      expect(() => {
        manager.endSession(session.id, unauthorizedUser);
      }).toThrow('Only the publisher or subscriber can end the session');
    });

    it('should throw error for already ended session', () => {
      // given an ended session
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      manager.respondToRequest(request, 'accepted', mockCustomer);
      const session = manager.startSession(request.id, mockCustomer, mockEngineer);
      manager.endSession(session.id, mockCustomer);

      // when trying to end again
      // then should throw error
      expect(() => {
        manager.endSession(session.id, mockCustomer);
      }).toThrow('Session is already ended');
    });
  });

  describe('cancelRequest', () => {
    it('should allow requester to cancel request', () => {
      // given a pending request
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);

      // when requester cancels request
      const result = manager.cancelRequest(request.id, mockEngineer);

      // then request should be cancelled
      expect(result).toBe(true);
      expect(manager.getActiveRequest()).toBeUndefined();
    });

    it('should throw error if wrong user tries to cancel', () => {
      // given a pending request
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);

      // when wrong user tries to cancel
      // then should throw error
      expect(() => {
        manager.cancelRequest(request.id, mockCustomer);
      }).toThrow('Only the requester can cancel the request');
    });

    it('should throw error for non-existent request', () => {
      // when trying to cancel non-existent request
      // then should throw error
      expect(() => {
        manager.cancelRequest('non-existent', mockEngineer);
      }).toThrow('Screen share request not found');
    });
  });

  describe('getActiveRequest', () => {
    it('should return active request for ticket', () => {
      // given an active request
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);

      // when getting active request
      const activeRequest = manager.getActiveRequest();

      // then should return the request
      expect(activeRequest).toBeDefined();
      expect(activeRequest!.id).toBe(request.id);
    });

    it('should return undefined when no active request', () => {
      // when getting active request with none existing
      const activeRequest = manager.getActiveRequest();

      // then should return undefined
      expect(activeRequest).toBeUndefined();
    });
  });

  describe('getActiveSession', () => {
    it('should return active session for ticket', () => {
      // given an active session
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      manager.respondToRequest(request, 'accepted', mockCustomer);
      const session = manager.startSession(request.id, mockCustomer, mockEngineer);

      // when getting active session
      const activeSession = manager.getActiveSession();

      // then should return the session
      expect(activeSession).toBeDefined();
      expect(activeSession!.id).toBe(session.id);
    });

    it('should return undefined when no active session', () => {
      // when getting active session with none existing
      const activeSession = manager.getActiveSession();

      // then should return undefined
      expect(activeSession).toBeUndefined();
    });
  });

  describe('integration flows', () => {
    it('should complete full engineer-initiated flow', () => {
      // given engineer requests screen share
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);
      expect(request.status).toBe('pending');

      // when customer accepts
      const acceptedRequest = manager.respondToRequest(request, 'accepted', mockCustomer);
      expect(acceptedRequest.status).toBe('accepted');

      // when session is started
      const session = manager.startSession(request.id, mockCustomer, mockEngineer);
      expect(session.status).toBe('initializing');

      // when stream is published
      const activeSession = manager.publishStream(session.id, 'stream-123');
      expect(activeSession.status).toBe('active');

      // when engineer subscribes
      const streamSession = manager.subscribeToStream(session.id);
      expect(streamSession.streamId).toBe('stream-123');

      // when session is ended
      const endedSession = manager.endSession(session.id, mockCustomer);
      expect(endedSession.status).toBe('ended');
    });

    it('should complete full customer-initiated flow', () => {
      // given customer starts call
      const request = manager.startCall(mockCustomer, mockEngineer);
      expect(request.status).toBe('pending');

      // when engineer accepts
      const acceptedRequest = manager.acceptCall(request.id, mockEngineer);
      expect(acceptedRequest.status).toBe('accepted');

      // when session is started
      const session = manager.startSession(request.id, mockCustomer, mockEngineer);
      expect(session.status).toBe('initializing');

      // when stream is published
      const activeSession = manager.publishStream(session.id, 'stream-456');
      expect(activeSession.status).toBe('active');

      // when engineer subscribes
      const streamSession = manager.subscribeToStream(session.id);
      expect(streamSession.streamId).toBe('stream-456');

      // when session is ended
      const endedSession = manager.endSession(session.id, mockEngineer);
      expect(endedSession.status).toBe('ended');
    });

    it('should handle request rejection gracefully', () => {
      // given engineer requests screen share
      const request = manager.requestScreenShare(mockEngineer, mockCustomer);

      // when customer rejects
      const rejectedRequest = manager.respondToRequest(request, 'rejected', mockCustomer);
      expect(rejectedRequest.status).toBe('rejected');

      // then should not be able to start session
      expect(() => {
        manager.startSession(request.id, mockCustomer, mockEngineer);
      }).toThrow('Can only start session for accepted requests');
    });

    it('should handle call rejection gracefully', () => {
      // given customer starts call
      const request = manager.startCall(mockCustomer, mockEngineer);

      // when engineer rejects
      const rejectedRequest = manager.rejectCall(request.id, mockEngineer);
      expect(rejectedRequest.status).toBe('rejected');

      // then should not be able to start session
      expect(() => {
        manager.startSession(request.id, mockCustomer, mockEngineer);
      }).toThrow('Can only start session for accepted requests');
    });
  });
});