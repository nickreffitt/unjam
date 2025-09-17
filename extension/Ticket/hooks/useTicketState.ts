import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { type Ticket } from '@common/types';
import { useTicketManager } from '@extension/Ticket/contexts/TicketManagerContext';
import { useTicketListener } from '@common/features/TicketManager/hooks';
import { useUserProfile } from '@extension/shared/UserProfileContext';

export interface UseTicketStateReturn {
  activeTicket: Ticket | null;
  setActiveTicket: (ticket: Ticket | null) => void;
  isChatVisible: boolean;
  setIsChatVisible: (visible: boolean) => void;
}

export const useTicketState = (): UseTicketStateReturn => {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [isChatVisible, setIsChatVisible] = useState<boolean>(false);
  const { customerProfile } = useUserProfile();
  const { ticketManager } = useTicketManager();

  // Use ref to store current activeTicket to avoid recreating callbacks
  const activeTicketRef = useRef<Ticket | null>(activeTicket);
  const prevTicketStatusRef = useRef<string | null>(null);
  activeTicketRef.current = activeTicket;

  // Track if user has manually toggled chat to respect their preference
  const hasUserToggledChatRef = useRef<boolean>(false);

  // Auto-open chat when ticket status becomes 'in-progress' (only if user hasn't manually toggled)
  useEffect(() => {
    const currentStatus = activeTicket?.status;
    const prevStatus = prevTicketStatusRef.current;

    // Only auto-open if ticket transitions to 'in-progress' AND user hasn't manually toggled
    if (currentStatus === 'in-progress' && (prevStatus !== 'in-progress' || prevStatus === null) && !hasUserToggledChatRef.current) {
      setIsChatVisible(true);
      console.debug('useTicketState: Auto-opening chat for in-progress ticket');
    }

    // Auto-close chat if ticket moves away from 'in-progress' AND user hasn't manually toggled
    else if (currentStatus !== 'in-progress' && prevStatus === 'in-progress' && !hasUserToggledChatRef.current) {
      setIsChatVisible(false);
      console.debug('useTicketState: Auto-closing chat - ticket no longer in-progress');
    }

    // Update previous status
    prevTicketStatusRef.current = currentStatus || null;
  }, [activeTicket?.status]);

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
          console.debug('useTicketState: Found existing active ticket', existingActiveTicket.id);
        } else {
          console.debug('useTicketState: No active ticket found');
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
      console.debug('useTicketState: New ticket created:', ticket.id);
      ticketManager.reload();
      setActiveTicket(ticket);
    }
  }, [customerProfile.id, ticketManager]);

  const handleTicketUpdated = useCallback((ticket: Ticket) => {
    // Only update if this ticket belongs to our customer and is our active ticket
    if (ticket.createdBy.id === customerProfile.id && activeTicketRef.current?.id === ticket.id) {
      console.debug('useTicketState: Active ticket updated:', ticket.id);
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

  // Custom setIsChatVisible that tracks manual user toggles
  const handleSetIsChatVisible = useCallback((visible: boolean) => {
    setIsChatVisible(visible);
    hasUserToggledChatRef.current = true;
    console.debug('useTicketState: User manually toggled chat to', visible);
  }, []);

  return {
    activeTicket,
    setActiveTicket,
    isChatVisible,
    setIsChatVisible: handleSetIsChatVisible
  };
};