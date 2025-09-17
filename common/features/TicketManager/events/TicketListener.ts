import { type Ticket, type TicketEventType } from '@common/types';

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
 * Class that manages listening to global ticket events via storage events
 * Handles the setup and teardown of storage event listeners for cross-tab communication
 */
export class TicketListener {
  private callbacks: Partial<TicketListenerCallbacks>;
  private isListening: boolean = false;
  private handleStorageEvent: ((event: StorageEvent) => void) | null = null;

  constructor(callbacks: Partial<TicketListenerCallbacks>) {
    this.callbacks = callbacks;
  }

  /**
   * Updates the callbacks (useful for React hooks that need to update callbacks)
   */
  updateCallbacks(callbacks: Partial<TicketListenerCallbacks>): void {
    this.callbacks = callbacks;
  }

  /**
   * Starts listening to storage events for cross-tab communication
   */
  startListening(): void {
    if (this.isListening || typeof window === 'undefined') return;

    this.handleStorageEvent = (event: StorageEvent) => {
      // Only process events for our specific key
      if (event.key !== 'ticketstore-event' || !event.newValue) return;

      try {
        const eventData = JSON.parse(event.newValue);
        const { type, ticket, ticketId, tickets } = eventData;

        // Deserialize Date objects if ticket is present
        let deserializedTicket = ticket;
        if (ticket) {
          deserializedTicket = {
            ...ticket,
            createdAt: ticket.createdAt ? new Date(ticket.createdAt) : undefined,
            claimedAt: ticket.claimedAt ? new Date(ticket.claimedAt) : undefined,
            resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt) : undefined,
            abandonedAt: ticket.abandonedAt ? new Date(ticket.abandonedAt) : undefined,
            markedAsFixedAt: ticket.markedAsFixedAt ? new Date(ticket.markedAsFixedAt) : undefined,
            autoCompleteTimeoutAt: ticket.autoCompleteTimeoutAt ? new Date(ticket.autoCompleteTimeoutAt) : undefined,
          };
        }

        // Deserialize Date objects if tickets array is present
        let deserializedTickets = tickets;
        if (tickets && Array.isArray(tickets)) {
          deserializedTickets = tickets.map((t: any) => ({
            ...t,
            createdAt: t.createdAt ? new Date(t.createdAt) : undefined,
            claimedAt: t.claimedAt ? new Date(t.claimedAt) : undefined,
            resolvedAt: t.resolvedAt ? new Date(t.resolvedAt) : undefined,
            abandonedAt: t.abandonedAt ? new Date(t.abandonedAt) : undefined,
            markedAsFixedAt: t.markedAsFixedAt ? new Date(t.markedAsFixedAt) : undefined,
            autoCompleteTimeoutAt: t.autoCompleteTimeoutAt ? new Date(t.autoCompleteTimeoutAt) : undefined,
          }));
        }

        switch (type as TicketEventType) {
          case 'ticketCreated':
            if (this.callbacks.onTicketCreated && deserializedTicket) {
              try {
                this.callbacks.onTicketCreated(deserializedTicket);
              } catch (error) {
                console.error('TicketListener: Error in onTicketCreated:', error);
              }
            }
            break;
          case 'ticketUpdated':
            if (this.callbacks.onTicketUpdated && deserializedTicket) {
              try {
                this.callbacks.onTicketUpdated(deserializedTicket);
              } catch (error) {
                console.error('TicketListener: Error in onTicketUpdated:', error);
              }
            }
            break;
          case 'ticketDeleted':
            if (this.callbacks.onTicketDeleted && ticketId) {
              try {
                this.callbacks.onTicketDeleted(ticketId);
              } catch (error) {
                console.error('TicketListener: Error in onTicketDeleted:', error);
              }
            }
            break;
          case 'ticketsCleared':
            if (this.callbacks.onTicketsCleared) {
              try {
                this.callbacks.onTicketsCleared();
              } catch (error) {
                console.error('TicketListener: Error in onTicketsCleared:', error);
              }
            }
            break;
          case 'ticketsLoaded':
            if (this.callbacks.onTicketsLoaded && deserializedTickets) {
              try {
                this.callbacks.onTicketsLoaded(deserializedTickets);
              } catch (error) {
                console.error('TicketListener: Error in onTicketsLoaded:', error);
              }
            }
            break;
        }
      } catch (error) {
        console.error('TicketListener: Error parsing storage event data:', error);
      }
    };

    window.addEventListener('storage', this.handleStorageEvent);
    this.isListening = true;
    console.info('TicketListener: Started listening to global ticket events via storage');
  }

  /**
   * Stops listening to storage events
   */
  stopListening(): void {
    if (!this.isListening || !this.handleStorageEvent) return;

    window.removeEventListener('storage', this.handleStorageEvent);
    this.handleStorageEvent = null;
    this.isListening = false;
    console.info('TicketListener: Stopped listening to global ticket events');
  }

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}