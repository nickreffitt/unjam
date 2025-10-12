import type { WebRTCSignal } from '@common/types';
import type { WebRTCSignalingStore } from './WebRTCSignalingStore';

export class WebRTCSignalingStoreLocal implements WebRTCSignalingStore {
  private signals: Map<string, WebRTCSignal> = new Map();
  private readonly storageKey = 'webrtcSignals';

  constructor() {
    this.loadSignalsFromStorage();
  }

  /**
   * Creates a new WebRTC signal
   * @param signal - The signal to create (without id and createdAt)
   * @returns The created signal
   */
  async create(signal: Omit<WebRTCSignal, 'id' | 'createdAt'>): Promise<WebRTCSignal> {
    const newSignal: WebRTCSignal = {
      ...signal,
      id: this.generateId(),
      createdAt: new Date(),
      processed: false,
    };

    this.signals.set(newSignal.id, newSignal);
    this.saveSignalsToStorage();

    console.debug('WebRTCSignalingStore: Created signal', newSignal.type, newSignal.id, 'for session', newSignal.sessionId);

    return { ...newSignal };
  }

  /**
   * Gets unprocessed signals for a specific session and user
   * @param sessionId - The session ID
   * @param userId - The user ID to get signals for
   * @returns Array of unprocessed signals
   */
  async getUnprocessedForSession(sessionId: string, userId: string): Promise<WebRTCSignal[]> {
    const signals: WebRTCSignal[] = [];

    this.signals.forEach(signal => {
      if (signal.sessionId === sessionId && signal.to.id === userId && !signal.processed) {
        signals.push({ ...signal });
      }
    });

    return signals.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Marks a signal as processed
   * @param signalId - The signal ID to mark as processed
   * @returns True if marked successfully, false if not found
   */
  async markProcessed(signalId: string): Promise<boolean> {
    const signal = this.signals.get(signalId);

    if (!signal) {
      console.warn('WebRTCSignalingStore: Signal not found for processing', signalId);
      return false;
    }

    signal.processed = true;
    this.saveSignalsToStorage();

    console.debug('WebRTCSignalingStore: Marked signal as processed', signalId);
    return true;
  }

  /**
   * Deletes all signals for a session
   * @param sessionId - The session ID
   * @returns Number of signals deleted
   */
  async deleteBySessionId(sessionId: string): Promise<number> {
    let deletedCount = 0;

    this.signals.forEach((signal, signalId) => {
      if (signal.sessionId === sessionId) {
        this.signals.delete(signalId);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      this.saveSignalsToStorage();
      console.debug('WebRTCSignalingStore: Deleted', deletedCount, 'signals for session', sessionId);
    }

    return deletedCount;
  }

  /**
   * Clears all signals (mainly for testing purposes)
   */
  async clear(): Promise<void> {
    this.signals.clear();
    this.saveSignalsToStorage();
    console.debug('WebRTCSignalingStore: Cleared all signals');
  }

  /**
   * Reloads signals from localStorage
   * Used when we need to sync with changes made by other tabs
   */
  reload(): void {
    this.loadSignalsFromStorage();
    console.debug('WebRTCSignalingStore: Reloaded signals from storage');
  }

  /**
   * Loads signals from localStorage
   */
  private loadSignalsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);

      if (stored) {
        const parsedSignals = JSON.parse(stored) as WebRTCSignal[];
        this.signals.clear();

        parsedSignals.forEach(signal => {
          // Convert date strings back to Date objects
          this.signals.set(signal.id, {
            ...signal,
            createdAt: new Date(signal.createdAt),
          });
        });

        console.debug(`WebRTCSignalingStore: Loaded ${this.signals.size} signals from localStorage`);
      } else {
        this.signals.clear();
        console.debug('WebRTCSignalingStore: No signals found in localStorage, initialized empty');
      }
    } catch (error) {
      console.error('WebRTCSignalingStore: Error loading signals from localStorage', error);
      this.signals.clear();
    }
  }

  /**
   * Saves signals to localStorage
   */
  private saveSignalsToStorage(): void {
    try {
      const signalsArray = Array.from(this.signals.values());
      localStorage.setItem(this.storageKey, JSON.stringify(signalsArray));
      console.debug(`WebRTCSignalingStore: Saved ${signalsArray.length} signals to localStorage`);
    } catch (error) {
      console.error('WebRTCSignalingStore: Error saving signals to localStorage:', error);
    }
  }

  /**
   * Generates a unique ID for signals
   */
  private generateId(): string {
    return `wrs-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
