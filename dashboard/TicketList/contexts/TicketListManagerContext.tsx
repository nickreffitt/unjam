import React, { createContext, useContext, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { TicketListManager } from '@common/features/TicketManager';
import { useUserProfile } from '@dashboard/shared/UserProfileContext';
import { useTicketManager } from '@dashboard/Ticket/contexts/TicketManagerContext';
import { useTicketListener } from '@common/features/TicketManager/hooks/useTicketListener';
import { type TicketListItem, type Ticket } from '@common/types';

interface TicketListManagerContextType {
  ticketListManager: TicketListManager;
  newTicketList: TicketListItem[];
  refreshNewTicketList: () => void;
}

const TicketListManagerContext = createContext<TicketListManagerContextType | null>(null);

interface TicketListManagerProviderProps {
  children: React.ReactNode;
}

export const TicketListManagerProvider: React.FC<TicketListManagerProviderProps> = ({ children }) => {
  const { engineerProfile } = useUserProfile();
  const { ticketStore } = useTicketManager();

  // State for new tickets in 'waiting' state using Map for efficient lookups
  const [newTicketList, setNewTicketList] = useState<TicketListItem[]>([]);

  // Create TicketListManager instance using shared UserProfile and TicketStore
  const ticketListManager = useMemo(() => {
    return new TicketListManager(engineerProfile, ticketStore);
  }, [engineerProfile, ticketStore]);

  const ticketListManagerRef = useRef(ticketListManager);
  ticketListManagerRef.current = ticketListManager;

  // Refresh new tickets from storage
  const refreshNewTicketList = useCallback(async () => {
    try {
      // Clear current new tickets
      setNewTicketList([]);

      // Reload from storage
      await ticketListManagerRef.current.reload();

      // Fetch ticket list items
      const newTicketsListItems = await ticketListManagerRef.current.listNewTickets();
      setNewTicketList(newTicketsListItems);
    } catch (error) {
      console.error('[TicketListManagerContext] Error refreshing new ticket list items:', error);
    }
  }, []);

  // Handler for when a new ticket is created
  const handleTicketCreated = useCallback((ticket: Ticket) => {
    console.debug('[TicketListManagerContext] New ticket created:', ticket.id);
    refreshNewTicketList();
  }, [refreshNewTicketList]);

  // Handler for when a ticket is updated
  const handleTicketUpdated = useCallback((ticket: Ticket) => {
    console.debug('[TicketListManagerContext] Ticket updated:', ticket.id, 'Status:', ticket.status);

    // If ticket status changed to 'waiting', add it
    if (ticket.status === 'waiting' || ticket.assignedTo?.id !== engineerProfile.id) {
      refreshNewTicketList();
    }
  }, [engineerProfile.id, refreshNewTicketList]);

  // Handler for when all tickets are cleared
  const handleTicketsCleared = useCallback(() => {
    console.debug('[TicketListManagerContext] All tickets cleared');
    refreshNewTicketList();
  }, [refreshNewTicketList]);

  // Set up ticket listener to maintain new tickets map
  useTicketListener({
    onTicketCreated: handleTicketCreated,
    onTicketUpdated: handleTicketUpdated,
    onTicketsCleared: handleTicketsCleared
  });

  // Initialize new tickets map on mount
  useEffect(() => {
    refreshNewTicketList();
  }, [refreshNewTicketList]);

  return (
    <TicketListManagerContext.Provider value={{
      ticketListManager,
      newTicketList,
      refreshNewTicketList
    }}>
      {children}
    </TicketListManagerContext.Provider>
  );
};

export const useTicketListManager = (): TicketListManagerContextType => {
  const context = useContext(TicketListManagerContext);
  if (!context) {
    throw new Error('useTicketListManager must be used within a TicketListManagerProvider');
  }
  return context;
};