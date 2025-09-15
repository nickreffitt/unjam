import { useState, useEffect } from 'react';
import { type Ticket } from '@common/types';
import { useTicketManager } from '@dashboard/Ticket/contexts/TicketManagerContext';

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
  const { ticketStore, ticketManager } = useTicketManager();

  // Load ticket on mount
  useEffect(() => {
    if (!ticketId) return;

    const foundTicket = ticketStore.get(ticketId);
    if (foundTicket) {
      // If the ticket is waiting and we're in active context, claim it using TicketManager
      if (foundTicket.status === 'waiting' && window.location.pathname.includes('/active/')) {
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
  }, [ticketId, ticketStore, ticketManager]);

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