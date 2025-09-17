import { useTicketManager } from '@extension/Ticket/contexts/TicketManagerContext';

export interface UseTicketActionsReturn {
  handleCreateTicket: (problemDescription: string) => Promise<void>;
}

export const useTicketActions = (): UseTicketActionsReturn => {
  const { ticketManager } = useTicketManager();

  const handleCreateTicket = async (problemDescription: string): Promise<void> => {
    try {
      console.debug('Creating new ticket with description:', problemDescription);
      const newTicket = await ticketManager.createTicket(problemDescription);
      console.debug('Ticket created successfully:', newTicket.id);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      throw error; // Re-throw so UI can handle the error
    }
  };

  return {
    handleCreateTicket
  };
};