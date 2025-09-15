import React, { createContext, useContext, useMemo } from 'react';
import { TicketManager } from '@common/features/ticket/TicketManager';
import { TicketStore } from '@common/data/TicketStore';
import { useUserProfile } from '@dashboard/shared/UserProfileContext';

interface TicketManagerContextType {
  ticketManager: TicketManager;
  ticketStore: TicketStore;
}

const TicketManagerContext = createContext<TicketManagerContextType | null>(null);

interface TicketManagerProviderProps {
  children: React.ReactNode;
}

export const TicketManagerProvider: React.FC<TicketManagerProviderProps> = ({ children }) => {
  const { engineerProfile } = useUserProfile();

  // Create shared instances using centralized engineer profile
  const { ticketStore, ticketManager } = useMemo(() => {
    const store = new TicketStore();
    const manager = new TicketManager(engineerProfile, store);
    return { ticketStore: store, ticketManager: manager };
  }, [engineerProfile]);

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