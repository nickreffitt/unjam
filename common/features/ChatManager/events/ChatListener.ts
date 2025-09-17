import { type ChatMessage, type ChatEventType } from '@common/types';

/**
 * Interface for objects that listen to chat store events
 * All methods are optional to allow listeners to subscribe to only the events they care about
 */
export interface ChatListenerCallbacks {
  /**
   * Called when a new chat message is sent
   * @param message - The newly sent message
   */
  onChatMessageSent?(message: ChatMessage): void;

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
}

/**
 * Class that manages listening to global chat events via storage events
 * Handles the setup and teardown of storage event listeners for cross-tab communication
 */
export class ChatListener {
  private callbacks: Partial<ChatListenerCallbacks>;
  private isListening: boolean = false;
  private handleStorageEvent: ((event: StorageEvent) => void) | null = null;

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
   * Starts listening to storage events for cross-tab communication
   */
  startListening(): void {
    if (this.isListening || typeof window === 'undefined') return;

    this.handleStorageEvent = (event: StorageEvent) => {
      // Only process events for our specific key
      if (event.key !== 'chatstore-event' || !event.newValue) return;

      try {
        const eventData = JSON.parse(event.newValue);
        const { type, message, messageIds, ticketId } = eventData;

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
            if (this.callbacks.onChatMessageSent && deserializedMessage) {
              try {
                this.callbacks.onChatMessageSent(deserializedMessage);
              } catch (error) {
                console.error('ChatListener: Error in onChatMessageSent:', error);
              }
            }
            break;
          case 'chatMessagesRead':
            if (this.callbacks.onChatMessagesRead && messageIds && ticketId) {
              try {
                this.callbacks.onChatMessagesRead(messageIds, ticketId);
              } catch (error) {
                console.error('ChatListener: Error in onChatMessagesRead:', error);
              }
            }
            break;
          case 'chatReloaded':
            if (this.callbacks.onChatReloaded && ticketId) {
              try {
                this.callbacks.onChatReloaded(ticketId);
              } catch (error) {
                console.error('ChatListener: Error in onChatReloaded:', error);
              }
            }
            break;
        }
      } catch (error) {
        console.error('ChatListener: Error parsing storage event data:', error);
      }
    };

    window.addEventListener('storage', this.handleStorageEvent);
    this.isListening = true;
    console.debug('ChatListener: Started listening to global chat events via storage');
  }

  /**
   * Stops listening to storage events
   */
  stopListening(): void {
    if (!this.isListening || !this.handleStorageEvent) return;

    window.removeEventListener('storage', this.handleStorageEvent);
    this.handleStorageEvent = null;
    this.isListening = false;
    console.debug('ChatListener: Stopped listening to global chat events');
  }

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}