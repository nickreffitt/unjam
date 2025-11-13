import { useCallback } from 'react';
import { type Ticket } from '@common/types';
import { useTicketManager } from '@extension/Ticket/contexts/TicketManagerContext';

export interface UseTicketActionsReturn {
  handleCreateTicket: (problemDescription: string) => Promise<void>;
  handleMarkFixed: () => void;
  handleConfirmFixed: () => Promise<void>;
  handleMarkStillBroken: () => Promise<void>;
  handleCancelTicket: () => Promise<void>;
}

export const useTicketActions = (
  activeTicket: Ticket | null,
  setActiveTicket: (ticket: Ticket | null) => void,
  setIsTicketVisible?: (visible: boolean) => void
): UseTicketActionsReturn => {
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

  const handleMarkFixed = useCallback(async (): Promise<void> => {
    if (activeTicket) {
      const updatedTicket = await ticketManager.markAsResolved(activeTicket.id);
      // Manually update context for same-tab updates (storage events only work cross-tab)
      setActiveTicket(updatedTicket);
      console.debug('Customer marked ticket as fixed');
    }
  }, [activeTicket, ticketManager, setActiveTicket]);

  const handleConfirmFixed = useCallback(async (): Promise<void> => {
    if (activeTicket) {
      try {
        const updatedTicket = await ticketManager.markAsResolved(activeTicket.id);
        // Manually update context for same-tab updates (storage events only work cross-tab)
        setActiveTicket(updatedTicket);
        console.debug('Customer confirmed fix');
      } catch (error) {
        console.error('Failed to confirm fix:', error);
      }
    }
  }, [activeTicket, ticketManager, setActiveTicket]);

  const handleMarkStillBroken = useCallback(async (): Promise<void> => {
    if (activeTicket) {
      try {
        const updatedTicket = await ticketManager.markStillBroken(activeTicket.id);
        // Manually update context for same-tab updates (storage events only work cross-tab)
        setActiveTicket(updatedTicket);
        console.debug('Customer marked as still broken');
      } catch (error) {
        console.error('Failed to mark as still broken:', error);
      }
    }
  }, [activeTicket, ticketManager, setActiveTicket]);

  const handleCancelTicket = useCallback(async (): Promise<void> => {
    if (activeTicket) {
      try {
        const updatedTicket = await ticketManager.cancelTicket(activeTicket.id);
        // Manually update context for same-tab updates (storage events only work cross-tab)
        setActiveTicket(updatedTicket);
        // Hide the ticket box after cancellation
        if (setIsTicketVisible) {
          setIsTicketVisible(false);
        }
        console.debug('Customer cancelled ticket');
      } catch (error) {
        console.error('Failed to cancel ticket:', error);
        // Re-throw so UI can handle the error
        throw error;
      }
    }
  }, [activeTicket, ticketManager, setActiveTicket, setIsTicketVisible]);

  return {
    handleCreateTicket,
    handleMarkFixed,
    handleConfirmFixed,
    handleMarkStillBroken,
    handleCancelTicket
  };
};