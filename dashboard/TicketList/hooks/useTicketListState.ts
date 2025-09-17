import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { type Ticket, type TicketStatus, type TicketListItem } from '@common/types';
import { useTicketListManager } from '@dashboard/TicketList/contexts/TicketListManagerContext';
import { useTicketListener } from '@common/features/TicketManager/hooks/useTicketListener';

export interface UseTicketListStateReturn {
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  refreshTickets: () => void;
}

export const useTicketListState = (filterStatuses: TicketStatus[]): UseTicketListStateReturn => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const { ticketListManager } = useTicketListManager();

  // Use refs to store values to avoid useCallback recreation cycles
  const ticketListManagerRef = useRef(ticketListManager);
  const memoizedFilterStatusesRef = useRef(filterStatuses);
  const setTicketsRef = useRef(setTickets);

  // Update refs on every render to keep them current
  ticketListManagerRef.current = ticketListManager;
  memoizedFilterStatusesRef.current = filterStatuses;
  setTicketsRef.current = setTickets;

  // Memoize filterStatuses to prevent unnecessary re-renders based on array contents
  const memoizedFilterStatuses = useMemo(() => filterStatuses, [filterStatuses.join(',')]);

  // TicketListManager is now provided by context

  const refreshTickets = useCallback(async () => {
    const currentFilterStatuses = memoizedFilterStatusesRef.current;
    console.debug('useTicketsList: refreshTickets called for filterStatuses:', currentFilterStatuses);
    try {
      let ticketListItems: TicketListItem[] = [];
      const manager = ticketListManagerRef.current;

      if (currentFilterStatuses.includes('waiting')) {
        // Use TicketListManager for waiting tickets (new tickets)
        ticketListItems = await manager.listNewTickets();
      } else if (currentFilterStatuses.includes('in-progress')) {
        // Use TicketListManager for active tickets
        ticketListItems = await manager.listActiveTickets();
      } else if (currentFilterStatuses.some(status => ['completed', 'auto-completed'].includes(status))) {
        // Use TicketListManager for completed tickets
        ticketListItems = await manager.listCompletedTickets();
      }

      // Extract tickets from TicketListItems for UI compatibility
      const fetchedTickets = ticketListItems.map((item: TicketListItem) => item.ticket);
      setTicketsRef.current(fetchedTickets);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      setTicketsRef.current([]);
    }
  }, []);

  useEffect(() => {
    console.debug('useTicketsList: Initial load useEffect triggered for:', memoizedFilterStatuses);
    refreshTickets();
  }, [refreshTickets]);

  // Create stable callback functions to prevent TicketListener recreation
  const handleTicketCreated = useCallback((ticket: Ticket) => {
    console.debug('useTicketsList: New ticket created, refreshing list:', ticket.id);
    // Reload from storage to sync with other tabs, then refresh
    ticketListManagerRef.current.reload();
    // Only refresh if the new ticket matches our filter
    if (memoizedFilterStatusesRef.current.includes(ticket.status)) {
      refreshTickets();
    }
  }, []);

  const handleTicketUpdated = useCallback((ticket: Ticket) => {
    console.debug('useTicketsList: Ticket updated, refreshing list:', ticket.id);
    // Reload from storage to sync with other tabs, then refresh
    ticketListManagerRef.current.reload();
    refreshTickets();
  }, []);

  const handleTicketsCleared = useCallback(() => {
    console.debug('useTicketsList: All tickets cleared, refreshing list');
    // Reload from storage to sync with other tabs, then refresh
    ticketListManagerRef.current.reload();
    refreshTickets();
  }, []);

  // Listen for global ticket events and refresh when tickets change
  useTicketListener({
    onTicketCreated: handleTicketCreated,
    onTicketUpdated: handleTicketUpdated,
    onTicketsCleared: handleTicketsCleared
  });

  return {
    tickets,
    setTickets,
    refreshTickets
  };
};