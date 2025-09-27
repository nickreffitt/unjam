import { type ChatMessage, type UserProfile } from '@common/types';

/**
 * Interface for chat event emission implementations
 * Defines the contract that all chat event emitter implementations must follow
 */
export interface ChatEventEmitter {
  /**
   * Emits a chat message sent event
   * @param message - The sent message
   */
  emitChatMessageSent(message: ChatMessage): void;

  /**
   * Emits a chat messages read event
   * @param messageIds - Array of message IDs that were marked as read
   * @param ticketId - The ticket ID for the chat
   */
  emitChatMessagesRead(messageIds: string[], ticketId: string): void;

  /**
   * Emits a chat reloaded event
   * @param ticketId - The ticket ID for the chat that was reloaded
   */
  emitChatReloaded(ticketId: string): void;

  /**
   * Emits a sender typing event
   * @param ticketId - The ticket ID for the chat
   * @param user - The user who is typing
   */
  emitChatSenderIsTyping(ticketId: string, user: UserProfile): void;
}