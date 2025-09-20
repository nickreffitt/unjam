import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebRTCSignalingStore } from './WebRTCSignalingStore';
import type { UserProfile, WebRTCSignal } from '@common/types';

describe('WebRTCSignalingStore', () => {
  let store: WebRTCSignalingStore;
  let mockSender: UserProfile;
  let mockReceiver: UserProfile;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();

    store = new WebRTCSignalingStore();

    mockSender = {
      id: 'user-123',
      name: 'Alice',
      type: 'customer',
      email: 'alice@example.com',
    };

    mockReceiver = {
      id: 'user-456',
      name: 'Bob',
      type: 'engineer',
      email: 'bob@example.com',
    };
  });

  describe('create', () => {
    it('should create a new WebRTC signal with generated ID and timestamp', () => {
      // given signal data without ID and timestamp
      const signalData = {
        sessionId: 'session-789',
        from: mockSender,
        to: mockReceiver,
        type: 'offer' as const,
        payload: { type: 'offer', sdp: 'test-sdp' },
      };

      // when creating the signal
      const created = store.create(signalData);

      // then the signal should have ID and timestamp
      expect(created.id).toBeTruthy();
      expect(created.id).toContain('wrs-');
      expect(created.sessionId).toBe('session-789');
      expect(created.from).toEqual(mockSender);
      expect(created.to).toEqual(mockReceiver);
      expect(created.type).toBe('offer');
      expect(created.payload).toEqual({ type: 'offer', sdp: 'test-sdp' });
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.processed).toBe(false);
    });

    it('should persist the signal to localStorage', () => {
      // given localStorage is empty
      expect(localStorage.getItem('webrtcSignals')).toBeNull();

      // when creating a signal
      const signalData = {
        sessionId: 'session-789',
        from: mockSender,
        to: mockReceiver,
        type: 'ice-candidate' as const,
        payload: { candidate: 'test-candidate' },
      };
      store.create(signalData);

      // then the signal should be in localStorage
      const stored = localStorage.getItem('webrtcSignals');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].sessionId).toBe('session-789');
    });
  });

  describe('getById', () => {
    it('should return a signal by ID', () => {
      // given a created signal
      const created = store.create({
        sessionId: 'session-789',
        from: mockSender,
        to: mockReceiver,
        type: 'answer',
        payload: { type: 'answer', sdp: 'test-answer' },
      });

      // when getting by ID
      const retrieved = store.getById(created.id);

      // then the signal should be returned
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.type).toBe('answer');
    });

    it('should return undefined for non-existent ID', () => {
      // when getting by non-existent ID
      const retrieved = store.getById('non-existent');

      // then undefined should be returned
      expect(retrieved).toBeUndefined();
    });

    it('should return a copy to prevent external mutations', () => {
      // given a created signal
      const created = store.create({
        sessionId: 'session-789',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'original' },
      });

      // when getting by ID and modifying it
      const retrieved = store.getById(created.id);
      retrieved!.payload.sdp = 'modified';

      // then the original should be unchanged
      const retrievedAgain = store.getById(created.id);
      expect(retrievedAgain!.payload.sdp).toBe('original');
    });
  });

  describe('getBySessionId', () => {
    it('should return all signals for a session sorted by creation time', () => {
      // given multiple signals for the same session
      const signal1 = store.create({
        sessionId: 'session-789',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'offer' },
      });

      vi.setSystemTime(new Date(Date.now() + 1000));

      const signal2 = store.create({
        sessionId: 'session-789',
        from: mockReceiver,
        to: mockSender,
        type: 'answer',
        payload: { sdp: 'answer' },
      });

      // when getting by session ID
      const signals = store.getBySessionId('session-789');

      // then both signals should be returned in chronological order
      expect(signals).toHaveLength(2);
      expect(signals[0].id).toBe(signal1.id);
      expect(signals[1].id).toBe(signal2.id);
    });

    it('should return empty array for session with no signals', () => {
      // when getting by session ID with no signals
      const signals = store.getBySessionId('no-signals');

      // then empty array should be returned
      expect(signals).toEqual([]);
    });
  });

  describe('getUnprocessedForUser', () => {
    it('should return unprocessed signals for a user', () => {
      // given processed and unprocessed signals
      const processed = store.create({
        sessionId: 'session-111',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'processed' },
      });
      store.markProcessed(processed.id);

      const unprocessed = store.create({
        sessionId: 'session-222',
        from: mockSender,
        to: mockReceiver,
        type: 'ice-candidate',
        payload: { candidate: 'unprocessed' },
      });

      // when getting unprocessed signals for receiver
      const signals = store.getUnprocessedForUser(mockReceiver.id);

      // then only unprocessed signal should be returned
      expect(signals).toHaveLength(1);
      expect(signals[0].id).toBe(unprocessed.id);
      expect(signals[0].processed).toBe(false);
    });

    it('should not return signals for other users', () => {
      // given signals for different users
      store.create({
        sessionId: 'session-111',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'for-receiver' },
      });

      const otherUser = { ...mockReceiver, id: 'other-user' };
      store.create({
        sessionId: 'session-222',
        from: mockSender,
        to: otherUser,
        type: 'offer',
        payload: { sdp: 'for-other' },
      });

      // when getting unprocessed signals for receiver
      const signals = store.getUnprocessedForUser(mockReceiver.id);

      // then only receiver's signal should be returned
      expect(signals).toHaveLength(1);
      expect(signals[0].payload.sdp).toBe('for-receiver');
    });
  });

  describe('getUnprocessedForSession', () => {
    it('should return unprocessed signals for specific session and user', () => {
      // given signals for different sessions
      const sessionA = store.create({
        sessionId: 'session-A',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'session-A' },
      });

      store.create({
        sessionId: 'session-B',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'session-B' },
      });

      // when getting unprocessed signals for session A
      const signals = store.getUnprocessedForSession('session-A', mockReceiver.id);

      // then only session A signal should be returned
      expect(signals).toHaveLength(1);
      expect(signals[0].id).toBe(sessionA.id);
      expect(signals[0].sessionId).toBe('session-A');
    });
  });

  describe('markProcessed', () => {
    it('should mark signal as processed', () => {
      // given an unprocessed signal
      const signal = store.create({
        sessionId: 'session-789',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'test' },
      });

      // when marking as processed
      const result = store.markProcessed(signal.id);

      // then signal should be marked as processed
      expect(result).toBe(true);
      const processed = store.getById(signal.id);
      expect(processed!.processed).toBe(true);
    });

    it('should return false for non-existent signal', () => {
      // when marking non-existent signal as processed
      const result = store.markProcessed('non-existent');

      // then should return false
      expect(result).toBe(false);
    });

    it('should persist processed status to localStorage', () => {
      // given a created signal
      const signal = store.create({
        sessionId: 'session-789',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'test' },
      });

      // when marking as processed
      store.markProcessed(signal.id);

      // then the processed status should be in localStorage
      const stored = localStorage.getItem('webrtcSignals');
      const parsed = JSON.parse(stored!);
      expect(parsed[0].processed).toBe(true);
    });
  });

  describe('markMultipleProcessed', () => {
    it('should mark multiple signals as processed', () => {
      // given multiple signals
      const signal1 = store.create({
        sessionId: 'session-789',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'signal1' },
      });

      const signal2 = store.create({
        sessionId: 'session-789',
        from: mockSender,
        to: mockReceiver,
        type: 'answer',
        payload: { sdp: 'signal2' },
      });

      // when marking multiple as processed
      const result = store.markMultipleProcessed([signal1.id, signal2.id, 'non-existent']);

      // then should return count of successfully processed signals
      expect(result).toBe(2);
      expect(store.getById(signal1.id)!.processed).toBe(true);
      expect(store.getById(signal2.id)!.processed).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete a signal', () => {
      // given a created signal
      const signal = store.create({
        sessionId: 'session-789',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'test' },
      });

      // when deleting the signal
      const result = store.delete(signal.id);

      // then signal should be deleted
      expect(result).toBe(true);
      expect(store.getById(signal.id)).toBeUndefined();
    });

    it('should return false for non-existent signal', () => {
      // when deleting non-existent signal
      const result = store.delete('non-existent');

      // then should return false
      expect(result).toBe(false);
    });
  });

  describe('deleteBySessionId', () => {
    it('should delete all signals for a session', () => {
      // given signals for different sessions
      const sessionA1 = store.create({
        sessionId: 'session-A',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'A1' },
      });

      const sessionA2 = store.create({
        sessionId: 'session-A',
        from: mockReceiver,
        to: mockSender,
        type: 'answer',
        payload: { sdp: 'A2' },
      });

      const sessionB = store.create({
        sessionId: 'session-B',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'B1' },
      });

      // when deleting signals for session A
      const result = store.deleteBySessionId('session-A');

      // then only session A signals should be deleted
      expect(result).toBe(2);
      expect(store.getById(sessionA1.id)).toBeUndefined();
      expect(store.getById(sessionA2.id)).toBeUndefined();
      expect(store.getById(sessionB.id)).toBeDefined();
    });
  });

  describe('cleanupOldSignals', () => {
    it('should cleanup old processed signals', () => {
      // given old processed and recent unprocessed signals
      const baseTime = Date.now();
      const oldTime = baseTime - 60 * 60 * 1000; // 1 hour ago

      // Mock Date.now() to return old time during signal creation
      vi.spyOn(global.Date, 'now').mockReturnValue(oldTime);
      vi.setSystemTime(new Date(oldTime));

      const oldProcessed = store.create({
        sessionId: 'session-789',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'old' },
      });

      // Mark as processed while in old time
      store.markProcessed(oldProcessed.id);

      // Reset time to current and create recent signal
      vi.spyOn(global.Date, 'now').mockReturnValue(baseTime);
      vi.setSystemTime(new Date(baseTime));

      const recent = store.create({
        sessionId: 'session-789',
        from: mockSender,
        to: mockReceiver,
        type: 'answer',
        payload: { sdp: 'recent' },
      });

      // when cleaning up old signals (30 minutes max age)
      const result = store.cleanupOldSignals(30);

      // then old processed signal should be cleaned up
      expect(result).toBe(1);
      expect(store.getById(oldProcessed.id)).toBeUndefined();
      expect(store.getById(recent.id)).toBeDefined();

      // Clean up mocks
      vi.restoreAllMocks();
    });

    it('should not cleanup old unprocessed signals', () => {
      // given old unprocessed signal
      const oldDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      vi.setSystemTime(oldDate);

      const oldUnprocessed = store.create({
        sessionId: 'session-789',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'old-unprocessed' },
      });

      vi.setSystemTime(new Date());

      // when cleaning up old signals
      const result = store.cleanupOldSignals(30);

      // then old unprocessed signal should not be cleaned up
      expect(result).toBe(0);
      expect(store.getById(oldUnprocessed.id)).toBeDefined();
    });
  });

  describe('clear', () => {
    it('should remove all signals', () => {
      // given multiple signals
      store.create({
        sessionId: 'session-111',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'test1' },
      });

      store.create({
        sessionId: 'session-222',
        from: mockReceiver,
        to: mockSender,
        type: 'answer',
        payload: { sdp: 'test2' },
      });

      // when clearing
      store.clear();

      // then no signals should remain
      expect(store.getAll()).toEqual([]);
    });
  });

  describe('reload', () => {
    it('should reload signals from localStorage', () => {
      // given a signal in the store
      const signal = store.create({
        sessionId: 'session-789',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'original' },
      });

      // when modifying localStorage directly and reloading
      const stored = JSON.parse(localStorage.getItem('webrtcSignals')!);
      stored[0].processed = true;
      localStorage.setItem('webrtcSignals', JSON.stringify(stored));

      store.reload();

      // then the reloaded signal should have the updated status
      const reloaded = store.getById(signal.id);
      expect(reloaded!.processed).toBe(true);
    });

    it('should handle corrupted localStorage gracefully', () => {
      // given corrupted data in localStorage
      localStorage.setItem('webrtcSignals', 'invalid json');

      // when reloading
      store.reload();

      // then store should be empty and not throw
      expect(store.getAll()).toEqual([]);
    });
  });

  describe('localStorage persistence', () => {
    it('should load existing signals from localStorage on construction', () => {
      // given signals in localStorage
      const existingSignals = [
        {
          id: 'existing-1',
          sessionId: 'session-111',
          from: mockSender,
          to: mockReceiver,
          type: 'offer',
          payload: { sdp: 'existing' },
          createdAt: new Date().toISOString(),
          processed: false,
        },
      ];
      localStorage.setItem('webrtcSignals', JSON.stringify(existingSignals));

      // when creating a new store instance
      const newStore = new WebRTCSignalingStore();

      // then existing signals should be loaded
      const loaded = newStore.getAll();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('existing-1');
      expect(loaded[0].createdAt).toBeInstanceOf(Date);
    });
  });
});