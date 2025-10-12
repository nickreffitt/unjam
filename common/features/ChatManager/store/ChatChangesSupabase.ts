import { type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { type ChatEventEmitter } from '../events/ChatEventEmitter';
import { ChatMessageSupabaseRowMapper } from '../util/ChatMessageSupabaseRowMapper';
import { type ChatChanges } from './ChatChanges';

/**
 * Supabase implementation for listening to chat message changes
 * Uses a single channel per ticket:
 * - chat-{ticketId}: For all message events (INSERT and UPDATE) for a specific ticket
 */
export class ChatChangesSupabase implements ChatChanges {
  private supabaseClient: SupabaseClient;
  private eventEmitter: ChatEventEmitter;
  private ticketId?: string;
  private chatChannel: RealtimeChannel | null = null;
  private readonly tableName: string = 'messages';

  constructor(
    ticketId: string,
    supabaseClient: SupabaseClient,
    eventEmitter: ChatEventEmitter,
  ) {
    if (!ticketId) {
      throw new Error('ChatChangesSupabase: ticketId is required');
    }
    if (!supabaseClient) {
      throw new Error('ChatChangesSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('ChatChangesSupabase: eventEmitter is required');
    }
    this.ticketId = ticketId;
    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Starts listening for message changes for a specific ticket
   * Sets up a broadcast channel subscription for the ticket
   * @param ticketId - The ticket ID to listen for messages
   */
  async start(): Promise<void> {
    console.debug(`ChatChangesSupabase: start()`);

    if (this.chatChannel) {
      console.debug('ChatChangesSupabase: Already listening for changes');
      return;
    }

    console.debug(`ChatChangesSupabase: Starting message changes listener for ticket ${this.ticketId}`);

    // Set auth for realtime authorization
    const session = await this.supabaseClient.auth.getSession();
    await this.supabaseClient.realtime.setAuth(session.data.session?.access_token ?? null);

    // Subscribe to chat channel (for INSERT and UPDATE events)
    const channelName = `chat-${this.ticketId}`;
    this.chatChannel = this.supabaseClient
      .channel(channelName, {
        config: { private: true },
      })
      .on('broadcast', { event: 'INSERT' }, (payload) => {
        console.debug('ChatChangesSupabase: New message created:', payload);
        this.handleMessageInsert(payload.payload.record);
      })
      .on('broadcast', { event: 'UPDATE' }, (payload) => {
        console.debug('ChatChangesSupabase: Message updated:', payload);
        const newRecord = payload.payload.record;
        const oldRecord = payload.payload.old_record;
        this.handleMessageUpdate(newRecord, oldRecord);
      })
      .subscribe((status, error) => {
        console.debug('ChatChangesSupabase: Chat channel status:', status, ' error:', error);
      });
  }

  /**
   * Stops listening for message changes
   * Unsubscribes from the Realtime channel
   */
  stop(): void {
    console.debug('ChatChangesSupabase: Stopping message changes listener');

    if (this.chatChannel) {
      this.supabaseClient.removeChannel(this.chatChannel);
      this.chatChannel = null;
    }
  }

  /**
   * Handles message insert events
   * Maps the database row to a ChatMessage and emits the appropriate event
   */
  private async handleMessageInsert(row: Record<string, unknown>): Promise<void> {
    try {
      // Fetch the complete message with joined profile data
      // Use inner joins for both sender and receiver (both required)
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(*),
          receiver:profiles!messages_receiver_id_fkey(*)
        `)
        .eq('id', row.id)
        .single();

      if (error) {
        console.error('ChatChangesSupabase: Error fetching inserted message:', error);
        return;
      }

      const message = ChatMessageSupabaseRowMapper.mapRowToMessage(data);
      this.eventEmitter.emitChatMessageSent(message);
    } catch (error) {
      console.error('ChatChangesSupabase: Error handling message insert:', error);
    }
  }

  /**
   * Handles message update events
   * Maps the database row to a ChatMessage and emits the appropriate event
   */
  private async handleMessageUpdate(row: Record<string, unknown>, oldRow?: Record<string, unknown>): Promise<void> {
    try {
      // Check if this is a read status update
      const oldIsRead = oldRow?.is_read as boolean;
      const newIsRead = row.is_read as boolean;

      if (!oldIsRead && newIsRead) {
        // This is a read status update
        const messageId = row.id as string;
        if (this.ticketId) {
          this.eventEmitter.emitChatMessagesRead([messageId], this.ticketId);
        }
      }
    } catch (error) {
      console.error('ChatChangesSupabase: Error handling message update:', error);
    }
  }
}
