import { useEffect, useCallback, useRef } from 'react';
import { type Ticket } from '@common/types';
import { useTicketListener } from '@common/features/TicketManager/hooks/useTicketListener';
import { useTicketListManager } from '@dashboard/TicketList/contexts/TicketListManagerContext';

/**
 * Global ticket listener that syncs ticket updates across the entire dashboard
 * This ensures ticket lists stay up-to-date regardless of which page the user is viewing
 */
export const useGlobalTicketListener = () => {
  const { ticketListManager } = useTicketListManager();
  const ticketListManagerRef = useRef(ticketListManager);

  // Keep ref current
  ticketListManagerRef.current = ticketListManager;

  // Handler for when a new ticket is created
  const handleTicketCreated = useCallback((ticket: Ticket) => {
    console.debug('[GlobalTicketListener] New ticket created:', ticket.id);
    // Reload from storage to sync with other tabs/windows
    ticketListManagerRef.current.reload();
    // Emit a custom event that components can listen to
    window.dispatchEvent(new CustomEvent('globalTicketCreated', { detail: ticket }));
  }, []);

  // Handler for when a ticket is updated
  const handleTicketUpdated = useCallback((ticket: Ticket) => {
    console.debug('[GlobalTicketListener] Ticket updated:', ticket.id, 'Status:', ticket.status);
    // Reload from storage to sync with other tabs/windows
    ticketListManagerRef.current.reload();
    // Emit a custom event that components can listen to
    window.dispatchEvent(new CustomEvent('globalTicketUpdated', { detail: ticket }));
  }, []);

  // Handler for when all tickets are cleared
  const handleTicketsCleared = useCallback(() => {
    console.debug('[GlobalTicketListener] All tickets cleared');
    // Reload from storage to sync with other tabs/windows
    ticketListManagerRef.current.reload();
    // Emit a custom event that components can listen to
    window.dispatchEvent(new CustomEvent('globalTicketsCleared'));
  }, []);

  // Set up the global ticket listener
  useTicketListener({
    onTicketCreated: handleTicketCreated,
    onTicketUpdated: handleTicketUpdated,
    onTicketsCleared: handleTicketsCleared
  });

  // Log when the global listener is active
  useEffect(() => {
    console.debug('[GlobalTicketListener] Global ticket listener initialized');
    return () => {
      console.debug('[GlobalTicketListener] Global ticket listener cleanup');
    };
  }, []);
};