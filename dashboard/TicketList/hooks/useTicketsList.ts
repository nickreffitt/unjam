import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { type Ticket, type TicketStatus, type TicketListItem, type CustomerProfile } from '@common/types';
import { useTicketListManager } from '@dashboard/TicketList/contexts/TicketListManagerContext';
import { useTicketManager } from '@dashboard/Ticket/contexts/TicketManagerContext';

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

  // Use a ref to store the ticketListManager to avoid useCallback recreation
  const ticketListManagerRef = useRef(ticketListManager);
  ticketListManagerRef.current = ticketListManager;

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
    console.info('useTicketsList: refreshTickets called for filterStatuses:', memoizedFilterStatuses);
    try {
      let ticketListItems: TicketListItem[] = [];
      const manager = ticketListManagerRef.current;

      if (memoizedFilterStatuses.includes('waiting')) {
        // Use TicketListManager for waiting tickets (new tickets)
        ticketListItems = await manager.listNewTickets();
      } else if (memoizedFilterStatuses.includes('in-progress')) {
        // Use TicketListManager for active tickets
        ticketListItems = await manager.listActiveTickets();
      } else if (memoizedFilterStatuses.some(status => ['completed', 'auto-completed'].includes(status))) {
        // Use TicketListManager for completed tickets
        ticketListItems = await manager.listCompletedTickets();
      }

      // Extract tickets from TicketListItems for UI compatibility
      const fetchedTickets = ticketListItems.map((item: TicketListItem) => item.ticket);
      setTickets(fetchedTickets);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      setTickets([]);
    }
  }, [memoizedFilterStatuses]);

  useEffect(() => {
    console.info('useTicketsList: Initial load useEffect triggered for:', memoizedFilterStatuses);
    refreshTickets();
  }, [refreshTickets]);

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

    // Refresh the tickets list to show the new ticket
    refreshTickets();
  };

  return {
    tickets,
    setTickets,
    refreshTickets,
    createTestTicket
  };
};