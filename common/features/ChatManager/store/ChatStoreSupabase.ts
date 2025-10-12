import { type SupabaseClient } from '@supabase/supabase-js';
import { type ChatMessage, type UserProfile } from '@common/types';
import { type ChatStore } from './ChatStore';
import { type ChatEventEmitter } from '@common/features/ChatManager/events';
import { ChatMessageSupabaseRowMapper } from '../util/ChatMessageSupabaseRowMapper';

/**
 * Supabase implementation of the chat store
 * Uses Supabase PostgreSQL database for persistence with row-level security
 * Emits events for create and update operations for local same-tab event handling
 */
export class ChatStoreSupabase implements ChatStore {
  private supabaseClient: SupabaseClient;
  private eventEmitter: ChatEventEmitter;
  private readonly ticketId: string;
  private readonly tableName: string = 'messages';

  constructor(ticketId: string, supabaseClient: SupabaseClient, eventEmitter: ChatEventEmitter) {
    if (!ticketId) {
      throw new Error('ChatStoreSupabase: ticketId is required');
    }
    if (!supabaseClient) {
      throw new Error('ChatStoreSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('ChatStoreSupabase: eventEmitter is required');
    }
    this.ticketId = ticketId;
    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
    console.debug('ChatStoreSupabase: Initialized for ticket', ticketId);
  }

  /**
   * Creates a new chat message
   * @param message - The message to create
   * @returns The created message
   */
  async create(message: ChatMessage): Promise<ChatMessage> {
    // Validate required fields
    if (!message.content || message.content.trim().length === 0) {
      throw new Error('content is required for message creation');
    }
    if (!message.sender?.id) {
      throw new Error('sender profile ID is required for message creation');
    }
    if (!message.receiver?.id) {
      throw new Error('receiver profile ID is required for message creation');
    }
    if (message.ticketId !== this.ticketId) {
      throw new Error(`Message ticket ID (${message.ticketId}) does not match store ticket ID (${this.ticketId})`);
    }

    console.debug('ChatStoreSupabase: Creating message for ticket', this.ticketId);

    const messageRow = ChatMessageSupabaseRowMapper.mapMessageToRow(message);

    // Omit the ID field to let the database generate its own UUID
    const { id, ...messageRowWithoutId } = messageRow;

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .insert([messageRowWithoutId])
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*),
        receiver:profiles!messages_receiver_id_fkey(*)
      `)
      .single();

    if (error) {
      console.error('ChatStoreSupabase: Create failed:', error);
      throw new Error(`Failed to create message: ${error.message}`);
    }

    const createdMessage = ChatMessageSupabaseRowMapper.mapRowToMessage(data);
    console.debug('ChatStoreSupabase: Created message successfully:', createdMessage.id);

    // Emit event for message creation (for same-tab listeners)
    this.eventEmitter.emitChatMessageSent(createdMessage);

    return createdMessage;
  }

  /**
   * Gets recent messages in ascending order (oldest to newest)
   * @param size - Number of messages to return
   * @param offset - Number of messages to skip (for pagination)
   * @returns Array of messages in ascending chronological order
   */
  async getRecent(size: number, offset: number = 0): Promise<ChatMessage[]> {
    console.debug(
      `ChatStoreSupabase: Getting recent messages for ticket ${this.ticketId}, size: ${size}, offset: ${offset}`
    );

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*),
        receiver:profiles!messages_receiver_id_fkey(*)
      `)
      .eq('ticket_id', this.ticketId)
      .range(offset, offset + size - 1)
      .order('created_at', { ascending: true }); // Oldest to newest

    if (error) {
      console.error('ChatStoreSupabase: Get recent failed:', error);
      throw new Error(`Failed to get recent messages: ${error.message}`);
    }

    const messages = data.map(row => ChatMessageSupabaseRowMapper.mapRowToMessage(row));
    console.debug(`ChatStoreSupabase: Retrieved ${messages.length} messages`);
    return messages;
  }

  /**
   * Gets all messages for the ticket (mainly for testing purposes)
   * @returns All messages in chronological order
   */
  async getAll(): Promise<ChatMessage[]> {
    console.debug('ChatStoreSupabase: Getting all messages for ticket', this.ticketId);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*),
        receiver:profiles!messages_receiver_id_fkey(*)
      `)
      .eq('ticket_id', this.ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('ChatStoreSupabase: Get all failed:', error);
      throw new Error(`Failed to get all messages: ${error.message}`);
    }

    const messages = data.map(row => ChatMessageSupabaseRowMapper.mapRowToMessage(row));
    console.debug(`ChatStoreSupabase: Retrieved ${messages.length} messages`);
    return messages;
  }

  /**
   * Gets the total count of messages for this ticket
   * @returns Number of messages
   */
  async getCount(): Promise<number> {
    console.debug('ChatStoreSupabase: Getting message count for ticket', this.ticketId);

    const { count, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('ticket_id', this.ticketId);

    if (error) {
      console.error('ChatStoreSupabase: Get count failed:', error);
      throw new Error(`Failed to get message count: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Marks messages as read
   * @param messageIds - Array of message IDs to mark as read
   */
  async markAsRead(messageIds: string[]): Promise<void> {
    if (!messageIds || messageIds.length === 0) {
      return;
    }

    console.debug('ChatStoreSupabase: Marking messages as read', messageIds);

    const { error } = await this.supabaseClient
      .from(this.tableName)
      .update({ is_read: true })
      .in('id', messageIds)
      .eq('ticket_id', this.ticketId); // Additional safety check

    if (error) {
      console.error('ChatStoreSupabase: Mark as read failed:', error);
      throw new Error(`Failed to mark messages as read: ${error.message}`);
    }

    console.debug('ChatStoreSupabase: Marked messages as read successfully');

    // Emit event for messages read (for same-tab listeners)
    this.eventEmitter.emitChatMessagesRead(messageIds, this.ticketId);
  }

  /**
   * Reloads messages from storage
   * Used when we need to sync with changes made by other tabs
   * Note: For Supabase implementation, this emits a reload event
   * but doesn't actually reload data since it's always fresh
   */
  reload(): void {
    console.debug('ChatStoreSupabase: Reload called for ticket', this.ticketId);
    // No-op for Supabase since data is always fresh from the database
  }

  /**
   * Marks a user as typing
   * @param user - The user who is typing
   */
  markIsTyping(user: UserProfile): void {
    console.debug(`ChatStoreSupabase: User ${user.name} is typing for ticket ${this.ticketId}`);

    // Emit event for sender typing (for same-tab listeners)
    this.eventEmitter.emitChatSenderIsTyping(this.ticketId, user);
  }

  /**
   * Clears all messages (mainly for testing purposes)
   * WARNING: This will delete all messages for this ticket from the database
   */
  async clear(): Promise<void> {
    console.warn('ChatStoreSupabase: Clearing all messages for ticket', this.ticketId);

    const { error } = await this.supabaseClient
      .from(this.tableName)
      .delete()
      .eq('ticket_id', this.ticketId);

    if (error) {
      console.error('ChatStoreSupabase: Clear failed:', error);
      throw new Error(`Failed to clear messages: ${error.message}`);
    }

    console.debug('ChatStoreSupabase: Cleared all messages for ticket', this.ticketId);
  }
}
