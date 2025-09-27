import { type ChatMessage, type UserProfile } from '@common/types';

/**
 * Interface for objects that listen to chat store events
 * All methods are optional to allow listeners to subscribe to only the events they care about
 */
export interface ChatListenerCallbacks {
  /**
   * Called when a new chat message is received (sent by another user/tab)
   * @param message - The newly received message
   */
  onChatMessageReceived?(message: ChatMessage): void;

  /**
   * Called when chat messages are marked as read
   * @param messageIds - Array of message IDs that were marked as read
   * @param ticketId - The ticket ID for the chat
   */
  onChatMessagesRead?(messageIds: string[], ticketId: string): void;

  /**
   * Called when chat messages are reloaded from storage
   * @param ticketId - The ticket ID for the chat that was reloaded
   */
  onChatReloaded?(ticketId: string): void;

  /**
   * Called when the receiver is typing
   * @param ticketId - The ticket ID for the chat
   * @param user - The user who is typing (the receiver from this listener's perspective)
   */
  onChatReceiverIsTyping?(ticketId: string, user: UserProfile): void;
}

/**
 * Interface for chat listener implementations
 * Defines the contract that all chat listener implementations must follow
 */
export interface ChatListener {
  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<ChatListenerCallbacks>): void;

  /**
   * Starts listening to chat events for cross-tab/cross-client communication
   */
  startListening(): void;

  /**
   * Stops listening to chat events
   */
  stopListening(): void;

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean;
}