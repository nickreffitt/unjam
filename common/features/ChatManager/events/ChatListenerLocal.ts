import { type ChatMessage, type ChatEventType, type UserProfile } from '@common/types';
import { type ChatListener, type ChatListenerCallbacks } from './ChatListener';

/**
 * Local storage implementation of chat listener
 * Uses window events and localStorage for cross-tab communication
 */
export class ChatListenerLocal implements ChatListener {
  private callbacks: Partial<ChatListenerCallbacks>;
  private isListening: boolean = false;
  private handleStorageEvent: ((event: StorageEvent) => void) | null = null;
  private handleWindowEvent: ((event: CustomEvent) => void) | null = null;

  constructor(callbacks: Partial<ChatListenerCallbacks>) {
    this.callbacks = callbacks;
  }

  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<ChatListenerCallbacks>): void {
    this.callbacks = callbacks;
  }

  /**
   * Starts listening to both storage events (cross-tab) and window events (same-tab)
   */
  startListening(): void {
    if (this.isListening || typeof window === 'undefined') return;

    // Listen for storage events (cross-tab communication)
    this.handleStorageEvent = (event: StorageEvent) => {
      // Only process events for our specific key
      if (event.key !== 'chatstore-event' || !event.newValue) return;

      try {
        const eventData = JSON.parse(event.newValue);
        this.processEventData(eventData);
      } catch (error) {
        console.error('ChatListenerLocal: Error parsing storage event data:', error);
      }
    };

    // Listen for window events (same-tab communication)
    this.handleWindowEvent = (event: CustomEvent) => {
      try {
        this.processEventData(event.detail);
      } catch (error) {
        console.error('ChatListenerLocal: Error processing window event data:', error);
      }
    };

    window.addEventListener('storage', this.handleStorageEvent);
    window.addEventListener('chat-event', this.handleWindowEvent as EventListener);
    this.isListening = true;

    console.debug('ChatListenerLocal: Started listening to global chat events via storage and window events');
  }

  /**
   * Processes event data from either storage or window events
   */
  private processEventData(eventData: any): void {
    try {
      if (!eventData || typeof eventData !== 'object') {
        console.warn('ChatListenerLocal: Invalid event data received:', eventData);
        return;
      }

      const { type, message, messageIds, ticketId, user } = eventData;

      // Deserialize Date objects if message is present
      let deserializedMessage = message;
      if (message) {
        deserializedMessage = {
          ...message,
          createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
        };
      }

      switch (type as ChatEventType) {
        case 'chatMessageSent':
          if (this.callbacks.onChatMessageReceived && deserializedMessage) {
            try {
              this.callbacks.onChatMessageReceived(deserializedMessage);
            } catch (error) {
              console.error('ChatListenerLocal: Error in onChatMessageReceived:', error);
            }
          }
          break;
        case 'chatMessagesRead':
          if (this.callbacks.onChatMessagesRead && messageIds && ticketId) {
            try {
              this.callbacks.onChatMessagesRead(messageIds, ticketId);
            } catch (error) {
              console.error('ChatListenerLocal: Error in onChatMessagesRead:', error);
            }
          }
          break;
        case 'chatReloaded':
          if (this.callbacks.onChatReloaded && ticketId) {
            try {
              this.callbacks.onChatReloaded(ticketId);
            } catch (error) {
              console.error('ChatListenerLocal: Error in onChatReloaded:', error);
            }
          }
          break;
        case 'chatSenderIsTyping':
          if (this.callbacks.onChatReceiverIsTyping && ticketId && user) {
            try {
              this.callbacks.onChatReceiverIsTyping(ticketId, user);
            } catch (error) {
              console.error('ChatListenerLocal: Error in onChatReceiverIsTyping:', error);
            }
          }
          break;
      }
    } catch (error) {
      console.error('ChatListenerLocal: Error processing event data:', error);
    }
  }

  /**
   * Stops listening to both storage and window events
   */
  stopListening(): void {
    if (!this.isListening) return;

    if (this.handleStorageEvent) {
      window.removeEventListener('storage', this.handleStorageEvent);
      this.handleStorageEvent = null;
    }

    if (this.handleWindowEvent) {
      window.removeEventListener('chat-event', this.handleWindowEvent as EventListener);
      this.handleWindowEvent = null;
    }

    this.isListening = false;
    console.debug('ChatListenerLocal: Stopped listening to global chat events');
  }

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}