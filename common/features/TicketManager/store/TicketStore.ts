import { type Ticket, type TicketStatus, type EngineerProfile } from '@common/types';

/**
 * Interface for ticket storage implementations
 * Defines the contract that all ticket store implementations must follow
 */
export interface TicketStore {
  /**
   * Creates a new ticket
   * @param ticket - The ticket to create
   * @returns The created ticket with any modifications (like generated ID)
   */
  create(ticket: Ticket): Promise<Ticket>;

  /**
   * Gets all tickets by status with pagination
   * @param ticketStatuses - The status(es) to filter by (single status or array)
   * @param size - Number of tickets to return (page size)
   * @param offset - Number of tickets to skip (for pagination)
   * @returns Array of tickets matching the status(es)
   */
  getAllByStatus(ticketStatuses: TicketStatus | TicketStatus[], size: number, offset?: number): Promise<Ticket[]>;

  /**
   * Gets a single ticket by ID
   * @param ticketId - The ID of the ticket to retrieve
   * @returns The ticket if found, null otherwise
   */
  get(ticketId: string): Promise<Ticket | null>;

  /**
   * Updates an existing ticket
   * @param ticketId - The ID of the ticket to update
   * @param updatedTicket - The updated ticket data
   * @returns The updated ticket
   * @throws Error if ticket is not found
   */
  update(ticketId: string, updatedTicket: Ticket): Promise<Ticket>;

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
    offset?: number
  ): Promise<Ticket[]>;

  /**
   * Gets the total count of tickets with a specific status
   * Useful for pagination to know total pages
   * @param ticketStatus - The status to count
   * @returns Number of tickets with that status
   */
  getCountByStatus(ticketStatus: TicketStatus): Promise<number>;

  /**
   * Gets the active ticket for a specific customer
   * An active ticket is one that is not completed or auto-completed
   * @param customerId - The ID of the customer to find an active ticket for
   * @returns The active ticket if found, null otherwise
   */
  getActiveTicketByCustomer(customerId: string): Promise<Ticket | null>;

  /**
   * Gets all tickets (mainly for testing purposes)
   * @returns All tickets in the store
   */
  getAll(): Promise<Ticket[]>;

  /**
   * Reloads tickets from storage
   * Used when we need to sync with changes made by other tabs/sources
   */
  reload(): void;

  /**
   * Clears all tickets (mainly for testing purposes)
   */
  clear(): Promise<void>;
}