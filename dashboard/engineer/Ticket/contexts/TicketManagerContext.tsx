import React, { createContext, useContext, useMemo } from 'react';
import { TicketManager } from '@common/features/TicketManager';
import { type TicketStore, TicketStoreLocal } from '@common/features/TicketManager/store';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';

interface TicketManagerContextType {
  ticketManager: TicketManager | null;
  ticketStore: TicketStore | null;
}

const TicketManagerContext = createContext<TicketManagerContextType | null>(null);

interface TicketManagerProviderProps {
  children: React.ReactNode;
}

export const TicketManagerProvider: React.FC<TicketManagerProviderProps> = ({ children }) => {
  const { authUser } = useAuthState();

  const ticketStore = useMemo(() => {
    if (authUser.status !== 'signed-in') {
      throw new Error('User not signed in, not instantiating ticketStore');
    }
    return new TicketStoreLocal();
  }, [authUser]);

  // Create shared instances using centralized engineer profile
  const ticketManager = useMemo(() => {
    if (authUser.status !== 'signed-in') {
      throw new Error('User not signed in, not instantiating ticketManager');
    }
    if (!authUser.profile || !ticketStore) {
      return null;
    }

    return new TicketManager(authUser.profile, ticketStore);
  }, [authUser, ticketStore]);

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