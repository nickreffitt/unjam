import { type Ticket, type TicketEventType } from '@common/types';
import { type TicketListener, type TicketListenerCallbacks } from './TicketListener';

/**
 * Local storage implementation of ticket listener
 * Uses window events and localStorage for cross-tab communication
 */
export class TicketListenerLocal implements TicketListener {
  private callbacks: Partial<TicketListenerCallbacks>;
  private isListening: boolean = false;
  private handleStorageEvent: ((event: StorageEvent) => void) | null = null;
  private handleWindowEvent: ((event: CustomEvent) => void) | null = null;

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
   * Starts listening to both storage events (cross-tab) and window events (same-tab)
   */
  startListening(): void {
    if (this.isListening || typeof window === 'undefined') return;

    // Listen for storage events (cross-tab communication)
    this.handleStorageEvent = (event: StorageEvent) => {
      // Only process events for our specific key
      if (event.key !== 'ticketstore-event' || !event.newValue) return;

      try {
        const eventData = JSON.parse(event.newValue);
        this.processEventData(eventData);
      } catch (error) {
        console.error('TicketListenerLocal: Error parsing storage event data:', error);
      }
    };

    // Listen for window events (same-tab communication)
    this.handleWindowEvent = (event: CustomEvent) => {
      try {
        this.processEventData(event.detail);
      } catch (error) {
        console.error('TicketListenerLocal: Error processing window event data:', error);
      }
    };

    window.addEventListener('storage', this.handleStorageEvent);
    window.addEventListener('ticket-event', this.handleWindowEvent as EventListener);
    this.isListening = true;

    console.debug('TicketListenerLocal: Started listening to global ticket events via storage and window events');
  }

  /**
   * Processes event data from either storage or window events
   */
  private processEventData(eventData: any): void {
    try {
        if (!eventData || typeof eventData !== 'object') {
          console.warn('TicketListenerLocal: Invalid event data received:', eventData);
          return;
        }

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
                console.error('TicketListenerLocal: Error in onTicketCreated:', error);
              }
            }
            break;
          case 'ticketUpdated':
            if (this.callbacks.onTicketUpdated && deserializedTicket) {
              try {
                this.callbacks.onTicketUpdated(deserializedTicket);
              } catch (error) {
                console.error('TicketListenerLocal: Error in onTicketUpdated:', error);
              }
            }
            break;
          case 'ticketDeleted':
            if (this.callbacks.onTicketDeleted && ticketId) {
              try {
                this.callbacks.onTicketDeleted(ticketId);
              } catch (error) {
                console.error('TicketListenerLocal: Error in onTicketDeleted:', error);
              }
            }
            break;
          case 'ticketsCleared':
            if (this.callbacks.onTicketsCleared) {
              try {
                this.callbacks.onTicketsCleared();
              } catch (error) {
                console.error('TicketListenerLocal: Error in onTicketsCleared:', error);
              }
            }
            break;
          case 'ticketsLoaded':
            if (this.callbacks.onTicketsLoaded && deserializedTickets) {
              try {
                this.callbacks.onTicketsLoaded(deserializedTickets);
              } catch (error) {
                console.error('TicketListenerLocal: Error in onTicketsLoaded:', error);
              }
            }
            break;
        }
    } catch (error) {
      console.error('TicketListenerLocal: Error processing event data:', error);
    }
  }

  /**
   * Stops listening to both storage and window events
   */
  stopListening(): void {
    if (!this.isListening) return;

    if (this.handleStorageEvent) {
      window.removeEventListener('storage', this.handleStorageEvent);
      this.handleStorageEvent = null;
    }

    if (this.handleWindowEvent) {
      window.removeEventListener('ticket-event', this.handleWindowEvent as EventListener);
      this.handleWindowEvent = null;
    }

    this.isListening = false;
    console.debug('TicketListenerLocal: Stopped listening to global ticket events');
  }

  /**
   * Returns whether the listener is currently active
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}