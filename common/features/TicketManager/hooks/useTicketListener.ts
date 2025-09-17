import { useEffect, useRef } from 'react';
import { TicketListener, type TicketListenerCallbacks } from '@common/features/TicketManager/events';

/**
 * Hook that listens to global ticket events via window events
 * This hook uses the TicketListener class to manage window event subscriptions
 *
 * @param callbacks - Partial listener implementation with only the events you care about
 *
 * @example
 * ```tsx
 * useTicketListener({
 *   onTicketCreated: (ticket) => {
 *     console.log('New ticket created:', ticket);
 *     refetchTickets();
 *   },
 *   onTicketUpdated: (ticket) => {
 *     console.log('Ticket updated:', ticket);
 *     refetchTickets();
 *   }
 * });
 * ```
 */
export function useTicketListener(callbacks: Partial<TicketListenerCallbacks>): void {
  // Create a TicketListener instance and keep it stable across re-renders
  const ticketListenerRef = useRef<TicketListener | null>(null);

  useEffect(() => {
    // Create the listener on first render
    if (!ticketListenerRef.current) {
      ticketListenerRef.current = new TicketListener(callbacks);
      ticketListenerRef.current.startListening();
    } else {
      // Update callbacks on subsequent renders
      ticketListenerRef.current.updateCallbacks(callbacks);
    }

    // Cleanup on unmount
    return () => {
      if (ticketListenerRef.current) {
        ticketListenerRef.current.stopListening();
        ticketListenerRef.current = null;
      }
    };
  }, [callbacks]);
}