import { type ChatMessage, type ChatEventType, type UserProfile } from '@common/types';

/**
 * Event emitter for chat-related events
 * Abstracts the underlying event mechanism to allow for future technology changes
 */
export class ChatEventEmitter {
  private nextTypingEventTime: Date | null = null;

  constructor() {
    // No need for local listeners - everything goes through window events
  }

  /**
   * Emits a chat message sent event
   * @param message - The sent message
   */
  emitChatMessageSent(message: ChatMessage): void {
    this.emitWindowEvent('chatMessageSent', { message });

    this.nextTypingEventTime = null;
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
   * Emits a sender typing event
   * @param ticketId - The ticket ID for the chat
   * @param user - The user who is typing
   */
  emitChatSenderIsTyping(ticketId: string, user: UserProfile): void {
    const now = new Date();

    // Check if we should throttle the event (only emit once every 5 seconds)
    if (this.nextTypingEventTime === null || now >= this.nextTypingEventTime) {
      // Emit the event and set the next allowed time to 5 seconds from now
      this.emitWindowEvent('chatSenderIsTyping', { ticketId, user });
      this.nextTypingEventTime = new Date(now.getTime() + 5000); // 5 seconds in the future
    }
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