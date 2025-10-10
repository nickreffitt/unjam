import { type Ticket } from '@common/types';

/**
 * Interface for objects that listen to ticket store events
 * All methods are optional to allow listeners to subscribe to only the events they care about
 */
export interface TicketListenerCallbacks {
  /**
   * Called when a new ticket is created
   * @param ticket - The newly created ticket
   */
  onTicketCreated?(ticket: Ticket): void;

  /**
   * Called when a ticket is updated
   * @param ticket - The updated ticket
   */
  onTicketUpdated?(ticket: Ticket): void;

  /**
   * Called when a ticket is claimed by an engineer
   * @param ticket - The claimed ticket with engineer assignment
   */
  onTicketClaimed?(ticket: Ticket): void;

  /**
   * Called when a ticket is deleted
   * @param ticketId - The ID of the deleted ticket
   */
  onTicketDeleted?(ticketId: string): void;

  /**
   * Called when tickets are cleared (mainly for testing)
   */
  onTicketsCleared?(): void;

  /**
   * Called when tickets are loaded from storage
   * @param tickets - All loaded tickets
   */
  onTicketsLoaded?(tickets: Ticket[]): void;
}

/**
 * Interface for ticket listener implementations
 * Defines the contract that all ticket listener implementations must follow
 */
export interface TicketListener {
  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<TicketListenerCallbacks>): void;

  /**
   * Starts listening to ticket events for cross-tab/cross-client communication
   */
  startListening(): void;

  /**
   * Stops listening to ticket events
   */
  stopListening(): void;

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean;
}