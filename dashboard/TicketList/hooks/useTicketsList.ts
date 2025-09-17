import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { type Ticket, type TicketStatus, type TicketListItem, type CustomerProfile } from '@common/types';
import { useTicketListManager } from '@dashboard/TicketList/contexts/TicketListManagerContext';
import { useTicketManager } from '@dashboard/Ticket/contexts/TicketManagerContext';
import { useTicketListener } from '@common/features/TicketManager/hooks/useTicketListener';

export interface UseTicketsListReturn {
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  refreshTickets: () => void;
  createTestTicket: () => void;
}

export const useTicketsList = (filterStatuses: TicketStatus[]): UseTicketsListReturn => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const { ticketStore } = useTicketManager();
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

  // Create a mock customer profile for creating test tickets
  const mockCustomer: CustomerProfile = useMemo(() => ({
    id: 'CUST-DEBUG-001',
    name: 'Debug Customer',
    type: 'customer',
    email: 'debug@test.com'
  }), []);

  // TicketListManager is now provided by context

  const refreshTickets = useCallback(async () => {
    const currentFilterStatuses = memoizedFilterStatusesRef.current;
    console.info('useTicketsList: refreshTickets called for filterStatuses:', currentFilterStatuses);
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
    console.info('useTicketsList: Initial load useEffect triggered for:', memoizedFilterStatuses);
    refreshTickets();
  }, [refreshTickets]);

  // Create stable callback functions to prevent TicketListener recreation
  const handleTicketCreated = useCallback((ticket: Ticket) => {
    console.info('useTicketsList: New ticket created, refreshing list:', ticket.id);
    // Reload from storage to sync with other tabs, then refresh
    ticketListManagerRef.current.reload();
    // Only refresh if the new ticket matches our filter
    if (memoizedFilterStatusesRef.current.includes(ticket.status)) {
      refreshTickets();
    }
  }, []);

  const handleTicketUpdated = useCallback((ticket: Ticket) => {
    console.info('useTicketsList: Ticket updated, refreshing list:', ticket.id);
    // Reload from storage to sync with other tabs, then refresh
    ticketListManagerRef.current.reload();
    refreshTickets();
  }, []);

  const handleTicketsCleared = useCallback(() => {
    console.info('useTicketsList: All tickets cleared, refreshing list');
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

  const createTestTicket = () => {
    const timestamp = Date.now();
    const testTicket: Ticket = {
      id: `TKT-TEST-${timestamp}`,
      status: 'waiting',
      summary: `Test issue #${timestamp}`,
      estimatedTime: '5-10 min',
      problemDescription: `Test issue #${timestamp}: This is a sample ticket created for testing purposes. The user is experiencing a sample problem that needs engineer attention.`,
      createdBy: mockCustomer,
      createdAt: new Date(),
      elapsedTime: Math.floor(Math.random() * 300) // Random elapsed time for variety
    };

    // Add the test ticket to the shared TicketStore instance
    ticketStore.create(testTicket);
    console.info('Created test ticket:', testTicket);

    // Directly refresh the current tab since storage events only work cross-tab
    refreshTickets();
  };

  return {
    tickets,
    setTickets,
    refreshTickets,
    createTestTicket
  };
};