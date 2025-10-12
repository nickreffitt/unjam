import type { WebRTCSignal } from '@common/types';

/**
 * Interface for WebRTC signaling storage
 * Supports both synchronous (localStorage) and asynchronous (Supabase) implementations
 */
export interface WebRTCSignalingStore {
  /**
   * Creates a new WebRTC signal
   * @param signal - The signal to create (without id and createdAt)
   * @returns The created signal
   */
  create(signal: Omit<WebRTCSignal, 'id' | 'createdAt'>): Promise<WebRTCSignal>;

  /**
   * Gets unprocessed signals for a specific session and user
   * @param sessionId - The session ID
   * @param userId - The user ID to get signals for
   * @returns Array of unprocessed signals
   */
  getUnprocessedForSession(sessionId: string, userId: string): Promise<WebRTCSignal[]>;

  /**
   * Marks a signal as processed
   * @param signalId - The signal ID to mark as processed
   * @returns True if marked successfully, false if not found
   */
  markProcessed(signalId: string): Promise<boolean>;

  /**
   * Deletes all signals for a session
   * @param sessionId - The session ID
   * @returns Number of signals deleted
   */
  deleteBySessionId(sessionId: string): Promise<number>;

  /**
   * Clears all signals (mainly for testing purposes)
   */
  clear(): Promise<void>;

  /**
   * Reloads signals from storage
   * Used when we need to sync with changes made by other tabs
   */
  reload(): void;
}
