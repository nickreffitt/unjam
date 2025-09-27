import React, { createContext, useContext, useMemo } from 'react';
import { TicketManager } from '@common/features/TicketManager';
import { type TicketStore, TicketStoreLocal } from '@common/features/TicketManager/store';
import { useUserProfile } from '@dashboard/shared/contexts/AuthManagerContext';

interface TicketManagerContextType {
  ticketManager: TicketManager | null;
  ticketStore: TicketStore | null;
}

const TicketManagerContext = createContext<TicketManagerContextType | null>(null);

interface TicketManagerProviderProps {
  children: React.ReactNode;
}

export const TicketManagerProvider: React.FC<TicketManagerProviderProps> = ({ children }) => {
  const { currentProfile } = useUserProfile();

  // Create shared instances using centralized engineer profile
  const { ticketStore, ticketManager } = useMemo(() => {
    if (!currentProfile) {
      return { ticketStore: null, ticketManager: null };
    }

    const store = new TicketStoreLocal();
    const manager = new TicketManager(currentProfile, store);
    return { ticketStore: store, ticketManager: manager };
  }, [currentProfile]);

  return (
    <TicketManagerContext.Provider value={{ ticketManager, ticketStore }}>
      {children}
    </TicketManagerContext.Provider>
  );
};

export const useTicketManager = (): TicketManagerContextType => {
  const context = useContext(TicketManagerContext);
  if (!context) {
    throw new Error('useTicketManager must be used within a TicketManagerProvider');
  }
  return context;
};