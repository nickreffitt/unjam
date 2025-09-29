import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { type Ticket, type TicketStatus, type TicketListItem } from '@common/types';
import { useTicketListManager } from '@dashboard/engineer/TicketList/contexts/TicketListManagerContext';

export interface UseTicketListStateReturn {
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  refreshTickets: () => void;
}

export const useTicketListState = (filterStatuses: TicketStatus[]): UseTicketListStateReturn => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const { ticketListManager, newTicketList } = useTicketListManager();

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
        // Use newTicketList from context for waiting tickets (real-time updated)
        ticketListItems = newTicketList;
      } else if (currentFilterStatuses.includes('in-progress') && manager) {
        // Use TicketListManager for active tickets
        ticketListItems = await manager.listActiveTickets();
      } else if (currentFilterStatuses.some(status => ['completed', 'auto-completed'].includes(status)) && manager) {
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
  }, [newTicketList]);

  useEffect(() => {
    console.debug('useTicketsList: Initial load useEffect triggered for:', memoizedFilterStatuses);
    refreshTickets();
  }, [refreshTickets]);

  // For new tickets ('waiting' status), automatically update when newTicketList changes
  useEffect(() => {
    if (memoizedFilterStatuses.includes('waiting')) {
      console.debug('useTicketsList: newTicketList changed, updating tickets');
      const fetchedTickets = newTicketList.map((item: TicketListItem) => item.ticket);
      setTickets(fetchedTickets);
    }
  }, [newTicketList, memoizedFilterStatuses]);

  return {
    tickets,
    setTickets,
    refreshTickets
  };
};