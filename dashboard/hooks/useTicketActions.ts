import { useNavigate } from 'react-router-dom';
import { Ticket } from '@common/types';
import { AUTO_COMPLETE_TIMEOUT_MINUTES } from '@common/mockData';

export interface UseTicketActionsReturn {
  handleClaimTicket: (ticket: Ticket) => void;
  handleMarkAsFixed: (ticket: Ticket, setTicket: (ticket: Ticket) => void, setTimeoutRemaining: (time: number) => void) => void;
  handleAbandonTask: (ticketId: string) => void;
  simulateCustomerConfirmation: (ticket: Ticket, setTicket: (ticket: Ticket) => void, setTimeoutRemaining: (time: number) => void) => void;
}

export const useTicketActions = (): UseTicketActionsReturn => {
  const navigate = useNavigate();

  const handleClaimTicket = (ticket: Ticket) => {
    console.log('Claiming ticket:', ticket.id);
    // Simulate claiming the ticket by updating its status
    const claimedTicket = {
      ...ticket,
      status: 'in-progress' as const,
      claimedAt: new Date(),
      engineerName: 'John',
      elapsedTime: 0
    };
    // Navigate to the active ticket view
    navigate(`/active/${ticket.id}`);
  };

  const handleMarkAsFixed = (
    ticket: Ticket, 
    setTicket: (ticket: Ticket) => void, 
    setTimeoutRemaining: (time: number) => void
  ) => {
    console.log('Marking ticket as fixed:', ticket.id);
    // Simulate updating ticket status to 'marked-resolved'
    const updatedTicket = {
      ...ticket,
      status: 'marked-resolved' as const,
      resolvedAt: new Date()
    };
    setTicket(updatedTicket);
    
    // Start the auto-complete countdown (convert minutes to seconds)
    setTimeoutRemaining(AUTO_COMPLETE_TIMEOUT_MINUTES * 60);
  };

  const handleAbandonTask = (ticketId: string) => {
    if (window.confirm('Are you sure you want to abandon this ticket? It will be returned to the queue.')) {
      console.log('Abandoning ticket:', ticketId);
      // This would normally update the ticket status back to 'waiting'
      navigate('/new');
    }
  };

  const simulateCustomerConfirmation = (
    ticket: Ticket,
    setTicket: (ticket: Ticket) => void,
    setTimeoutRemaining: (time: number) => void
  ) => {
    if (ticket.status === 'marked-resolved') {
      const confirmedTicket = {
        ...ticket,
        status: 'completed' as const
      };
      setTicket(confirmedTicket);
      setTimeoutRemaining(0);
    }
  };

  return {
    handleClaimTicket,
    handleMarkAsFixed,
    handleAbandonTask,
    simulateCustomerConfirmation
  };
};