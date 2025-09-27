import React, { createContext, useContext, useMemo } from 'react';
import { TicketManager } from '@common/features/TicketManager';
import { type TicketStore, TicketStoreLocal } from '@common/features/TicketManager/store';
import { useUserProfile } from '@extension/shared/UserProfileContext';
import { type Ticket } from '@common/types';

interface TicketManagerContextType {
  ticketManager: TicketManager;
  ticketStore: TicketStore;
}

const TicketManagerContext = createContext<TicketManagerContextType | null>(null);

interface TicketManagerProviderProps {
  children: React.ReactNode;
}

export const TicketManagerProvider: React.FC<TicketManagerProviderProps> = ({ children }) => {
  const { customerProfile } = useUserProfile();

  // Create shared instances using centralized customer profile
  const { ticketStore, ticketManager } = useMemo(() => {
    const store = new TicketStoreLocal();
    const manager = new TicketManager(customerProfile, store);
    return { ticketStore: store, ticketManager: manager };
  }, [customerProfile]);

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