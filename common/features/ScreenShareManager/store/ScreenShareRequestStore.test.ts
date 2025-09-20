import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScreenShareRequestStore } from './ScreenShareRequestStore';
import { type UserProfile, type ScreenShareStatus, type ScreenShareRequest } from '@common/types';

describe('ScreenShareRequestStore', () => {
  let store: ScreenShareRequestStore;
  let mockEngineer: UserProfile;
  let mockCustomer: UserProfile;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();

    store = new ScreenShareRequestStore();

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

  describe('create', () => {
    it('should create a new screen share request with generated ID and timestamps', () => {
      // given a request without ID and timestamps
      const requestData = {
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending' as ScreenShareStatus,
        autoAccept: true,
      };

      // when creating the request
      const created = store.create(requestData);

      // then the request should have ID and timestamps
      expect(created.id).toBeTruthy();
      expect(created.id).toContain('ssr-');
      expect(created.ticketId).toBe('ticket-789');
      expect(created.sender).toEqual(mockEngineer);
      expect(created.receiver).toEqual(mockCustomer);
      expect(created.status).toBe('pending');
      expect(created.autoAccept).toBe(true);
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
    });

    it('should persist the request to localStorage', () => {
      // given localStorage is empty
      expect(localStorage.getItem('screenShareRequests')).toBeNull();

      // when creating a request
      const requestData = {
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending' as ScreenShareStatus,
      };
      store.create(requestData);

      // then the request should be in localStorage
      const stored = localStorage.getItem('screenShareRequests');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].ticketId).toBe('ticket-789');
    });
  });

  describe('getById', () => {
    it('should return a request by ID', () => {
      // given a created request
      const created = store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when getting by ID
      const retrieved = store.getById(created.id);

      // then the request should be returned
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.ticketId).toBe('ticket-789');
    });

    it('should return undefined for non-existent ID', () => {
      // given no requests exist
      // when getting by non-existent ID
      const retrieved = store.getById('non-existent');

      // then undefined should be returned
      expect(retrieved).toBeUndefined();
    });

    it('should return a copy of the request to prevent external mutations', () => {
      // given a created request
      const created = store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when getting by ID and modifying it
      const retrieved = store.getById(created.id);
      retrieved!.status = 'cancelled';

      // then the original should be unchanged
      const retrievedAgain = store.getById(created.id);
      expect(retrievedAgain!.status).toBe('pending');
    });
  });

  describe('getByTicketId', () => {
    it('should return all requests for a ticket sorted by newest first', () => {
      // given multiple requests for the same ticket created at different times
      const request1 = store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'ended',
      });

      // Simulate time passing
      vi.setSystemTime(new Date(Date.now() + 1000));

      const request2 = store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when getting by ticket ID
      const requests = store.getByTicketId('ticket-789');

      // then both requests should be returned with newest first
      expect(requests).toHaveLength(2);
      expect(requests[0].id).toBe(request2.id);
      expect(requests[1].id).toBe(request1.id);
    });

    it('should return empty array for ticket with no requests', () => {
      // given no requests for a ticket
      // when getting by ticket ID
      const requests = store.getByTicketId('no-requests');

      // then empty array should be returned
      expect(requests).toEqual([]);
    });

    it('should not return requests for other tickets', () => {
      // given requests for different tickets
      store.create({
        ticketId: 'ticket-111',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      store.create({
        ticketId: 'ticket-222',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when getting by specific ticket ID
      const requests = store.getByTicketId('ticket-111');

      // then only that ticket's requests should be returned
      expect(requests).toHaveLength(1);
      expect(requests[0].ticketId).toBe('ticket-111');
    });
  });

  describe('getActiveByTicketId', () => {
    it('should return pending request for a ticket', () => {
      // given a pending request
      const created = store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when getting active request
      const active = store.getActiveByTicketId('ticket-789');

      // then the pending request should be returned
      expect(active).toBeDefined();
      expect(active!.id).toBe(created.id);
      expect(active!.status).toBe('pending');
    });

    it('should return accepted request for a ticket', () => {
      // given an accepted request
      const created = store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'accepted',
      });

      // when getting active request
      const active = store.getActiveByTicketId('ticket-789');

      // then the accepted request should be returned
      expect(active).toBeDefined();
      expect(active!.id).toBe(created.id);
      expect(active!.status).toBe('accepted');
    });

    it('should return active request for a ticket', () => {
      // given an active request
      const created = store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'active',
      });

      // when getting active request
      const active = store.getActiveByTicketId('ticket-789');

      // then the active request should be returned
      expect(active).toBeDefined();
      expect(active!.id).toBe(created.id);
      expect(active!.status).toBe('active');
    });

    it('should not return ended or rejected requests', () => {
      // given ended and rejected requests
      store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'ended',
      });

      store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'rejected',
      });

      // when getting active request
      const active = store.getActiveByTicketId('ticket-789');

      // then undefined should be returned
      expect(active).toBeUndefined();
    });

    it('should return undefined for ticket with no active requests', () => {
      // given a cancelled request
      store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'cancelled',
      });

      // when getting active request
      const active = store.getActiveByTicketId('ticket-789');

      // then undefined should be returned
      expect(active).toBeUndefined();
    });

    it('should return undefined for expired requests', () => {
      // given a request that has already expired (simulate by creating one with past expiry time)
      const expiredRequest = {
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending' as const,
      };

      const created = store.create(expiredRequest);

      // Manually set the expiry time to past (hack for testing)
      const requests = (store as any).requests;
      const request = requests.get(created.id);
      request.expiresAt = new Date(Date.now() - 1000); // 1 second ago

      // when getting active request
      const active = store.getActiveByTicketId('ticket-789');

      // then undefined should be returned because request has expired
      expect(active).toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    it('should update the status of an existing request', () => {
      // given a pending request
      const created = store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // Simulate time passing to ensure updatedAt is different
      const originalTime = created.updatedAt.getTime();
      vi.setSystemTime(new Date(originalTime + 1000));

      // when updating status to accepted
      const updated = store.updateStatus(created.id, 'accepted');

      // then the status should be updated
      expect(updated).toBeDefined();
      expect(updated!.status).toBe('accepted');
      expect(updated!.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it('should persist the updated status to localStorage', () => {
      // given a created request
      const created = store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when updating status
      store.updateStatus(created.id, 'active');

      // then the updated status should be in localStorage
      const stored = localStorage.getItem('screenShareRequests');
      const parsed = JSON.parse(stored!);
      expect(parsed[0].status).toBe('active');
    });

    it('should return undefined for non-existent request', () => {
      // given no requests
      // when updating status of non-existent request
      const updated = store.updateStatus('non-existent', 'accepted');

      // then undefined should be returned
      expect(updated).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete an existing request', () => {
      // given a created request
      const created = store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when deleting the request
      const deleted = store.delete(created.id);

      // then the request should be deleted
      expect(deleted).toBe(true);
      expect(store.getById(created.id)).toBeUndefined();
    });

    it('should remove the deleted request from localStorage', () => {
      // given two created requests
      const request1 = store.create({
        ticketId: 'ticket-111',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      store.create({
        ticketId: 'ticket-222',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when deleting one request
      store.delete(request1.id);

      // then only the other request should remain in localStorage
      const stored = localStorage.getItem('screenShareRequests');
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].ticketId).toBe('ticket-222');
    });

    it('should return false for non-existent request', () => {
      // given no requests
      // when deleting non-existent request
      const deleted = store.delete('non-existent');

      // then false should be returned
      expect(deleted).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all requests', () => {
      // given multiple requests
      store.create({
        ticketId: 'ticket-111',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      store.create({
        ticketId: 'ticket-222',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'active',
      });

      // when getting all requests
      const all = store.getAll();

      // then all requests should be returned
      expect(all).toHaveLength(2);
      expect(all.some(r => r.ticketId === 'ticket-111')).toBe(true);
      expect(all.some(r => r.ticketId === 'ticket-222')).toBe(true);
    });

    it('should return empty array when no requests exist', () => {
      // given no requests
      // when getting all requests
      const all = store.getAll();

      // then empty array should be returned
      expect(all).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all requests', () => {
      // given multiple requests
      store.create({
        ticketId: 'ticket-111',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      store.create({
        ticketId: 'ticket-222',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'active',
      });

      // when clearing all requests
      store.clear();

      // then no requests should remain
      expect(store.getAll()).toEqual([]);
    });

    it('should clear localStorage', () => {
      // given requests in store
      store.create({
        ticketId: 'ticket-111',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when clearing
      store.clear();

      // then localStorage should be empty
      const stored = localStorage.getItem('screenShareRequests');
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual([]);
    });
  });

  describe('reload', () => {
    it('should reload requests from localStorage', () => {
      // given a request in the store
      const created = store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when modifying localStorage directly and reloading
      const stored = JSON.parse(localStorage.getItem('screenShareRequests')!);
      stored[0].status = 'accepted';
      localStorage.setItem('screenShareRequests', JSON.stringify(stored));

      store.reload();

      // then the reloaded request should have the updated status
      const reloaded = store.getById(created.id);
      expect(reloaded!.status).toBe('accepted');
    });

    it('should handle corrupted localStorage gracefully', () => {
      // given corrupted data in localStorage
      localStorage.setItem('screenShareRequests', 'invalid json');

      // when reloading
      store.reload();

      // then store should be empty and not throw
      expect(store.getAll()).toEqual([]);
    });
  });

  describe('localStorage persistence', () => {
    it('should load existing requests from localStorage on construction', () => {
      // given requests in localStorage
      const existingRequests = [
        {
          id: 'existing-1',
          ticketId: 'ticket-111',
          sender: mockEngineer,
          receiver: mockCustomer,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem('screenShareRequests', JSON.stringify(existingRequests));

      // when creating a new store instance
      const newStore = new ScreenShareRequestStore();

      // then existing requests should be loaded
      const loaded = newStore.getAll();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('existing-1');
      expect(loaded[0].createdAt).toBeInstanceOf(Date);
      expect(loaded[0].updatedAt).toBeInstanceOf(Date);
    });
  });
});