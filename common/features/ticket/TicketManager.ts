import {
  type Ticket,
  type UserProfile
} from '../../types';
import { isCustomerProfile, isEngineerProfile } from '../../util';
import { type TicketStore } from '../../data';

export class TicketManager {
  private userProfile: UserProfile;
  private ticketStore: TicketStore;

  constructor(userProfile: UserProfile, ticketStore: TicketStore) {
    this.userProfile = userProfile;
    this.ticketStore = ticketStore;
  }

  /**
   * Creates a new ticket (customer only)
   * @param problemDescription - Description of the problem from the customer
   * @returns The created Ticket object
   * @throws Error if user is not a customer
   */
  async createTicket(problemDescription: string): Promise<Ticket> {
    if (!isCustomerProfile(this.userProfile)) {
      throw new Error('Only customers can create tickets');
    }

    // Now TypeScript knows this.userProfile is CustomerProfile
    const customerProfile = this.userProfile;

    // Create new ticket using the store
    const newTicket: Ticket = {
      id: `TKT-${Date.now()}`,
      status: 'waiting',
      summary: problemDescription.substring(0, 50) + (problemDescription.length > 50 ? '...' : ''),
      estimatedTime: '5-10 min',
      problemDescription,
      createdBy: customerProfile,
      createdAt: new Date(),
      elapsedTime: 0
    };

    return this.ticketStore.create(newTicket);
  }

  /**
   * Claims a ticket for an engineer
   * @param ticketId - The ID of the ticket to claim
   * @returns The updated ticket with assignment
   * @throws Error if user is not an engineer, ticket not found, or ticket is already assigned
   */
  async claimTicket(ticketId: string): Promise<Ticket> {
    if (!isEngineerProfile(this.userProfile)) {
      throw new Error('Only engineers can claim tickets');
    }

    // Get the ticket from the store
    const ticket = this.ticketStore.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    if (ticket.assignedTo) {
      throw new Error('This ticket is already assigned to an engineer');
    }

    // Now TypeScript knows this.userProfile is EngineerProfile
    const engineerProfile = this.userProfile;

    // Update the ticket with assignment
    const updatedTicket: Ticket = {
      ...ticket,
      status: 'in-progress',
      assignedTo: engineerProfile,
      claimedAt: new Date()
    };

    return this.ticketStore.update(ticketId, updatedTicket);
  }

  /**
   * Marks a ticket as fixed by the engineer (awaiting customer confirmation)
   * @param ticketId - The ID of the ticket to mark as fixed
   * @returns The updated ticket
   * @throws Error if user is not the assigned engineer or ticket not found
   */
  async markAsFixed(ticketId: string): Promise<Ticket> {
    if (!isEngineerProfile(this.userProfile)) {
      throw new Error('Only engineers can mark tickets as fixed');
    }

    // Get the ticket from the store
    const ticket = this.ticketStore.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    // Verify the engineer is assigned to this ticket
    const engineerProfile = this.userProfile;
    if (!ticket.assignedTo || ticket.assignedTo.id !== engineerProfile.id) {
      throw new Error('You can only mark tickets assigned to you as fixed');
    }

    // Calculate auto-complete timeout
    const timeoutMinutes = Number((import.meta as any).env?.VITE_AUTO_COMPLETE_TIMEOUT_MINUTES) || 30;
    const now = new Date();
    const autoCompleteTimeoutAt = new Date(now.getTime() + (timeoutMinutes * 60 * 1000));

    console.info('TicketManager: markAsFixed - timeoutMinutes:', timeoutMinutes, 'now:', now, 'autoCompleteTimeoutAt:', autoCompleteTimeoutAt);

    // Update the ticket to awaiting confirmation status
    const updatedTicket: Ticket = {
      ...ticket,
      status: 'awaiting-confirmation',
      markedAsFixedAt: new Date(),
      autoCompleteTimeoutAt,
    };

    return this.ticketStore.update(ticketId, updatedTicket);
  }

  /**
   * Marks a ticket as resolved (customer confirmation or auto-complete)
   * @param ticketId - The ID of the ticket to mark as resolved
   * @returns The updated ticket
   * @throws Error if ticket not found
   */
  async markAsResolved(ticketId: string): Promise<Ticket> {
    // Get the ticket from the store
    const ticket = this.ticketStore.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    // Update the ticket to completed status
    const updatedTicket: Ticket = {
      ...ticket,
      status: 'completed',
      resolvedAt: new Date(),
    };

    return this.ticketStore.update(ticketId, updatedTicket);
  }

  /**
   * Auto-completes a ticket after timeout
   * @param ticketId - The ID of the ticket to auto-complete
   * @returns The updated ticket
   * @throws Error if ticket not found
   */
  async autoCompleteTicket(ticketId: string): Promise<Ticket> {
    // Get the ticket from the store
    const ticket = this.ticketStore.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    // Only auto-complete tickets that are awaiting confirmation
    if (ticket.status !== 'awaiting-confirmation') {
      console.info(`Ticket ${ticketId} is no longer awaiting confirmation, skipping auto-complete`);
      return ticket;
    }

    // Update the ticket to auto-completed status
    const updatedTicket: Ticket = {
      ...ticket,
      status: 'auto-completed',
      resolvedAt: new Date(),
    };

    console.info(`Auto-completing ticket ${ticketId} after timeout`);
    return this.ticketStore.update(ticketId, updatedTicket);
  }



}