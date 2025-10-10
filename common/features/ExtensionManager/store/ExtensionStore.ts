import { browser } from 'wxt/browser';
import type { Session } from '@supabase/supabase-js';

/**
 * Storage key for Supabase session
 */
const SESSION_STORAGE_KEY = 'supabase-session';

/**
 * Store for managing extension-level data using browser.storage.local API
 * Persists data across browser sessions and makes it available to all extension contexts
 */
export class ExtensionStore {
  /**
   * Saves the Supabase session to storage
   * @param session - The Supabase session to store, or null to clear
   */
  async saveSession(session: Session | null): Promise<void> {
    try {
      if (session) {
        console.debug('[ExtensionStore] Saving session to storage');
        await browser.storage.local.set({ [SESSION_STORAGE_KEY]: session });
      } else {
        console.debug('[ExtensionStore] Clearing session from storage');
        await browser.storage.local.remove(SESSION_STORAGE_KEY);
      }
    } catch (error) {
      console.error('[ExtensionStore] Failed to save session:', error);
      throw error;
    }
  }

  /**
   * Retrieves the Supabase session from storage
   * @returns The stored session or null if not found
   */
  async getSession(): Promise<Session | null> {
    try {
      console.debug('[ExtensionStore] Retrieving session from storage');
      const result = await browser.storage.local.get(SESSION_STORAGE_KEY);
      const session = result[SESSION_STORAGE_KEY] as Session | undefined;
      return session || null;
    } catch (error) {
      console.error('[ExtensionStore] Failed to retrieve session:', error);
      return null;
    }
  }

  /**
   * Clears the stored session
   */
  async clearSession(): Promise<void> {
    await this.saveSession(null);
  }

  /**
   * Watches for changes to the session storage
   * @param callback - Function to call when session changes
   * @returns Unwatch function to stop listening
   */
  watchSession(callback: (newSession: Session | null, oldSession: Session | null) => void): () => void {
    console.debug('[ExtensionStore] Setting up session watcher');

    const listener = (changes: Record<string, any>, areaName: string) => {
      if (areaName === 'local' && changes[SESSION_STORAGE_KEY]) {
        console.debug('[ExtensionStore] Session changed in storage');
        const change = changes[SESSION_STORAGE_KEY];
        callback(change.newValue || null, change.oldValue || null);
      }
    };

    browser.storage.onChanged.addListener(listener);

    // Return unwatch function
    return () => {
      browser.storage.onChanged.removeListener(listener);
    };
  }
}
