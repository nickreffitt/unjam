import { useEffect, useRef } from 'react';
import { type TicketListener, TicketListenerLocal, type TicketListenerCallbacks } from '@common/features/TicketManager/events';

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

  // Update callbacks when they change, but don't restart the listener
  useEffect(() => {
    if (ticketListenerRef.current) {
      ticketListenerRef.current.updateCallbacks(callbacks);
    }
  }, [callbacks]);

  // Initialize and cleanup listener (only on mount/unmount)
  useEffect(() => {
    // Create and start the listener on mount
    ticketListenerRef.current = new TicketListenerLocal(callbacks);
    ticketListenerRef.current.startListening();

    // Cleanup on unmount
    return () => {
      if (ticketListenerRef.current) {
        ticketListenerRef.current.stopListening();
        ticketListenerRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount
}