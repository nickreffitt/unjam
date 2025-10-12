import { type ChatMessage, type UserProfile } from '@common/types';
import { type ChatStore } from '@common/features/ChatManager/store';
import { type ChatChanges } from './store/ChatChanges';

export class ChatManager {
  private readonly ticketId: string;
  private readonly sender: UserProfile;
  private readonly receiver: UserProfile;
  private readonly chatStore: ChatStore;
  private readonly changes: ChatChanges;

  constructor(
    ticketId: string, 
    sender: UserProfile, 
    receiver: UserProfile,
    chatStore: ChatStore,
    changes: ChatChanges) {
    this.ticketId = ticketId;
    this.sender = sender;
    this.receiver = receiver;
    this.chatStore = chatStore;
    this.changes = changes;

    this.changes.start();
  }

  /**
   * Sends a new message in the chat
   * @param content - The message content to send
   * @returns The created chat message
   */
  async send(content: string): Promise<ChatMessage> {
    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }

    // Create the message object
    const message: ChatMessage = {
      id: `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      ticketId: this.ticketId,
      sender: this.sender,
      receiver: this.receiver,
      content: content.trim(),
      createdAt: new Date(),
      isRead: false
    };

    // Store the message
    const createdMessage = await this.chatStore.create(message);

    console.debug(
      `ChatManager: Message sent from ${this.sender.name} to ${this.receiver.name} for ticket ${this.ticketId}`
    );

    return createdMessage;
  }

  /**
   * Gets recent messages from the chat
   * @param size - Number of messages to retrieve
   * @param offset - Number of messages to skip (for pagination)
   * @returns Array of chat messages in ascending chronological order
   */
  async getRecent(size: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    // Validate parameters
    if (size <= 0) {
      throw new Error('Size must be greater than 0');
    }
    if (offset < 0) {
      throw new Error('Offset cannot be negative');
    }

    const messages = await this.chatStore.getRecent(size, offset);

    console.debug(
      `ChatManager: Retrieved ${messages.length} messages for ticket ${this.ticketId}`
    );

    return messages;
  }

  /**
   * Marks messages as read
   * @param messageIds - Array of message IDs to mark as read
   */
  async markAsRead(messageIds: string[]): Promise<void> {
    if (!messageIds || messageIds.length === 0) {
      return;
    }

    await this.chatStore.markAsRead(messageIds);

    console.debug(
      `ChatManager: Marked ${messageIds.length} messages as read for ticket ${this.ticketId}`
    );
  }

  /**
   * Gets the total count of messages in the chat
   * @returns Number of messages
   */
  async getMessageCount(): Promise<number> {
    return await this.chatStore.getCount();
  }

  /**
   * Reloads chat messages from storage
   * Used to sync with changes made in other tabs
   */
  reload(): void {
    this.chatStore.reload();
    console.debug(`ChatManager: Reloaded messages for ticket ${this.ticketId}`);
  }

  /**
   * Gets the ticket ID associated with this chat
   * @returns The ticket ID
   */
  getTicketId(): string {
    return this.ticketId;
  }

  /**
   * Gets the sender profile
   * @returns The sender UserProfile
   */
  getSender(): UserProfile {
    return this.sender;
  }

  /**
   * Gets the receiver profile
   * @returns The receiver UserProfile
   */
  getReceiver(): UserProfile {
    return this.receiver;
  }

  /**
   * Marks the sender as typing
   * This will emit a cross-tab event to notify other tabs that the user is typing
   */
  markIsTyping(): void {
    this.chatStore.markIsTyping(this.sender);
    console.debug(
      `ChatManager: ${this.sender.name} is typing for ticket ${this.ticketId}`
    );
  }

  /**
   * Stops listening for changes and cleans up resources
   * Should be called when the manager is no longer needed
   */
  destroy(): void {
    this.changes.stop();
    console.debug('ChangeManager: Stopped listening for changes');
  }
}