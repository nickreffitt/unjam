import { type Ticket, type TicketStatus, type EngineerProfile } from '../types';
import { mockTickets } from './mockData';

export class TicketStore {
  private tickets: Ticket[] = [];

  constructor() {
    // Initialize with existing mock data
    this.tickets = [...mockTickets];
  }

  /**
   * Creates a new ticket
   * @param ticket - The ticket to create
   * @returns The created ticket with any modifications (like generated ID)
   */
  create(ticket: Ticket): Ticket {
    const newTicket = { ...ticket };

    // Add to the beginning of the array (most recent first)
    this.tickets.unshift(newTicket);

    console.info('TicketStore: Created ticket', newTicket.id);
    return newTicket;
  }

  /**
   * Gets all tickets by status with pagination
   * @param ticketStatuses - The status(es) to filter by (single status or array)
   * @param size - Number of tickets to return (page size)
   * @param offset - Number of tickets to skip (for pagination)
   * @returns Array of tickets matching the status(es)
   */
  getAllByStatus(ticketStatuses: TicketStatus | TicketStatus[], size: number, offset: number = 0): Ticket[] {
    const statusArray = Array.isArray(ticketStatuses) ? ticketStatuses : [ticketStatuses];
    const filteredTickets = this.tickets.filter(ticket => statusArray.includes(ticket.status));

    const paginatedTickets = filteredTickets.slice(offset, offset + size);

    console.info(`TicketStore: Found ${paginatedTickets.length} tickets with status '${statusArray.join(', ')}' (${offset}-${offset + size - 1} of ${filteredTickets.length})`);
    return paginatedTickets;
  }

  /**
   * Gets a single ticket by ID
   * @param ticketId - The ID of the ticket to retrieve
   * @returns The ticket if found, null otherwise
   */
  get(ticketId: string): Ticket | null {
    const ticket = this.tickets.find(t => t.id === ticketId);

    if (ticket) {
      console.info('TicketStore: Found ticket', ticketId);
      return { ...ticket }; // Return a copy to prevent external mutations
    } else {
      console.info('TicketStore: Ticket not found', ticketId);
      return null;
    }
  }

  /**
   * Updates an existing ticket
   * @param ticketId - The ID of the ticket to update
   * @param updatedTicket - The updated ticket data
   * @returns The updated ticket
   * @throws Error if ticket is not found
   */
  update(ticketId: string, updatedTicket: Ticket): Ticket {
    const ticketIndex = this.tickets.findIndex(t => t.id === ticketId);

    if (ticketIndex === -1) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    // Ensure the ID matches
    const ticketToUpdate = { ...updatedTicket, id: ticketId };

    // Replace the ticket at the found index
    this.tickets[ticketIndex] = ticketToUpdate;

    console.info('TicketStore: Updated ticket', ticketId);
    return { ...ticketToUpdate };
  }

  /**
   * Gets tickets assigned to a specific engineer with specific status(es)
   * This method provides efficient filtering at the data layer
   * @param engineerProfile - The engineer to filter by
   * @param ticketStatuses - The status(es) to filter by (single status or array)
   * @param size - Number of tickets to return (page size)
   * @param offset - Number of tickets to skip (for pagination)
   * @returns Array of tickets assigned to the engineer with the specified status(es)
   */
  getAllEngineerTicketsByStatus(
    engineerProfile: EngineerProfile,
    ticketStatuses: TicketStatus | TicketStatus[],
    size: number,
    offset: number = 0
  ): Ticket[] {
    const statusArray = Array.isArray(ticketStatuses) ? ticketStatuses : [ticketStatuses];
    const filteredTickets = this.tickets.filter(ticket =>
      statusArray.includes(ticket.status) &&
      ticket.assignedTo &&
      ticket.assignedTo.id === engineerProfile.id
    );

    const paginatedTickets = filteredTickets.slice(offset, offset + size);

    console.info(`TicketStore: Found ${paginatedTickets.length} tickets with status '${statusArray.join(', ')}' for engineer '${engineerProfile.name}' (${offset}-${offset + size - 1} of ${filteredTickets.length})`);
    return paginatedTickets;
  }

  /**
   * Gets the total count of tickets with a specific status
   * Useful for pagination to know total pages
   * @param ticketStatus - The status to count
   * @returns Number of tickets with that status
   */
  getCountByStatus(ticketStatus: TicketStatus): number {
    return this.tickets.filter(ticket => ticket.status === ticketStatus).length;
  }

  /**
   * Gets all tickets (mainly for testing purposes)
   * @returns All tickets in the store
   */
  getAll(): Ticket[] {
    return [...this.tickets];
  }

  /**
   * Clears all tickets (mainly for testing purposes)
   */
  clear(): void {
    this.tickets = [];
    console.info('TicketStore: Cleared all tickets');
  }
}