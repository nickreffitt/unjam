import React, { createContext, useContext, useMemo, useRef } from 'react';
import { TicketManager } from '@common/features/TicketManager';
import { type TicketStore, type TicketChanges, TicketChangesSupabase, TicketStoreSupabase } from '@common/features/TicketManager/store';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import { useSupabase } from '@dashboard/shared/contexts/SupabaseContext';
import { TicketEventEmitterLocal } from '@common/features/TicketManager/events';

interface TicketManagerContextType {
  ticketManager: TicketManager;
  ticketStore: TicketStore;
  ticketChanges: TicketChanges;
}

const TicketManagerContext = createContext<TicketManagerContextType | null>(null);

interface TicketManagerProviderProps {
  children: React.ReactNode;
}

export const TicketManagerProvider: React.FC<TicketManagerProviderProps> = ({ children }) => {
  const { authUser } = useAuthState();
  const { supabaseClient } = useSupabase();

  const ticketEventEmitter = useMemo(() => {
      return new TicketEventEmitterLocal();
  }, []);

  const ticketStore = useMemo(() => {
    return new TicketStoreSupabase(supabaseClient, ticketEventEmitter);
  }, [supabaseClient, ticketEventEmitter]);

  // Create TicketChanges instance for real-time updates
  const ticketChanges = useMemo(() => {
    return new TicketChangesSupabase(supabaseClient, ticketEventEmitter);
  }, [supabaseClient, ticketEventEmitter]);

  // Create shared instances using centralized engineer profile
  const ticketManagerRef = useRef<TicketManager | null>(null);

  const ticketManager = useMemo(() => {
    if (ticketManagerRef.current) {
      return ticketManagerRef.current;
    }

    if (authUser.status !== 'signed-in') {
      throw new Error('User not signed in, not instantiating ticketManager');
    }
    if (!authUser.profile) {
      throw new Error('User has no profile');
    }

    console.debug('Instantiating TicketManager')
    const autoCompleteTimeoutSeconds = import.meta.env.VITE_AUTO_COMPLETE_TIMEOUT_SECONDS;
    const manager = new TicketManager(authUser.profile, ticketStore, ticketChanges, autoCompleteTimeoutSeconds);
    ticketManagerRef.current = manager;
    return manager;
  }, [authUser, ticketStore, ticketChanges]);

  return (
    <TicketManagerContext.Provider value={{ ticketManager, ticketStore, ticketChanges }}>
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