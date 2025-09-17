import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { type Ticket } from '@common/types';
import { useTicketManager } from '@extension/contexts/TicketManagerContext';
import { useTicketListener } from '@common/features/TicketManager/hooks';
import { useUserProfile } from '@extension/shared/UserProfileContext';

export interface UseTicketStateReturn {
  activeTicket: Ticket | null;
  setActiveTicket: (ticket: Ticket | null) => void;
}

export const useTicketState = (): UseTicketStateReturn => {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const { customerProfile } = useUserProfile();
  const { ticketManager } = useTicketManager();

  // Use ref to store current activeTicket to avoid recreating callbacks
  const activeTicketRef = useRef<Ticket | null>(activeTicket);
  activeTicketRef.current = activeTicket;

  // Load active ticket on initialization
  useEffect(() => {
    const loadActiveTicket = async () => {
      try {
        // Reload from storage to ensure we have latest data
        ticketManager.reload();

        // Check for existing active ticket
        const existingActiveTicket = ticketManager.getActiveTicket();
        if (existingActiveTicket) {
          setActiveTicket(existingActiveTicket);
          console.info('useTicketState: Found existing active ticket', existingActiveTicket.id);
        } else {
          console.info('useTicketState: No active ticket found');
        }
      } catch (error) {
        console.error('useTicketState: Error loading active ticket:', error);
      }
    };

    loadActiveTicket();
  }, [ticketManager]);

  // Create stable callback functions to prevent TicketListener recreation
  const handleTicketCreated = useCallback((ticket: Ticket) => {
    // Only update if this ticket belongs to our customer
    if (ticket.createdBy.id === customerProfile.id) {
      console.info('useTicketState: New ticket created:', ticket.id);
      ticketManager.reload();
      setActiveTicket(ticket);
    }
  }, [customerProfile.id, ticketManager]);

  const handleTicketUpdated = useCallback((ticket: Ticket) => {
    // Only update if this ticket belongs to our customer and is our active ticket
    if (ticket.createdBy.id === customerProfile.id && activeTicketRef.current?.id === ticket.id) {
      console.info('useTicketState: Active ticket updated:', ticket.id);
      ticketManager.reload();
      setActiveTicket(ticket);
    }
  }, [customerProfile.id, ticketManager]);

  // Memoize the callbacks object to prevent recreating the listener
  const ticketListenerCallbacks = useMemo(() => ({
    onTicketCreated: handleTicketCreated,
    onTicketUpdated: handleTicketUpdated
  }), [handleTicketCreated, handleTicketUpdated]);

  // Listen for cross-tab ticket events to keep context in sync
  useTicketListener(ticketListenerCallbacks);

  return {
    activeTicket,
    setActiveTicket
  };
};