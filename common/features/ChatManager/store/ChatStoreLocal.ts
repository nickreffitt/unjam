import { type ChatMessage, type UserProfile } from '@common/types';
import { type ChatEventEmitter } from '@common/features/ChatManager/events';
import { type ChatStore } from './ChatStore';

export class ChatStoreLocal implements ChatStore {
  private messages: ChatMessage[] = [];
  private readonly ticketId: string;
  private readonly storageKey: string;
  private readonly eventEmitter: ChatEventEmitter;

  constructor(ticketId: string, eventEmitter: ChatEventEmitter) {
    this.ticketId = ticketId;
    this.storageKey = `chatStore-${ticketId}`;
    this.eventEmitter = eventEmitter;
    this.loadMessagesFromStorage();
  }

  /**
   * Creates a new chat message
   * @param message - The message to create
   * @returns The created message
   */
  async create(message: ChatMessage): Promise<ChatMessage> {
    const newMessage = { ...message };

    // Add to the end of the array (chronological order)
    this.messages.push(newMessage);
    this.saveMessagesToStorage();

    console.debug('ChatStore: Created message', newMessage.id, 'for ticket', this.ticketId);

    // Emit event for message creation
    this.eventEmitter.emitChatMessageSent(newMessage);

    return newMessage;
  }

  /**
   * Gets recent messages in ascending order (oldest to newest)
   * @param size - Number of messages to return
   * @param offset - Number of messages to skip (for pagination)
   * @returns Array of messages in ascending chronological order
   */
  async getRecent(size: number, offset: number = 0): Promise<ChatMessage[]> {
    // Since messages are stored chronologically, we can slice directly
    const paginatedMessages = this.messages.slice(offset, offset + size);

    console.debug(
      `ChatStore: Retrieved ${paginatedMessages.length} messages for ticket ${this.ticketId} (${offset}-${offset + size - 1} of ${this.messages.length})`
    );

    return paginatedMessages.map(msg => ({ ...msg })); // Return copies to prevent external mutations
  }

  /**
   * Gets all messages for the ticket (mainly for testing purposes)
   * @returns All messages in chronological order
   */
  async getAll(): Promise<ChatMessage[]> {
    return [...this.messages];
  }

  /**
   * Gets the total count of messages for this ticket
   * @returns Number of messages
   */
  async getCount(): Promise<number> {
    return this.messages.length;
  }

  /**
   * Marks messages as read
   * @param messageIds - Array of message IDs to mark as read
   */
  async markAsRead(messageIds: string[]): Promise<void> {
    let updated = false;

    messageIds.forEach(id => {
      const message = this.messages.find(msg => msg.id === id);
      if (message && !message.isRead) {
        message.isRead = true;
        updated = true;
      }
    });

    if (updated) {
      this.saveMessagesToStorage();
      console.debug('ChatStore: Marked messages as read', messageIds);

      // Emit event for messages read
      this.eventEmitter.emitChatMessagesRead(messageIds, this.ticketId);
    }
  }

  /**
   * Reloads messages from localStorage
   * Used when we need to sync with changes made by other tabs
   */
  reload(): void {
    this.loadMessagesFromStorage();

    // Emit event for chat reload
    this.eventEmitter.emitChatReloaded(this.ticketId);
  }

  /**
   * Loads messages from localStorage
   */
  private loadMessagesFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsedMessages = JSON.parse(stored);
        // Convert date strings back to Date objects
        this.messages = parsedMessages.map((message: ChatMessage) => ({
          ...message,
          createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
        }));
        console.debug(`ChatStore: Loaded ${this.messages.length} messages from localStorage for ticket ${this.ticketId}`);
      } else {
        this.messages = [];
        console.debug(`ChatStore: No messages found for ticket ${this.ticketId}, initialized empty`);
      }
    } catch (error) {
      console.error('ChatStore: Error loading messages from localStorage', error);
      this.messages = [];
    }
  }

  /**
   * Saves messages to localStorage
   */
  private saveMessagesToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.messages));
      console.debug(`ChatStore: Saved ${this.messages.length} messages to localStorage for ticket ${this.ticketId}`);
    } catch (error) {
      console.error('ChatStore: Error saving messages to localStorage:', error);
    }
  }

  /**
   * Marks a user as typing
   * @param user - The user who is typing
   */
  markIsTyping(user: UserProfile): void {
    console.debug(`ChatStore: User ${user.name} is typing for ticket ${this.ticketId}`);

    // Emit event for sender typing
    this.eventEmitter.emitChatSenderIsTyping(this.ticketId, user);
  }

  /**
   * Clears all messages (mainly for testing purposes)
   */
  async clear(): Promise<void> {
    this.messages = [];
    this.saveMessagesToStorage();
    console.debug(`ChatStore: Cleared all messages for ticket ${this.ticketId}`);
  }
}
