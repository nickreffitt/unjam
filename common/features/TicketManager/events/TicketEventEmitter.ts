import { type Ticket } from '@common/types';

/**
 * Interface for ticket event emission implementations
 * Defines the contract that all ticket event emitter implementations must follow
 */
export interface TicketEventEmitter {
  /**
   * Emits a ticket created event
   * @param ticket - The created ticket
   */
  emitTicketCreated(ticket: Ticket): void;

  /**
   * Emits a ticket updated event
   * @param ticket - The updated ticket
   */
  emitTicketUpdated(ticket: Ticket): void;

  /**
   * Emits a ticket deleted event
   * @param ticketId - The ID of the deleted ticket
   */
  emitTicketDeleted(ticketId: string): void;

  /**
   * Emits a tickets cleared event
   */
  emitTicketsCleared(): void;
}