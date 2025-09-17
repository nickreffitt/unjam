import { type ChatMessage, type ChatEventType } from '@common/types';

/**
 * Event emitter for chat-related events
 * Abstracts the underlying event mechanism to allow for future technology changes
 */
export class ChatEventEmitter {
  constructor() {
    // No need for local listeners - everything goes through window events
  }

  /**
   * Emits a chat message sent event
   * @param message - The sent message
   */
  emitChatMessageSent(message: ChatMessage): void {
    this.emitWindowEvent('chatMessageSent', { message });
  }

  /**
   * Emits a chat messages read event
   * @param messageIds - Array of message IDs that were marked as read
   * @param ticketId - The ticket ID for the chat
   */
  emitChatMessagesRead(messageIds: string[], ticketId: string): void {
    this.emitWindowEvent('chatMessagesRead', { messageIds, ticketId });
  }

  /**
   * Emits a chat reloaded event
   * @param ticketId - The ticket ID for the chat that was reloaded
   */
  emitChatReloaded(ticketId: string): void {
    this.emitWindowEvent('chatReloaded', { ticketId });
  }

  /**
   * Emits a storage event for cross-tab communication only
   */
  private emitWindowEvent(type: ChatEventType, data: Record<string, unknown>): void {
    if (typeof window === 'undefined') return; // Skip in non-browser environments

    const eventPayload = {
      type,
      ...data,
      timestamp: Date.now()
    };

    // Use a temporary localStorage key to trigger storage events across tabs
    const eventKey = 'chatstore-event';
    localStorage.setItem(eventKey, JSON.stringify(eventPayload));

    // Clean up immediately to avoid cluttering localStorage
    localStorage.removeItem(eventKey);

    console.debug('ChatEventEmitter: Emitting storage event:', type, data);
  }
}