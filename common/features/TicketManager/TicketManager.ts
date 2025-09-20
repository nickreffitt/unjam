import {
  type Ticket,
  type UserProfile
} from '@common/types';
import { isCustomerProfile, isEngineerProfile } from '@common/util';
import { type TicketStore } from '@common/features/TicketManager/store';

const AUTO_COMPLETE_TIMEOUT_MINUTES = 30;

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
   * @throws Error if user is not an engineer, ticket not found, ticket is already assigned, or engineer has reached ticket limit
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

    // Check if engineer has reached the maximum ticket limit (3 active tickets)
    const activeTickets = this.ticketStore.getAllByStatus(['in-progress', 'awaiting-confirmation'], 100)
      .filter(t => t.assignedTo?.id === engineerProfile.id);

    if (activeTickets.length >= 3) {
      throw new Error('You must complete your active tickets before claiming more. Maximum 3 active tickets allowed.');
    }

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
    const timeoutMinutes = AUTO_COMPLETE_TIMEOUT_MINUTES;
    const now = new Date();
    const autoCompleteTimeoutAt = new Date(now.getTime() + (timeoutMinutes * 60 * 1000));

    console.debug('TicketManager: markAsFixed - timeoutMinutes:', timeoutMinutes, 'now:', now, 'autoCompleteTimeoutAt:', autoCompleteTimeoutAt);

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
   * Marks a ticket as still broken (customer indicates fix didn't work)
   * Returns ticket to in-progress status while maintaining engineer assignment
   * @param ticketId - The ID of the ticket to mark as still broken
   * @returns The updated ticket
   * @throws Error if user is not a customer or ticket not found
   */
  async markStillBroken(ticketId: string): Promise<Ticket> {
    if (!isCustomerProfile(this.userProfile)) {
      throw new Error('Only customers can mark tickets as still broken');
    }

    // Get the ticket from the store
    const ticket = this.ticketStore.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    // Verify this is the customer's ticket
    const customerProfile = this.userProfile;
    if (ticket.createdBy.id !== customerProfile.id) {
      throw new Error('You can only mark your own tickets as still broken');
    }

    // Update the ticket back to in-progress, keeping the engineer assignment and claimedAt
    const updatedTicket: Ticket = {
      ...ticket,
      status: 'in-progress',
      markedAsFixedAt: undefined,
      autoCompleteTimeoutAt: undefined,
    };

    console.debug(`Customer ${customerProfile.name} marked ticket ${ticketId} as still broken`);
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
      console.debug(`Ticket ${ticketId} is no longer awaiting confirmation, skipping auto-complete`);
      return ticket;
    }

    // Update the ticket to auto-completed status
    const updatedTicket: Ticket = {
      ...ticket,
      status: 'auto-completed',
      resolvedAt: new Date(),
    };

    console.debug(`Auto-completing ticket ${ticketId} after timeout`);
    return this.ticketStore.update(ticketId, updatedTicket);
  }

  /**
   * Abandons a ticket, returning it to the waiting queue
   * @param ticketId - The ID of the ticket to abandon
   * @returns The updated ticket
   * @throws Error if user is not the assigned engineer or ticket not found
   */
  async abandonTicket(ticketId: string): Promise<Ticket> {
    if (!isEngineerProfile(this.userProfile)) {
      throw new Error('Only engineers can abandon tickets');
    }

    // Get the ticket from the store
    const ticket = this.ticketStore.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    // Verify the engineer is assigned to this ticket
    const engineerProfile = this.userProfile;
    if (!ticket.assignedTo || ticket.assignedTo.id !== engineerProfile.id) {
      throw new Error('You can only abandon tickets assigned to you');
    }

    // Reset the ticket to waiting status, removing assignment
    const updatedTicket: Ticket = {
      ...ticket,
      status: 'waiting',
      assignedTo: undefined,
      claimedAt: undefined,
      markedAsFixedAt: undefined,
      autoCompleteTimeoutAt: undefined,
    };

    console.debug(`Engineer ${engineerProfile.name} abandoned ticket ${ticketId}`);
    return this.ticketStore.update(ticketId, updatedTicket);
  }

  /**
   * Gets the active ticket for this customer (if any)
   * An active ticket is one that is not yet completed/resolved
   * @returns The active ticket or null if no active ticket exists
   * @throws Error if user is not a customer
   */
  getActiveTicket(): Ticket | null {
    if (!isCustomerProfile(this.userProfile)) {
      throw new Error('Only customers can check for active tickets');
    }

    // Now TypeScript knows this.userProfile is CustomerProfile
    const customerProfile = this.userProfile;
    return this.ticketStore.getActiveTicketByCustomer(customerProfile.id);
  }

  /**
   * Reloads ticket data from storage to sync with other tabs
   */
  reload(): void {
    this.ticketStore.reload();
  }
}