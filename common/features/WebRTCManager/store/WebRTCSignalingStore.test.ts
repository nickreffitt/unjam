import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebRTCSignalingStoreLocal } from './WebRTCSignalingStoreLocal';
import type { UserProfile } from '@common/types';

describe('WebRTCSignalingStoreLocal', () => {
  let store: WebRTCSignalingStoreLocal;
  let mockSender: UserProfile;
  let mockReceiver: UserProfile;
  const sessionId = 'session-789';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();

    store = new WebRTCSignalingStoreLocal();

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
    it('should create a new WebRTC signal with generated ID and timestamp', async () => {
      // given signal data without ID and timestamp
      const signalData = {
        sessionId,
        from: mockSender,
        to: mockReceiver,
        type: 'offer' as const,
        payload: { type: 'offer', sdp: 'test-sdp' },
      };

      // when creating the signal
      const created = await store.create(signalData);

      // then the signal should have ID and timestamp
      expect(created.id).toBeTruthy();
      expect(created.id).toContain('wrs-');
      expect(created.sessionId).toBe(sessionId);
      expect(created.from).toEqual(mockSender);
      expect(created.to).toEqual(mockReceiver);
      expect(created.type).toBe('offer');
      expect(created.payload).toEqual({ type: 'offer', sdp: 'test-sdp' });
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.processed).toBe(false);
    });

    it('should persist the signal to localStorage', async () => {
      // given localStorage is empty
      expect(localStorage.getItem('webrtcSignals')).toBeNull();

      // when creating a signal
      const signalData = {
        sessionId,
        from: mockSender,
        to: mockReceiver,
        type: 'ice-candidate' as const,
        payload: { candidate: 'test-candidate' },
      };
      await store.create(signalData);

      // then the signal should be in localStorage
      const stored = localStorage.getItem('webrtcSignals');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].sessionId).toBe(sessionId);
    });
  });

  describe('getUnprocessedForSession', () => {
    it('should return unprocessed signals for specific session and user', async () => {
      // given signals for a session
      const signal1 = await store.create({
        sessionId,
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'offer' },
      });

      await store.create({
        sessionId,
        from: mockReceiver,
        to: mockSender,
        type: 'answer',
        payload: { sdp: 'answer' },
      });

      // when getting unprocessed signals for Bob
      const unprocessed = await store.getUnprocessedForSession(sessionId, mockReceiver.id);

      // then should return only Bob's unprocessed signals
      expect(unprocessed).toHaveLength(1);
      expect(unprocessed[0].id).toBe(signal1.id);
      expect(unprocessed[0].to.id).toBe(mockReceiver.id);
    });

    it('should not return signals for other sessions', async () => {
      // given signals for different sessions
      await store.create({
        sessionId: 'session-A',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'offer' },
      });

      // when getting signals for session-B
      const signals = await store.getUnprocessedForSession('session-B', mockReceiver.id);

      // then should return empty array
      expect(signals).toEqual([]);
    });

    it('should not return processed signals', async () => {
      // given a processed signal
      const signal = await store.create({
        sessionId,
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'offer' },
      });

      await store.markProcessed(signal.id);

      // when getting unprocessed signals
      const unprocessed = await store.getUnprocessedForSession(sessionId, mockReceiver.id);

      // then should return empty array
      expect(unprocessed).toEqual([]);
    });

    it('should return signals sorted by creation time', async () => {
      // given multiple signals created at different times
      const signal1 = await store.create({
        sessionId,
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'offer-1' },
      });

      vi.setSystemTime(new Date(Date.now() + 1000));

      const signal2 = await store.create({
        sessionId,
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'offer-2' },
      });

      // when getting unprocessed signals
      const signals = await store.getUnprocessedForSession(sessionId, mockReceiver.id);

      // then should be sorted by creation time
      expect(signals).toHaveLength(2);
      expect(signals[0].id).toBe(signal1.id);
      expect(signals[1].id).toBe(signal2.id);
    });
  });

  describe('markProcessed', () => {
    it('should mark signal as processed', async () => {
      // given a created signal
      const signal = await store.create({
        sessionId,
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'offer' },
      });

      // when marking as processed
      const result = await store.markProcessed(signal.id);

      // then should return true and signal should be processed
      expect(result).toBe(true);

      // verify by checking getUnprocessedForSession
      const unprocessed = await store.getUnprocessedForSession(sessionId, mockReceiver.id);
      expect(unprocessed).toHaveLength(0);
    });

    it('should return false for non-existent signal', async () => {
      // when marking non-existent signal as processed
      const result = await store.markProcessed('non-existent');

      // then should return false
      expect(result).toBe(false);
    });

    it('should persist processed status to localStorage', async () => {
      // given a signal
      const signal = await store.create({
        sessionId,
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'offer' },
      });

      // when marking as processed
      await store.markProcessed(signal.id);

      // then the processed status should be in localStorage
      const stored = localStorage.getItem('webrtcSignals');
      const parsed = JSON.parse(stored!);
      expect(parsed[0].processed).toBe(true);
    });
  });

  describe('deleteBySessionId', () => {
    it('should delete all signals for a session', async () => {
      // given signals for two sessions
      await store.create({
        sessionId: 'session-A',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'offer-1' },
      });

      await store.create({
        sessionId: 'session-A',
        from: mockReceiver,
        to: mockSender,
        type: 'answer',
        payload: { sdp: 'answer-1' },
      });

      await store.create({
        sessionId: 'session-B',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'offer-2' },
      });

      // when deleting session-A
      const deleted = await store.deleteBySessionId('session-A');

      // then should delete 2 signals
      expect(deleted).toBe(2);

      // verify session-A signals are gone
      const sessionASignals = await store.getUnprocessedForSession('session-A', mockReceiver.id);
      expect(sessionASignals).toHaveLength(0);

      // verify session-B signals remain
      const sessionBSignals = await store.getUnprocessedForSession('session-B', mockReceiver.id);
      expect(sessionBSignals).toHaveLength(1);
    });

    it('should return 0 for non-existent session', async () => {
      // when deleting non-existent session
      const deleted = await store.deleteBySessionId('non-existent');

      // then should return 0
      expect(deleted).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all signals', async () => {
      // given multiple signals
      await store.create({
        sessionId: 'session-A',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'offer-1' },
      });

      await store.create({
        sessionId: 'session-B',
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'offer-2' },
      });

      // when clearing
      await store.clear();

      // then no signals should remain
      const sessionASignals = await store.getUnprocessedForSession('session-A', mockReceiver.id);
      const sessionBSignals = await store.getUnprocessedForSession('session-B', mockReceiver.id);
      expect(sessionASignals).toHaveLength(0);
      expect(sessionBSignals).toHaveLength(0);

      // verify localStorage is cleared
      const stored = localStorage.getItem('webrtcSignals');
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(0);
    });
  });

  describe('reload', () => {
    it('should reload signals from localStorage', async () => {
      // given a signal
      await store.create({
        sessionId,
        from: mockSender,
        to: mockReceiver,
        type: 'offer',
        payload: { sdp: 'offer' },
      });

      // when modifying localStorage directly and reloading
      const stored = localStorage.getItem('webrtcSignals');
      const parsed = JSON.parse(stored!);
      parsed[0].processed = true;
      localStorage.setItem('webrtcSignals', JSON.stringify(parsed));

      store.reload();

      // then the reloaded signal should have the updated status
      const unprocessed = await store.getUnprocessedForSession(sessionId, mockReceiver.id);
      expect(unprocessed).toHaveLength(0); // Signal is now processed
    });

    it('should handle corrupted localStorage gracefully', async () => {
      // given corrupted localStorage
      localStorage.setItem('webrtcSignals', 'invalid-json');

      // when reloading
      store.reload();

      // then store should be empty and not throw
      const signals = await store.getUnprocessedForSession(sessionId, mockReceiver.id);
      expect(signals).toEqual([]);
    });
  });

  describe('localStorage persistence', () => {
    it('should load existing signals from localStorage on construction', async () => {
      // given existing signals in localStorage
      const existingSignals = [
        {
          id: 'existing-1',
          sessionId,
          from: mockSender,
          to: mockReceiver,
          type: 'offer',
          payload: { sdp: 'existing' },
          createdAt: new Date().toISOString(),
          processed: false,
        },
      ];
      localStorage.setItem('webrtcSignals', JSON.stringify(existingSignals));

      // when creating a new store
      const newStore = new WebRTCSignalingStoreLocal();

      // then existing signals should be loaded
      const loaded = await newStore.getUnprocessedForSession(sessionId, mockReceiver.id);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('existing-1');
    });
  });
});
