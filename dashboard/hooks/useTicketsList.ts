import { useState, useEffect } from 'react';
import { Ticket, TicketStatus } from '@common/types';
import { mockTickets } from '@common/mockData';

export interface UseTicketsListReturn {
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  refreshTickets: () => void;
}

export const useTicketsList = (filterStatuses: TicketStatus[]): UseTicketsListReturn => {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const refreshTickets = () => {
    const filteredTickets = mockTickets.filter(ticket => 
      filterStatuses.includes(ticket.status)
    );
    setTickets(filteredTickets);
  };

  useEffect(() => {
    refreshTickets();
  }, []);

  return {
    tickets,
    setTickets,
    refreshTickets
  };
};