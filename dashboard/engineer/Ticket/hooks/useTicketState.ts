import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { type Ticket } from '@common/types';
import { useTicketManager } from '@dashboard/engineer/Ticket/contexts/TicketManagerContext';
import { useTicketListener } from '@common/features/TicketManager/hooks/useTicketListener';

export interface UseTicketStateReturn {
  ticket: Ticket | null;
  elapsedTime: number;
  timeoutRemaining: number;
  setTicket: React.Dispatch<React.SetStateAction<Ticket | null>>;
  setElapsedTime: React.Dispatch<React.SetStateAction<number>>;
  setTimeoutRemaining: React.Dispatch<React.SetStateAction<number>>;
}

export const useTicketState = (ticketId: string | undefined): UseTicketStateReturn => {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timeoutRemaining, setTimeoutRemaining] = useState(0);
  const { ticketManager } = useTicketManager();

  // Use ref to store ticket status to avoid recreating callbacks
  const ticketStatusRef = useRef<string | undefined>();
  ticketStatusRef.current = ticket?.status;

  // Load ticket on mount
  useEffect(() => {
    if (!ticketManager) {
      throw new Error('No ticket store found')
    }
    if (!ticketId) {
      throw new Error("No ticket ID given")
    }

    const loadTicket = async () => {
      const foundTicket = await ticketManager.getTicket(ticketId);
      if (foundTicket) {
        // If the ticket is waiting and we're in active context, claim it using TicketManager
        if (foundTicket.status === 'waiting' && window.location.pathname.includes('/active/') && ticketManager) {
          ticketManager.claimTicket(ticketId).then(claimedTicket => {
            setTicket(claimedTicket);
            setElapsedTime(0);
          }).catch(error => {
            console.error('Failed to claim ticket in useTicketState:', error);
            // Fall back to the original ticket
            setTicket(foundTicket);
            setElapsedTime(foundTicket.elapsedTime);
          });
        } else {
          setTicket(foundTicket);
          setElapsedTime(foundTicket.elapsedTime);
        }
      }
    };

    loadTicket();
  }, [ticketId, ticketManager]);

  // Handle ticket updates from other tabs (e.g., customer marking as still broken)
  const handleTicketUpdated = useCallback(async (updatedTicket: Ticket) => {
    if (updatedTicket.id === ticketId) {
      console.debug('useTicketState: Received ticket update for', ticketId, 'with status', updatedTicket.status);
      // Reload from store to get the latest data

      ticketManager.reload();
      const freshTicket = await ticketManager.getTicket(ticketId);
      if (freshTicket) {
        setTicket(freshTicket);
        // Reset elapsed time when ticket goes back to in-progress
        if (freshTicket.status === 'in-progress' && ticketStatusRef.current === 'awaiting-confirmation') {
          setElapsedTime(0);
        }
      }
    }
  }, [ticketId, ticketManager]);

  // Memoize the callbacks object to prevent recreating the listener
  const ticketListenerCallbacks = useMemo(() => ({
    onTicketUpdated: handleTicketUpdated
  }), [handleTicketUpdated]);

  // Listen for cross-tab ticket events
  useTicketListener(ticketListenerCallbacks);

  // Update elapsed time every second for active tickets
  useEffect(() => {
    if (!ticket) return;

    const interval = setInterval(() => {
      if (ticket.status === 'in-progress') {
        setElapsedTime(prev => prev + 1);
      } else if (ticket.status === 'waiting') {
        setElapsedTime(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ticket]);

  // Auto-complete countdown timer
  useEffect(() => {
    if (timeoutRemaining <= 0 || ticket?.status !== 'marked-resolved') return;

    const interval = setInterval(() => {
      setTimeoutRemaining(prev => {
        if (prev <= 1) {
          // Auto-complete the ticket
          if (ticket) {
            const autoCompletedTicket = {
              ...ticket,
              status: 'auto-completed' as const
            };
            setTicket(autoCompletedTicket);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeoutRemaining, ticket]);

  return {
    ticket,
    elapsedTime,
    timeoutRemaining,
    setTicket,
    setElapsedTime,
    setTimeoutRemaining
  };
};