import type {
  TicketStatus,
  TicketListItem,
  UserProfile
} from '@common/types';
import { isEngineerProfile } from '@common/util';
import { type TicketStore } from '@common/features/TicketManager/store';

export class TicketListManager {
  private userProfile: UserProfile;
  private ticketStore: TicketStore;

  constructor(userProfile: UserProfile, ticketStore: TicketStore) {
    this.userProfile = userProfile;
    this.ticketStore = ticketStore;
  }

  /**
   * Lists new or abandoned tickets for engineers
   * @param size - Maximum number of tickets to return (default 50)
   * @param offset - Number of tickets to skip for pagination (default 0)
   * @returns Array of TicketListItem objects for display in the New Tickets table
   * @throws Error if user is not an engineer
   */
  async listNewTickets(size: number = 50, offset: number = 0): Promise<TicketListItem[]> {
    if (!isEngineerProfile(this.userProfile)) {
      throw new Error('Only engineers can list new tickets');
    }

    // Get waiting tickets from the store (includes abandoned tickets)
    const waitingTickets = this.ticketStore.getAllByStatus('waiting', size, offset);

    // Convert to TicketListItem format
    const ticketListItems: TicketListItem[] = waitingTickets.map(ticket => ({
      ticket,
      summary: ticket.summary,
      status: ticket.status,
      time: this.formatElapsedTime(ticket.elapsedTime),
      actions: ['claim', 'view']
    }));

    console.debug('Listing new tickets:', ticketListItems.length);
    return ticketListItems;
  }

  /**
   * Lists active tickets assigned to this engineer
   * @param size - Maximum number of tickets to return (default 50)
   * @param offset - Number of tickets to skip for pagination (default 0)
   * @returns Array of TicketListItem objects for display in the Active Tickets table
   * @throws Error if user is not an engineer
   */
  async listActiveTickets(size: number = 50, offset: number = 0): Promise<TicketListItem[]> {
    if (!isEngineerProfile(this.userProfile)) {
      throw new Error('Only engineers can list active tickets');
    }

    // Now TypeScript knows this.userProfile is EngineerProfile
    const engineerProfile = this.userProfile;
    const ticketStatuses: TicketStatus[] = ['in-progress', 'awaiting-confirmation', 'marked-resolved'];

    // Get tickets with all active statuses assigned to this engineer directly from the store
    const myActiveTickets = this.ticketStore.getAllEngineerTicketsByStatus(
      engineerProfile,
      ticketStatuses,
      size,
      offset
    );

    // Convert to TicketListItem format
    const ticketListItems: TicketListItem[] = myActiveTickets.map(ticket => ({
      ticket,
      summary: ticket.summary,
      status: ticket.status,
      time: this.formatElapsedTime(ticket.elapsedTime),
      actions: ['view', 'message']
    }));

    console.debug('Listing active tickets:', ticketListItems.length);
    return ticketListItems;
  }

  /**
   * Lists completed tickets assigned to this engineer
   * @param size - Maximum number of tickets to return (default 50)
   * @param offset - Number of tickets to skip for pagination (default 0)
   * @returns Array of TicketListItem objects for display in the Completed Tickets table
   * @throws Error if user is not an engineer
   */
  async listCompletedTickets(size: number = 50, offset: number = 0): Promise<TicketListItem[]> {
    if (!isEngineerProfile(this.userProfile)) {
      throw new Error('Only engineers can list completed tickets');
    }

    // Now TypeScript knows this.userProfile is EngineerProfile
    const engineerProfile = this.userProfile;
    const ticketStatuses: TicketStatus[] = ['completed', 'auto-completed'];

    // Get completed and auto-completed tickets assigned to this engineer from the store
    const allCompletedTickets = this.ticketStore.getAllEngineerTicketsByStatus(
      engineerProfile,
      ticketStatuses,
      size * 2, // Get more to ensure we have enough after sorting and pagination
      0
    );

    // Sort by completion date (most recent first)
    allCompletedTickets.sort((a, b) => {
      const aTime = a.resolvedAt || a.createdAt;
      const bTime = b.resolvedAt || b.createdAt;
      return bTime.getTime() - aTime.getTime();
    });

    // Apply pagination after sorting
    const paginatedTickets = allCompletedTickets.slice(offset, offset + size);

    // Convert to TicketListItem format
    const ticketListItems: TicketListItem[] = paginatedTickets.map(ticket => ({
      ticket,
      summary: ticket.summary,
      status: ticket.status,
      time: this.formatElapsedTime(ticket.elapsedTime),
      actions: ['view']
    }));

    console.debug('Listing completed tickets:', ticketListItems.length);
    return ticketListItems;
  }

  /**
   * Reloads ticket data from storage to sync with other tabs
   */
  reload(): void {
    this.ticketStore.reload();
  }

  /**
   * Helper method to format elapsed time
   */
  private formatElapsedTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}