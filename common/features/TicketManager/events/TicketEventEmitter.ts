import { type Ticket, type TicketEventType } from '@common/types';

/**
 * Event emitter for ticket-related events
 * Abstracts the underlying event mechanism to allow for future technology changes
 */
export class TicketEventEmitter {
  constructor() {
    // No need for local listeners - everything goes through window events
  }

  /**
   * Emits a ticket created event
   * @param ticket - The created ticket
   */
  emitTicketCreated(ticket: Ticket): void {
    this.emitWindowEvent('ticketCreated', { ticket });
  }

  /**
   * Emits a ticket updated event
   * @param ticket - The updated ticket
   */
  emitTicketUpdated(ticket: Ticket): void {
    this.emitWindowEvent('ticketUpdated', { ticket });
  }

  /**
   * Emits a ticket deleted event
   * @param ticketId - The ID of the deleted ticket
   */
  emitTicketDeleted(ticketId: string): void {
    this.emitWindowEvent('ticketDeleted', { ticketId });
  }

  /**
   * Emits a tickets cleared event
   */
  emitTicketsCleared(): void {
    this.emitWindowEvent('ticketsCleared', {});
  }

  /**
   * Emits a storage event for cross-tab communication only
   */
  private emitWindowEvent(type: TicketEventType, data: Record<string, unknown>): void {
    if (typeof window === 'undefined') return; // Skip in non-browser environments

    const eventPayload = {
      type,
      ...data,
      timestamp: Date.now()
    };

    // Use a temporary localStorage key to trigger storage events across tabs
    const eventKey = 'ticketstore-event';
    localStorage.setItem(eventKey, JSON.stringify(eventPayload));

    // Clean up immediately to avoid cluttering localStorage
    localStorage.removeItem(eventKey);

    console.info('TicketEventEmitter: Emitting storage event:', type, data);
  }

}