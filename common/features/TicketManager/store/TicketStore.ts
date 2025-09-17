import { type Ticket, type TicketStatus, type EngineerProfile } from '@common/types';
import { TicketEventEmitter } from '@common/features/TicketManager/events';

export class TicketStore {
  private tickets: Ticket[] = [];
  private readonly storageKey: string = 'ticketStore-tickets';
  private readonly eventEmitter: TicketEventEmitter;

  constructor() {
    this.eventEmitter = new TicketEventEmitter();
    this.loadTicketsFromStorage();
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
    this.saveTicketsToStorage();

    console.info('TicketStore: Created ticket', newTicket.id);

    // Emit event for ticket creation
    this.eventEmitter.emitTicketCreated(newTicket);

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
    this.saveTicketsToStorage();

    console.info('TicketStore: Updated ticket', ticketId);

    // Emit event for ticket update
    this.eventEmitter.emitTicketUpdated(ticketToUpdate);

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
   * Gets the active ticket for a specific customer
   * An active ticket is one that is not completed or auto-completed
   * @param customerId - The ID of the customer to find an active ticket for
   * @returns The active ticket if found, null otherwise
   */
  getActiveTicketByCustomer(customerId: string): Ticket | null {
    const activeStatuses: TicketStatus[] = ['waiting', 'in-progress', 'awaiting-confirmation', 'marked-resolved'];

    const activeTicket = this.tickets.find(ticket =>
      ticket.createdBy.id === customerId &&
      activeStatuses.includes(ticket.status)
    );

    if (activeTicket) {
      console.info('TicketStore: Found active ticket for customer', customerId, activeTicket.id);
      return { ...activeTicket }; // Return a copy to prevent external mutations
    } else {
      console.info('TicketStore: No active ticket found for customer', customerId);
      return null;
    }
  }

  /**
   * Gets all tickets (mainly for testing purposes)
   * @returns All tickets in the store
   */
  getAll(): Ticket[] {
    return [...this.tickets];
  }

  /**
   * Reloads tickets from localStorage
   * Used when we need to sync with changes made by other tabs
   */
  reload(): void {
    this.loadTicketsFromStorage();
  }

  /**
   * Loads tickets from localStorage
   * If no data exists, initializes with mock data
   */
  private loadTicketsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsedTickets = JSON.parse(stored);
        // Convert date strings back to Date objects
        this.tickets = parsedTickets.map((ticket: Ticket) => ({
          ...ticket,
          createdAt: ticket.createdAt ? new Date(ticket.createdAt) : undefined,
          claimedAt: ticket.claimedAt ? new Date(ticket.claimedAt) : undefined,
          resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt) : undefined,
          abandonedAt: ticket.abandonedAt ? new Date(ticket.abandonedAt) : undefined,
        }));
        console.info('TicketStore: Loaded tickets from localStorage');
      } else {
        // Initialize with mock data if no stored data exists
        this.tickets = [];
        this.saveTicketsToStorage();
        console.info('TicketStore: Initialized with mock data and saved to localStorage');
      }
    } catch (error) {
      console.error('TicketStore: Error loading tickets from localStorage', error);
      this.tickets = [];
    }
  }

  /**
   * Saves tickets to localStorage
   */
  private saveTicketsToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.tickets));
      console.info('TicketStore: Saved tickets to localStorage');
    } catch (error) {
      console.error('TicketStore: Error saving tickets to localStorage:', error);
    }
  }


  /**
   * Clears all tickets (mainly for testing purposes)
   */
  clear(): void {
    this.tickets = [];
    this.saveTicketsToStorage();
    console.info('TicketStore: Cleared all tickets');

    // Emit event for clearing tickets
    this.eventEmitter.emitTicketsCleared();
  }
}