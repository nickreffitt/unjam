import { type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { type TicketEventEmitter } from '../events/TicketEventEmitter';
import { TicketSupabaseRowMapper } from '../util/TicketSupabaseRowMapper';
import { type TicketChanges } from './TicketChanges';

/**
 * Supabase implementation for listening to ticket changes
 * Uses two separate channels:
 * - ticket-new: For new unclaimed tickets and claim events (INSERT and waiting->in-progress)
 * - ticket-changes-{ticketId}: For updates to specific claimed tickets (only creator and assignee)
 */
export class TicketChangesSupabase implements TicketChanges {
  private supabaseClient: SupabaseClient;
  private eventEmitter: TicketEventEmitter;
  private profileId?: string;
  private newTicketsChannel: RealtimeChannel | null = null;
  private ticketChannels: Map<string, RealtimeChannel> = new Map();
  private readonly tableName: string = 'tickets';

  constructor(
    supabaseClient: SupabaseClient,
    eventEmitter: TicketEventEmitter,
  ) {
    if (!supabaseClient) {
      throw new Error('TicketChangesSupabase: supabaseClient is required');
    }
    if (!eventEmitter) {
      throw new Error('TicketChangesSupabase: eventEmitter is required');
    }

    this.supabaseClient = supabaseClient;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Starts listening for ticket changes
   * Sets up two channel subscriptions:
   * 1. ticket-new: For new tickets and claim events
   * 2. ticket-changes-{ticketId}: For updates to specific tickets user is involved with
   * @param profileId - The profile ID of the logged-in user to filter updates
   */
  async start(profileId: string): Promise<void> {
    console.debug(`TicketChangesSupabase: start(${profileId}) Call stack:`, new Error().stack);
    if (!profileId) {
      throw new Error('TicketChangesSupabase: profileId is required');
    }
    this.profileId = profileId;

    if (this.newTicketsChannel) {
      console.debug('TicketChangesSupabase: Already listening for changes');
      return;
    }

    console.debug(`TicketChangesSupabase: Starting ticket changes listener for user ${this.profileId}`);

    // Set auth for realtime authorization
    const session = await this.supabaseClient.auth.getSession();
    await this.supabaseClient.realtime.setAuth(session.data.session?.access_token ?? null);

    // Subscribe to new tickets channel (for INSERT and claim events)
    this.newTicketsChannel = this.supabaseClient
      .channel('ticket-new', {
        config: { private: true },
      })
      .on('broadcast', { event: 'INSERT' }, (payload) => {
        console.debug('TicketChangesSupabase: New ticket created:', payload);
        this.handleTicketInsert(payload.payload.record);
      })
      .on('broadcast', { event: 'UPDATE' }, (payload) => {
        console.debug('TicketChangesSupabase: Ticket claimed:', payload);
        const newRecord = payload.payload.record;
        const oldRecord = payload.payload.old_record;
        this.handleTicketClaimed(newRecord, oldRecord);
      })
      .subscribe((status, error) => {
        console.debug('TicketChangesSupabase: New tickets channel status:', status, ' error:', error);
      });

    // Fetch all tickets user is involved with and subscribe to their individual channels
    await this.subscribeToUserTickets();
  }

  /**
   * Stops listening for ticket changes
   * Unsubscribes from all Realtime channels
   */
  stop(): void {
    console.debug('TicketChangesSupabase: Stopping ticket changes listener');

    if (this.newTicketsChannel) {
      this.supabaseClient.removeChannel(this.newTicketsChannel);
      this.newTicketsChannel = null;
    }

    for (const channel of this.ticketChannels.values()) {
      this.supabaseClient.removeChannel(channel);
    }
    this.ticketChannels.clear();
  }

  /**
   * Subscribes to individual ticket channels for all tickets the user is involved with
   * (either as creator or assignee)
   */
  private async subscribeToUserTickets(): Promise<void> {
    if (!this.profileId) {
      return;
    }

    try {
      // Fetch all tickets where user is creator or assignee
      const { data: tickets, error } = await this.supabaseClient
        .from(this.tableName)
        .select('id, created_by, assigned_to')
        .or(`created_by.eq.${this.profileId},assigned_to.eq.${this.profileId}`);

      if (error) {
        console.error('TicketChangesSupabase: Error fetching user tickets:', error);
        return;
      }

      if (!tickets) {
        return;
      }

      // Subscribe to each ticket's individual channel
      for (const ticket of tickets) {
        this.subscribeToTicket(ticket.id);
      }
    } catch (error) {
      console.error('TicketChangesSupabase: Error subscribing to user tickets:', error);
    }
  }

  /**
   * Subscribes to a specific ticket's update channel
   * @param ticketId - The ID of the ticket to subscribe to
   */
  subscribeToTicket(ticketId: string): void {
    if (this.ticketChannels.has(ticketId)) {
      console.debug(`TicketChangesSupabase: Already subscribed to ticket ${ticketId}`);
      return;
    }

    const channelName = `ticket-changes-${ticketId}`;
    console.debug(`TicketChangesSupabase: Subscribing to channel ${channelName}`);

    const channel = this.supabaseClient
      .channel(channelName, {
        config: { private: true },
      })
      .on('broadcast', { event: 'UPDATE' }, (payload) => {
        console.debug(`TicketChangesSupabase: Ticket ${ticketId} updated:`, payload);
        const newRecord = payload.payload.record;
        const oldRecord = payload.payload.old_record;
        this.handleTicketUpdate(newRecord, oldRecord);
      })
      .subscribe((status, error) => {
        console.debug(`TicketChangesSupabase: Ticket ${ticketId} channel status:`, status, ' error:', error);
      });

    this.ticketChannels.set(ticketId, channel);
  }

  /**
   * Unsubscribes from a specific ticket's update channel
   * @param ticketId - The ID of the ticket to unsubscribe from
   */
  unsubscribeFromTicket(ticketId: string): void {
    const channel = this.ticketChannels.get(ticketId);
    if (channel) {
      console.debug(`TicketChangesSupabase: Unsubscribing from ticket ${ticketId}`);
      this.supabaseClient.removeChannel(channel);
      this.ticketChannels.delete(ticketId);
    }
  }

  /**
   * Handles ticket insert events
   * Maps the database row to a Ticket and emits the appropriate event
   * If user is the creator, subscribes to the ticket's update channel
   */
  private async handleTicketInsert(row: Record<string, unknown>): Promise<void> {
    try {
      // Fetch the complete ticket with joined profile data
      // Use inner join for created_by (required) and left join for assigned_to (optional)
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select(`
          *,
          created_by:profiles!tickets_created_by_fkey(*),
          assigned_to:profiles!tickets_assigned_to_fkey(*)
        `)
        .eq('id', row.id)
        .single();

      if (error) {
        console.error('TicketChangesSupabase: Error fetching inserted ticket:', error);
        return;
      }

      const ticket = TicketSupabaseRowMapper.mapRowToTicket(data);

      // If user is the creator, subscribe to this ticket's update channel
      if (ticket.createdBy.id === this.profileId) {
        this.subscribeToTicket(ticket.id);
      }

      this.eventEmitter.emitTicketCreated(ticket);
    } catch (error) {
      console.error('TicketChangesSupabase: Error handling ticket insert:', error);
    }
  }

  /**
   * Handles ticket update events
   * Maps the database row to a Ticket and emits the appropriate event
   */
  private async handleTicketUpdate(row: Record<string, unknown>, oldRow?: Record<string, unknown>): Promise<void> {
    try {
      // Fetch the complete ticket with joined profile data
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select(`
          *,
          created_by:profiles!tickets_created_by_fkey(*),
          assigned_to:profiles!tickets_assigned_to_fkey(*)
        `)
        .eq('id', row.id)
        .single();

      if (error) {
        console.error('TicketChangesSupabase: Error fetching updated ticket:', error);
        return;
      }

      const ticket = TicketSupabaseRowMapper.mapRowToTicket(data);
      this.eventEmitter.emitTicketUpdated(ticket);
    } catch (error) {
      console.error('TicketChangesSupabase: Error handling ticket update:', error);
    }
  }

  /**
   * Handles ticket claimed events
   * Checks if status changed from 'waiting' to 'in-progress' and emits the appropriate event
   * If user is the assignee, subscribes to the ticket's update channel
   */
  private async handleTicketClaimed(row: Record<string, unknown>, oldRow?: Record<string, unknown>): Promise<void> {
    try {
      // Check if this is actually a claim (waiting -> in-progress)
      const oldStatus = oldRow?.status as string;
      const newStatus = row.status as string;

      if (oldStatus !== 'waiting' || newStatus !== 'in-progress') {
        console.debug('TicketChangesSupabase: Status change is not a claim event, ignoring');
        return;
      }

      // Fetch the complete ticket with joined profile data
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select(`
          *,
          created_by:profiles!tickets_created_by_fkey(*),
          assigned_to:profiles!tickets_assigned_to_fkey(*)
        `)
        .eq('id', row.id)
        .single();

      if (error) {
        console.error('TicketChangesSupabase: Error fetching claimed ticket:', error);
        return;
      }

      const ticket = TicketSupabaseRowMapper.mapRowToTicket(data);

      // If user is the creator or assignee, subscribe to this ticket's update channel
      if (ticket.createdBy.id === this.profileId || ticket.assignedTo?.id === this.profileId) {
        this.subscribeToTicket(ticket.id);
      }

      console.debug('TicketChangesSupabase: Emitting ticketClaimed event for ticket:', ticket.id);
      this.eventEmitter.emitTicketClaimed(ticket);
    } catch (error) {
      console.error('TicketChangesSupabase: Error handling ticket claimed:', error);
    }
  }
}
