import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScreenShareRequestStoreLocal } from './ScreenShareRequestStoreLocal';
import { type UserProfile, type ScreenShareStatus, type ScreenShareRequest } from '@common/types';

describe('ScreenShareRequestStoreLocal', () => {
  let store: ScreenShareRequestStoreLocal;
  let mockEngineer: UserProfile;
  let mockCustomer: UserProfile;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();

    store = new ScreenShareRequestStoreLocal();

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
    it('should create a new screen share request with generated ID and timestamps', async () => {
      // given a request without ID and timestamps
      const requestData = {
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending' as ScreenShareStatus,
        autoAccept: true,
      };

      // when creating the request
      const created = await store.create(requestData);

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

    it('should persist the request to localStorage', async () => {
      // given localStorage is empty
      expect(localStorage.getItem('screenShareRequests')).toBeNull();

      // when creating a request
      const requestData = {
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending' as ScreenShareStatus,
      };
      await store.create(requestData);

      // then the request should be in localStorage
      const stored = localStorage.getItem('screenShareRequests');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].ticketId).toBe('ticket-789');
    });
  });

  describe('getById', () => {
    it('should return a request by ID', async () => {
      // given a created request
      const created = await store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when getting by ID
      const retrieved = await store.getById(created.id);

      // then the request should be returned
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.ticketId).toBe('ticket-789');
    });

    it('should return undefined for non-existent ID', async () => {
      // given no requests exist
      // when getting by non-existent ID
      const retrieved = await store.getById('non-existent');

      // then undefined should be returned
      expect(retrieved).toBeUndefined();
    });

    it('should return a copy of the request to prevent external mutations', async () => {
      // given a created request
      const created = await store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when getting by ID and modifying it
      const retrieved = await store.getById(created.id);
      retrieved!.status = 'cancelled';

      // then the original should be unchanged
      const retrievedAgain = await store.getById(created.id);
      expect(retrievedAgain!.status).toBe('pending');
    });
  });

  describe('getByTicketId', () => {
    it('should return all requests for a ticket sorted by newest first', async () => {
      // given multiple requests for the same ticket created at different times
      const request1 = await store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'ended',
      });

      // Simulate time passing
      vi.setSystemTime(new Date(Date.now() + 1000));

      const request2 = await store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when getting by ticket ID
      const requests = await store.getByTicketId('ticket-789');

      // then both requests should be returned with newest first
      expect(requests).toHaveLength(2);
      expect(requests[0].id).toBe(request2.id);
      expect(requests[1].id).toBe(request1.id);
    });

    it('should return empty array for ticket with no requests', async () => {
      // given no requests for a ticket
      // when getting by ticket ID
      const requests = await store.getByTicketId('no-requests');

      // then empty array should be returned
      expect(requests).toEqual([]);
    });

    it('should not return requests for other tickets', async () => {
      // given requests for different tickets
      await store.create({
        ticketId: 'ticket-111',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      await store.create({
        ticketId: 'ticket-222',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when getting by specific ticket ID
      const requests = await store.getByTicketId('ticket-111');

      // then only that ticket's requests should be returned
      expect(requests).toHaveLength(1);
      expect(requests[0].ticketId).toBe('ticket-111');
    });
  });

  describe('getActiveByTicketId', () => {
    it('should return pending request for a ticket', async () => {
      // given a pending request
      const created = await store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when getting active request
      const active = await store.getActiveByTicketId('ticket-789');

      // then the pending request should be returned
      expect(active).toBeDefined();
      expect(active!.id).toBe(created.id);
      expect(active!.status).toBe('pending');
    });

    it('should return accepted request for a ticket', async () => {
      // given an accepted request
      const created = await store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'accepted',
      });

      // when getting active request
      const active = await store.getActiveByTicketId('ticket-789');

      // then the accepted request should be returned
      expect(active).toBeDefined();
      expect(active!.id).toBe(created.id);
      expect(active!.status).toBe('accepted');
    });

    it('should return active request for a ticket', async () => {
      // given an active request
      const created = await store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'active',
      });

      // when getting active request
      const active = await store.getActiveByTicketId('ticket-789');

      // then the active request should be returned
      expect(active).toBeDefined();
      expect(active!.id).toBe(created.id);
      expect(active!.status).toBe('active');
    });

    it('should not return ended or rejected requests', async () => {
      // given ended and rejected requests
      await store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'ended',
      });

      await store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'rejected',
      });

      // when getting active request
      const active = await store.getActiveByTicketId('ticket-789');

      // then undefined should be returned
      expect(active).toBeUndefined();
    });

    it('should return undefined for ticket with no active requests', async () => {
      // given a cancelled request
      await store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'cancelled',
      });

      // when getting active request
      const active = await store.getActiveByTicketId('ticket-789');

      // then undefined should be returned
      expect(active).toBeUndefined();
    });

    it('should return undefined for expired requests', async () => {
      // given a request that has already expired (simulate by creating one with past expiry time)
      const expiredRequest = {
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending' as const,
      };

      const created = await store.create(expiredRequest);

      // Manually set the expiry time to past (hack for testing)
      const requests = (store as any).requests;
      const request = requests.get(created.id);
      request.expiresAt = new Date(Date.now() - 1000); // 1 second ago

      // when getting active request
      const active = await store.getActiveByTicketId('ticket-789');

      // then undefined should be returned because request has expired
      expect(active).toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    it('should update the status of an existing request', async () => {
      // given a pending request
      const created = await store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // Simulate time passing to ensure updatedAt is different
      const originalTime = created.updatedAt.getTime();
      vi.setSystemTime(new Date(originalTime + 1000));

      // when updating status to accepted
      const updated = await store.updateStatus(created.id, 'accepted');

      // then the status should be updated
      expect(updated).toBeDefined();
      expect(updated!.status).toBe('accepted');
      expect(updated!.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it('should persist the updated status to localStorage', async () => {
      // given a created request
      const created = await store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when updating status
      await store.updateStatus(created.id, 'active');

      // then the updated status should be in localStorage
      const stored = localStorage.getItem('screenShareRequests');
      const parsed = JSON.parse(stored!);
      expect(parsed[0].status).toBe('active');
    });

    it('should return undefined for non-existent request', async () => {
      // given no requests
      // when updating status of non-existent request
      const updated = await store.updateStatus('non-existent', 'accepted');

      // then undefined should be returned
      expect(updated).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete an existing request', async () => {
      // given a created request
      const created = await store.create({
        ticketId: 'ticket-789',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when deleting the request
      const deleted = await store.delete(created.id);

      // then the request should be deleted
      expect(deleted).toBe(true);
      expect(await store.getById(created.id)).toBeUndefined();
    });

    it('should remove the deleted request from localStorage', async () => {
      // given two created requests
      const request1 = await store.create({
        ticketId: 'ticket-111',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      await store.create({
        ticketId: 'ticket-222',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when deleting one request
      await store.delete(request1.id);

      // then only the other request should remain in localStorage
      const stored = localStorage.getItem('screenShareRequests');
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].ticketId).toBe('ticket-222');
    });

    it('should return false for non-existent request', async () => {
      // given no requests
      // when deleting non-existent request
      const deleted = await store.delete('non-existent');

      // then false should be returned
      expect(deleted).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all requests', async () => {
      // given multiple requests
      await store.create({
        ticketId: 'ticket-111',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      await store.create({
        ticketId: 'ticket-222',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'active',
      });

      // when getting all requests
      const all = await store.getAll();

      // then all requests should be returned
      expect(all).toHaveLength(2);
      expect(all.some(r => r.ticketId === 'ticket-111')).toBe(true);
      expect(all.some(r => r.ticketId === 'ticket-222')).toBe(true);
    });

    it('should return empty array when no requests exist', async () => {
      // given no requests
      // when getting all requests
      const all = await store.getAll();

      // then empty array should be returned
      expect(all).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all requests', async () => {
      // given multiple requests
      await store.create({
        ticketId: 'ticket-111',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      await store.create({
        ticketId: 'ticket-222',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'active',
      });

      // when clearing all requests
      await store.clear();

      // then no requests should remain
      expect(await store.getAll()).toEqual([]);
    });

    it('should clear localStorage', async () => {
      // given requests in store
      await store.create({
        ticketId: 'ticket-111',
        sender: mockEngineer,
        receiver: mockCustomer,
        status: 'pending',
      });

      // when clearing
      await store.clear();

      // then localStorage should be empty
      const stored = localStorage.getItem('screenShareRequests');
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual([]);
    });
  });

  describe('reload', () => {
    it('should reload requests from localStorage', async () => {
      // given a request in the store
      const created = await store.create({
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
      const reloaded = await store.getById(created.id);
      expect(reloaded!.status).toBe('accepted');
    });

    it('should handle corrupted localStorage gracefully', async () => {
      // given corrupted data in localStorage
      localStorage.setItem('screenShareRequests', 'invalid json');

      // when reloading
      store.reload();

      // then store should be empty and not throw
      expect(await store.getAll()).toEqual([]);
    });
  });

  describe('localStorage persistence', () => {
    it('should load existing requests from localStorage on construction', async () => {
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
      const newStore = new ScreenShareRequestStoreLocal();

      // then existing requests should be loaded
      const loaded = await newStore.getAll();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('existing-1');
      expect(loaded[0].createdAt).toBeInstanceOf(Date);
      expect(loaded[0].updatedAt).toBeInstanceOf(Date);
    });
  });
});
