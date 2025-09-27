import { type ChatListener, type ChatListenerCallbacks } from './ChatListener';

/**
 * Supabase implementation of chat listener
 * Uses Supabase real-time channels for cross-client communication
 *
 * TODO: Implement actual Supabase integration
 * This is currently a stub implementation
 */
export class ChatListenerSupabase implements ChatListener {
  private callbacks: Partial<ChatListenerCallbacks>;
  private isListening: boolean = false;

  constructor(callbacks: Partial<ChatListenerCallbacks>) {
    this.callbacks = callbacks;
    // TODO: Initialize Supabase client and set up real-time channel subscriptions
    console.debug('ChatListenerSupabase: Initialized (stub implementation)');
  }

  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<ChatListenerCallbacks>): void {
    this.callbacks = callbacks;
    // TODO: Update Supabase channel callbacks if needed
    console.debug('ChatListenerSupabase: updateCallbacks() - TODO: Update Supabase channel callbacks');
  }

  /**
   * Starts listening to chat events for cross-client communication via Supabase
   */
  startListening(): void {
    if (this.isListening) return;

    // TODO: Subscribe to Supabase real-time channels for chat events
    console.debug('ChatListenerSupabase: startListening() - TODO: Subscribe to Supabase channels');

    this.isListening = true;
    // For now, just mark as listening without actually implementing
    // throw new Error('ChatListenerSupabase.startListening() not yet implemented');
  }

  /**
   * Stops listening to chat events
   */
  stopListening(): void {
    if (!this.isListening) return;

    // TODO: Unsubscribe from Supabase real-time channels
    console.debug('ChatListenerSupabase: stopListening() - TODO: Unsubscribe from Supabase channels');

    this.isListening = false;
    // For now, just mark as not listening without actually implementing
    // throw new Error('ChatListenerSupabase.stopListening() not yet implemented');
  }

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}