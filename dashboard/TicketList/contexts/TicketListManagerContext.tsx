import React, { createContext, useContext, useMemo } from 'react';
import { TicketListManager } from '@common/features/ticket/TicketListManager';
import { useUserProfile } from '@dashboard/shared/UserProfileContext';
import { useTicketManager } from '@dashboard/Ticket/contexts/TicketManagerContext';

interface TicketListManagerContextType {
  ticketListManager: TicketListManager;
}

const TicketListManagerContext = createContext<TicketListManagerContextType | null>(null);

interface TicketListManagerProviderProps {
  children: React.ReactNode;
}

export const TicketListManagerProvider: React.FC<TicketListManagerProviderProps> = ({ children }) => {
  const { engineerProfile } = useUserProfile();
  const { ticketStore } = useTicketManager();

  // Create TicketListManager instance using shared UserProfile and TicketStore
  const ticketListManager = useMemo(() => {
    return new TicketListManager(engineerProfile, ticketStore);
  }, [engineerProfile, ticketStore]);

  return (
    <TicketListManagerContext.Provider value={{ ticketListManager }}>
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