import React, { createContext, useContext, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { TicketListManager } from '@common/features/TicketManager';
import { useUserProfile } from '@dashboard/shared/contexts/AuthManagerContext';
import { useTicketManager } from '@dashboard/Ticket/contexts/TicketManagerContext';
import { useTicketListener } from '@common/features/TicketManager/hooks/useTicketListener';
import { type TicketListItem, type Ticket } from '@common/types';

interface TicketListManagerContextType {
  ticketListManager: TicketListManager | null;
  newTicketList: TicketListItem[];
  refreshNewTicketList: () => void;
}

const TicketListManagerContext = createContext<TicketListManagerContextType | null>(null);

interface TicketListManagerProviderProps {
  children: React.ReactNode;
}

export const TicketListManagerProvider: React.FC<TicketListManagerProviderProps> = ({ children }) => {
  const { currentProfile, isLoading } = useUserProfile();
  const { ticketStore } = useTicketManager();

  // State for new tickets in 'waiting' state using Map for efficient lookups
  const [newTicketList, setNewTicketList] = useState<TicketListItem[]>([]);

  // Only show debug logs when we have meaningful state changes
  const hasProfile = !!currentProfile;
  const hasTicketStore = !!ticketStore;

  // Create TicketListManager instance using shared UserProfile and TicketStore
  const ticketListManager = useMemo(() => {
    // Don't create manager if still loading or if no profile/store
    if (isLoading || !currentProfile || !ticketStore) {
      return null;
    }

    console.debug('[TicketListManagerContext] Creating TicketListManager with profile:', currentProfile.id, 'type:', currentProfile.type);
    const manager = new TicketListManager(currentProfile, ticketStore);
    console.debug('[TicketListManagerContext] TicketListManager created successfully');
    return manager;
  }, [currentProfile, ticketStore, isLoading]);

  const ticketListManagerRef = useRef(ticketListManager);
  ticketListManagerRef.current = ticketListManager;

  // Refresh new tickets from storage
  const refreshNewTicketList = useCallback(async () => {
    try {
      // Don't attempt refresh if still loading or no manager
      if (isLoading || !ticketListManagerRef.current) {
        return;
      }

      console.debug('[TicketListManagerContext] refreshNewTicketList called');

      // Clear current new tickets
      setNewTicketList([]);

      console.debug('[TicketListManagerContext] Reloading tickets from storage');
      // Reload from storage
      await ticketListManagerRef.current.reload();

      console.debug('[TicketListManagerContext] Listing new tickets');
      // Fetch ticket list items
      const newTicketsListItems = await ticketListManagerRef.current.listNewTickets();
      console.debug('[TicketListManagerContext] Found new tickets:', newTicketsListItems.length);
      setNewTicketList(newTicketsListItems);
    } catch (error) {
      console.error('[TicketListManagerContext] Error refreshing new ticket list items:', error);
    }
  }, [isLoading]);

  // Handler for when a new ticket is created
  const handleTicketCreated = useCallback((ticket: Ticket) => {
    if (!currentProfile) return; // Don't handle events if no profile
    console.debug('[TicketListManagerContext] New ticket created:', ticket.id);
    refreshNewTicketList();
  }, [currentProfile, refreshNewTicketList]);

  // Handler for when a ticket is updated
  const handleTicketUpdated = useCallback((ticket: Ticket) => {
    if (!currentProfile) return; // Don't handle events if no profile
    console.debug('[TicketListManagerContext] Ticket updated:', ticket.id, 'Status:', ticket.status);

    // If ticket status changed to 'waiting', add it
    if (ticket.status === 'waiting' || ticket.assignedTo?.id !== currentProfile?.id) {
      refreshNewTicketList();
    }
  }, [currentProfile, refreshNewTicketList]);

  // Handler for when all tickets are cleared
  const handleTicketsCleared = useCallback(() => {
    if (!currentProfile) return; // Don't handle events if no profile
    console.debug('[TicketListManagerContext] All tickets cleared');
    refreshNewTicketList();
  }, [currentProfile, refreshNewTicketList]);

  // Only set up ticket listener if we have a profile (dormant until profile exists)
  const listenerCallbacks = currentProfile ? {
    onTicketCreated: handleTicketCreated,
    onTicketUpdated: handleTicketUpdated,
    onTicketsCleared: handleTicketsCleared
  } : {};

  useTicketListener(listenerCallbacks);

  // Initialize new tickets map only when manager becomes available (not before profile exists)
  useEffect(() => {
    if (ticketListManager) {
      console.debug('[TicketListManagerContext] TicketListManager now available, refreshing ticket list');
      refreshNewTicketList();
    }
  }, [ticketListManager, refreshNewTicketList]);

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