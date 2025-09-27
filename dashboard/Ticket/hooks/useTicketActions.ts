import { useNavigate } from 'react-router-dom';
import { type Ticket } from '@common/types';
import { useTicketManager } from '@dashboard/Ticket/contexts/TicketManagerContext';

export interface UseTicketActionsReturn {
  handleClaimTicket: (ticket: Ticket) => void;
  handleMarkAsFixed: (ticket: Ticket, setTicket: (ticket: Ticket) => void, setTimeoutRemaining: (time: number) => void) => void;
  handleAbandonTask: (ticketId: string) => void;
  simulateCustomerConfirmation: (ticket: Ticket, setTicket: (ticket: Ticket) => void, setTimeoutRemaining: (time: number) => void) => void;
  simulateAutoCompleteTimer: (ticket: Ticket, setTicket: (ticket: Ticket) => void, setTimeoutRemaining: (time: number) => void) => void;
}

export const useTicketActions = (): UseTicketActionsReturn => {
  const navigate = useNavigate();
  const { ticketManager } = useTicketManager();

  const handleClaimTicket = async (ticket: Ticket) => {
    if (!ticketManager) {
      console.error('No ticket manager available');
      return;
    }

    try {
      console.debug('Claiming ticket:', ticket.id);
      // Use the real TicketManager to claim the ticket
      const claimedTicket = await ticketManager.claimTicket(ticket.id);
      console.debug('Ticket claimed successfully:', claimedTicket);

      // Navigate to the active ticket view
      navigate(`/active/${ticket.id}`);
    } catch (error) {
      console.error('Failed to claim ticket:', error);
      // Re-throw the error so the UI can handle it
      throw error;
    }
  };

  const handleMarkAsFixed = async (
    ticket: Ticket,
    setTicket: (ticket: Ticket) => void,
    setTimeoutRemaining: (time: number) => void
  ) => {
    if (!ticketManager) {
      console.error('No ticket manager available');
      return;
    }

    try {
      console.debug('Marking ticket as fixed:', ticket.id);
      // Use the real TicketManager to mark ticket as fixed
      const updatedTicket = await ticketManager.markAsFixed(ticket.id);
      console.debug('Ticket marked as fixed successfully:', updatedTicket);

      // Update the UI state
      setTicket(updatedTicket);

      // Calculate remaining time until auto-complete
      if (updatedTicket.autoCompleteTimeoutAt) {
        const now = new Date().getTime();
        const timeoutTime = new Date(updatedTicket.autoCompleteTimeoutAt).getTime();
        const remainingSeconds = Math.max(0, Math.floor((timeoutTime - now) / 1000));
        setTimeoutRemaining(remainingSeconds);
      }
    } catch (error) {
      console.error('Failed to mark ticket as fixed:', error);
      // Could add toast notification here for user feedback
    }
  };

  const handleAbandonTask = async (ticketId: string) => {
    if (!ticketManager) {
      console.error('No ticket manager available');
      return;
    }

    if (window.confirm('Are you sure you want to abandon this ticket? It will be returned to the queue.')) {
      try {
        console.debug('Abandoning ticket:', ticketId);
        // Use the real TicketManager to abandon the ticket
        const abandonedTicket = await ticketManager.abandonTicket(ticketId);
        console.debug('Ticket abandoned successfully:', abandonedTicket);

        // Navigate back to new tickets list
        navigate('/new');
      } catch (error) {
        console.error('Failed to abandon ticket:', error);
        // Could add toast notification here for user feedback
      }
    }
  };

  const simulateCustomerConfirmation = async (
    ticket: Ticket,
    setTicket: (ticket: Ticket) => void,
    setTimeoutRemaining: (time: number) => void
  ) => {
    if (!ticketManager) {
      console.error('No ticket manager available');
      return;
    }

    if (ticket.status === 'awaiting-confirmation') {
      try {
        console.debug('Simulating customer confirmation for ticket:', ticket.id);
        const confirmedTicket = await ticketManager.markAsResolved(ticket.id);
        setTicket(confirmedTicket);
        setTimeoutRemaining(0);
      } catch (error) {
        console.error('Failed to simulate customer confirmation:', error);
      }
    }
  };

  const simulateAutoCompleteTimer = async (
    ticket: Ticket,
    setTicket: (ticket: Ticket) => void,
    setTimeoutRemaining: (time: number) => void
  ) => {
    if (!ticketManager) {
      console.error('No ticket manager available');
      return;
    }

    if (ticket.status === 'awaiting-confirmation') {
      try {
        console.debug('Simulating auto-complete timer for ticket:', ticket.id);
        const autoCompletedTicket = await ticketManager.autoCompleteTicket(ticket.id);
        setTicket(autoCompletedTicket);
        setTimeoutRemaining(0);
      } catch (error) {
        console.error('Failed to simulate auto-complete timer:', error);
      }
    }
  };

  return {
    handleClaimTicket,
    handleMarkAsFixed,
    handleAbandonTask,
    simulateCustomerConfirmation,
    simulateAutoCompleteTimer
  };
};