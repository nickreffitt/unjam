import { type ChatMessage, type UserProfile } from '@common/types';

export interface ChatStore {
  /**
   * Creates a new chat message
   * @param message - The message to create
   * @returns The created message
   */
  create(message: ChatMessage): Promise<ChatMessage>;

  /**
   * Gets recent messages in ascending order (oldest to newest)
   * @param size - Number of messages to return
   * @param offset - Number of messages to skip (for pagination)
   * @returns Array of messages in ascending chronological order
   */
  getRecent(size: number, offset?: number): Promise<ChatMessage[]>;

  /**
   * Gets all messages for the ticket (mainly for testing purposes)
   * @returns All messages in chronological order
   */
  getAll(): Promise<ChatMessage[]>;

  /**
   * Gets the total count of messages for this ticket
   * @returns Number of messages
   */
  getCount(): Promise<number>;

  /**
   * Marks messages as read
   * @param messageIds - Array of message IDs to mark as read
   */
  markAsRead(messageIds: string[]): Promise<void>;

  /**
   * Reloads messages from storage
   * Used when we need to sync with changes made by other tabs
   */
  reload(): void;

  /**
   * Marks a user as typing
   * @param user - The user who is typing
   */
  markIsTyping(user: UserProfile): void;

  /**
   * Clears all messages (mainly for testing purposes)
   */
  clear(): Promise<void>;
}