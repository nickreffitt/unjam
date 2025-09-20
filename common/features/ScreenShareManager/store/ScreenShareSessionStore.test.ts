import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScreenShareSessionStore } from './ScreenShareSessionStore';
import { type UserProfile, type ScreenShareSession, type SessionStatus } from '@common/types';

describe('ScreenShareSessionStore', () => {
  let store: ScreenShareSessionStore;
  let mockCustomer: UserProfile;
  let mockEngineer: UserProfile;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();

    store = new ScreenShareSessionStore();

    mockCustomer = {
      id: 'cust-456',
      name: 'Jane Customer',
      type: 'customer',
      email: 'jane@example.com',
    };

    mockEngineer = {
      id: 'eng-123',
      name: 'John Engineer',
      type: 'engineer',
      email: 'john@example.com',
    };
  });

  describe('create', () => {
    it('should create a new screen share session with generated ID and timestamps', () => {
      // given session data without ID and timestamps
      const sessionData = {
        ticketId: 'ticket-789',
        requestId: 'request-456',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'initializing' as SessionStatus,
        streamId: 'stream-123',
      };

      // when creating the session
      const created = store.create(sessionData);

      // then the session should have ID and timestamps
      expect(created.id).toBeTruthy();
      expect(created.id).toContain('sss-');
      expect(created.ticketId).toBe('ticket-789');
      expect(created.requestId).toBe('request-456');
      expect(created.publisher).toEqual(mockCustomer);
      expect(created.subscriber).toEqual(mockEngineer);
      expect(created.status).toBe('initializing');
      expect(created.streamId).toBe('stream-123');
      expect(created.startedAt).toBeInstanceOf(Date);
      expect(created.lastActivityAt).toBeInstanceOf(Date);
      expect(created.endedAt).toBeUndefined();
    });

    it('should persist the session to localStorage', () => {
      // given localStorage is empty
      expect(localStorage.getItem('screenShareSessions')).toBeNull();

      // when creating a session
      const sessionData = {
        ticketId: 'ticket-789',
        requestId: 'request-456',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active' as SessionStatus,
      };
      store.create(sessionData);

      // then the session should be in localStorage
      const stored = localStorage.getItem('screenShareSessions');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].ticketId).toBe('ticket-789');
    });
  });

  describe('getById', () => {
    it('should return a session by ID', () => {
      // given a created session
      const created = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-456',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active',
      });

      // when getting by ID
      const retrieved = store.getById(created.id);

      // then the session should be returned
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.ticketId).toBe('ticket-789');
    });

    it('should return undefined for non-existent ID', () => {
      // given no sessions exist
      // when getting by non-existent ID
      const retrieved = store.getById('non-existent');

      // then undefined should be returned
      expect(retrieved).toBeUndefined();
    });

    it('should return a copy to prevent external mutations', () => {
      // given a created session
      const created = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-456',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active',
      });

      // when getting by ID and modifying it
      const retrieved = store.getById(created.id);
      retrieved!.status = 'ended';

      // then the original should be unchanged
      const retrievedAgain = store.getById(created.id);
      expect(retrievedAgain!.status).toBe('active');
    });
  });

  describe('getActiveByTicketId', () => {
    it('should return initializing session for a ticket', () => {
      // given an initializing session
      const created = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-456',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'initializing',
      });

      // when getting active session
      const active = store.getActiveByTicketId('ticket-789');

      // then the initializing session should be returned
      expect(active).toBeDefined();
      expect(active!.id).toBe(created.id);
      expect(active!.status).toBe('initializing');
    });

    it('should return active session for a ticket', () => {
      // given an active session
      const created = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-456',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active',
      });

      // when getting active session
      const active = store.getActiveByTicketId('ticket-789');

      // then the active session should be returned
      expect(active).toBeDefined();
      expect(active!.id).toBe(created.id);
      expect(active!.status).toBe('active');
    });

    it('should not return ended or error sessions', () => {
      // given ended and error sessions
      store.create({
        ticketId: 'ticket-789',
        requestId: 'request-111',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'ended',
      });

      store.create({
        ticketId: 'ticket-789',
        requestId: 'request-222',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'error',
        errorMessage: 'Connection failed',
      });

      // when getting active session
      const active = store.getActiveByTicketId('ticket-789');

      // then undefined should be returned
      expect(active).toBeUndefined();
    });

    it('should return the most recent active session if multiple exist', () => {
      // given multiple active sessions (edge case)
      const session1 = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-111',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active',
      });

      vi.setSystemTime(new Date(Date.now() + 1000));

      const session2 = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-222',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'initializing',
      });

      // when getting active session
      const active = store.getActiveByTicketId('ticket-789');

      // then the first active session should be returned (first match wins)
      expect(active!.id).toBe(session1.id);
    });
  });

  describe('getByTicketId', () => {
    it('should return all sessions for a ticket sorted by newest first', () => {
      // given multiple sessions for the same ticket
      const session1 = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-111',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'ended',
      });

      vi.setSystemTime(new Date(Date.now() + 1000));

      const session2 = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-222',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active',
      });

      // when getting by ticket ID
      const sessions = store.getByTicketId('ticket-789');

      // then both sessions should be returned with newest first
      expect(sessions).toHaveLength(2);
      expect(sessions[0].id).toBe(session2.id);
      expect(sessions[1].id).toBe(session1.id);
    });

    it('should return empty array for ticket with no sessions', () => {
      // given no sessions for a ticket
      // when getting by ticket ID
      const sessions = store.getByTicketId('no-sessions');

      // then empty array should be returned
      expect(sessions).toEqual([]);
    });
  });

  describe('getByRequestId', () => {
    it('should return all sessions for a request', () => {
      // given sessions for the same request
      const session1 = store.create({
        ticketId: 'ticket-111',
        requestId: 'request-789',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'ended',
      });

      const session2 = store.create({
        ticketId: 'ticket-222',
        requestId: 'request-789',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active',
      });

      // when getting by request ID
      const sessions = store.getByRequestId('request-789');

      // then both sessions should be returned
      expect(sessions).toHaveLength(2);
      expect(sessions.some(s => s.id === session1.id)).toBe(true);
      expect(sessions.some(s => s.id === session2.id)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update session status', () => {
      // given an active session
      const created = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-456',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'initializing',
      });

      const originalActivity = created.lastActivityAt.getTime();
      vi.setSystemTime(new Date(originalActivity + 1000));

      // when updating status
      const updated = store.update(created.id, { status: 'active' });

      // then the status should be updated
      expect(updated).toBeDefined();
      expect(updated!.status).toBe('active');
      expect(updated!.lastActivityAt.getTime()).toBeGreaterThan(originalActivity);
    });

    it('should update stream ID', () => {
      // given a session without stream ID
      const created = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-456',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'initializing',
      });

      // when updating stream ID
      const updated = store.update(created.id, { streamId: 'new-stream-123' });

      // then the stream ID should be updated
      expect(updated).toBeDefined();
      expect(updated!.streamId).toBe('new-stream-123');
    });

    it('should set endedAt when status changes to ended', () => {
      // given an active session
      const created = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-456',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active',
      });

      // when updating status to ended
      const updated = store.update(created.id, { status: 'ended' });

      // then endedAt should be set
      expect(updated).toBeDefined();
      expect(updated!.status).toBe('ended');
      expect(updated!.endedAt).toBeInstanceOf(Date);
    });

    it('should set error message when provided', () => {
      // given an active session
      const created = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-456',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active',
      });

      // when updating with error
      const updated = store.update(created.id, {
        status: 'error',
        errorMessage: 'Connection lost',
      });

      // then error message should be set
      expect(updated).toBeDefined();
      expect(updated!.status).toBe('error');
      expect(updated!.errorMessage).toBe('Connection lost');
    });

    it('should return undefined for non-existent session', () => {
      // given no sessions
      // when updating non-existent session
      const updated = store.update('non-existent', { status: 'ended' });

      // then undefined should be returned
      expect(updated).toBeUndefined();
    });

    it('should persist updates to localStorage', () => {
      // given a created session
      const created = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-456',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'initializing',
      });

      // when updating status
      store.update(created.id, { status: 'active' });

      // then the updated status should be in localStorage
      const stored = localStorage.getItem('screenShareSessions');
      const parsed = JSON.parse(stored!);
      expect(parsed[0].status).toBe('active');
    });
  });

  describe('updateActivity', () => {
    it('should update last activity timestamp', () => {
      // given a session
      const created = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-456',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active',
      });

      const originalActivity = created.lastActivityAt.getTime();
      vi.setSystemTime(new Date(originalActivity + 5000));

      // when updating activity
      const updated = store.updateActivity(created.id);

      // then activity timestamp should be updated
      expect(updated).toBe(true);
      const session = store.getById(created.id);
      expect(session!.lastActivityAt.getTime()).toBeGreaterThan(originalActivity);
    });

    it('should return false for non-existent session', () => {
      // given no sessions
      // when updating activity of non-existent session
      const updated = store.updateActivity('non-existent');

      // then false should be returned
      expect(updated).toBe(false);
    });
  });

  describe('endSession', () => {
    it('should end an active session', () => {
      // given an active session
      const created = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-456',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active',
      });

      // when ending the session
      const ended = store.endSession(created.id);

      // then the session should be ended with timestamp
      expect(ended).toBeDefined();
      expect(ended!.status).toBe('ended');
      expect(ended!.endedAt).toBeInstanceOf(Date);
    });
  });

  describe('markError', () => {
    it('should mark session as error with message', () => {
      // given an active session
      const created = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-456',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active',
      });

      // when marking as error
      const errored = store.markError(created.id, 'Stream connection failed');

      // then the session should have error status and message
      expect(errored).toBeDefined();
      expect(errored!.status).toBe('error');
      expect(errored!.errorMessage).toBe('Stream connection failed');
      expect(errored!.endedAt).toBeInstanceOf(Date);
    });
  });

  describe('getAll', () => {
    it('should return all sessions', () => {
      // given multiple sessions
      store.create({
        ticketId: 'ticket-111',
        requestId: 'request-111',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active',
      });

      store.create({
        ticketId: 'ticket-222',
        requestId: 'request-222',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'ended',
      });

      // when getting all sessions
      const all = store.getAll();

      // then all sessions should be returned
      expect(all).toHaveLength(2);
      expect(all.some(s => s.ticketId === 'ticket-111')).toBe(true);
      expect(all.some(s => s.ticketId === 'ticket-222')).toBe(true);
    });
  });

  describe('getActiveSessions', () => {
    it('should return only initializing and active sessions', () => {
      // given various sessions
      const active = store.create({
        ticketId: 'ticket-111',
        requestId: 'request-111',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active',
      });

      const initializing = store.create({
        ticketId: 'ticket-222',
        requestId: 'request-222',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'initializing',
      });

      store.create({
        ticketId: 'ticket-333',
        requestId: 'request-333',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'ended',
      });

      store.create({
        ticketId: 'ticket-444',
        requestId: 'request-444',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'error',
      });

      // when getting active sessions
      const activeSessions = store.getActiveSessions();

      // then only active and initializing sessions should be returned
      expect(activeSessions).toHaveLength(2);
      expect(activeSessions.some(s => s.id === active.id)).toBe(true);
      expect(activeSessions.some(s => s.id === initializing.id)).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all sessions', () => {
      // given multiple sessions
      store.create({
        ticketId: 'ticket-111',
        requestId: 'request-111',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active',
      });

      store.create({
        ticketId: 'ticket-222',
        requestId: 'request-222',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'ended',
      });

      // when clearing
      store.clear();

      // then no sessions should remain
      expect(store.getAll()).toEqual([]);
    });
  });

  describe('reload', () => {
    it('should reload sessions from localStorage', () => {
      // given a session in the store
      const created = store.create({
        ticketId: 'ticket-789',
        requestId: 'request-456',
        publisher: mockCustomer,
        subscriber: mockEngineer,
        status: 'active',
      });

      // when modifying localStorage directly and reloading
      const stored = JSON.parse(localStorage.getItem('screenShareSessions')!);
      stored[0].status = 'ended';
      localStorage.setItem('screenShareSessions', JSON.stringify(stored));

      store.reload();

      // then the reloaded session should have the updated status
      const reloaded = store.getById(created.id);
      expect(reloaded!.status).toBe('ended');
    });

    it('should handle corrupted localStorage gracefully', () => {
      // given corrupted data in localStorage
      localStorage.setItem('screenShareSessions', 'invalid json');

      // when reloading
      store.reload();

      // then store should be empty and not throw
      expect(store.getAll()).toEqual([]);
    });
  });

  describe('localStorage persistence', () => {
    it('should load existing sessions from localStorage on construction', () => {
      // given sessions in localStorage
      const existingSessions = [
        {
          id: 'existing-1',
          ticketId: 'ticket-111',
          requestId: 'request-111',
          publisher: mockCustomer,
          subscriber: mockEngineer,
          status: 'active',
          startedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem('screenShareSessions', JSON.stringify(existingSessions));

      // when creating a new store instance
      const newStore = new ScreenShareSessionStore();

      // then existing sessions should be loaded
      const loaded = newStore.getAll();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('existing-1');
      expect(loaded[0].startedAt).toBeInstanceOf(Date);
      expect(loaded[0].lastActivityAt).toBeInstanceOf(Date);
    });
  });
});