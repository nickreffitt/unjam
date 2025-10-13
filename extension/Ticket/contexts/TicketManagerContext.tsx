import React, { createContext, useContext, useMemo } from 'react';
import { TicketManager } from '@common/features/TicketManager';
import { type TicketStore, type TicketChanges, TicketChangesSupabase, TicketStoreSupabase } from '@common/features/TicketManager/store';
import { TicketEventEmitterLocal } from '@common/features/TicketManager/events';
import { ApiManager } from '@common/features/ApiManager/ApiManager';
import { useUserProfile } from '@extension/shared/UserProfileContext';
import { useSupabase } from '@extension/shared/contexts/SupabaseContext';

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
  const { customerProfile } = useUserProfile();
  const { supabaseClient, supabaseUrl } = useSupabase();

  // Create shared instances using centralized customer profile
  const { ticketStore, ticketChanges, ticketManager } = useMemo(() => {
    if (!customerProfile) {
      throw new Error('No profile set')
    }
    const eventEmitter = new TicketEventEmitterLocal();
    const store = new TicketStoreSupabase(supabaseClient, eventEmitter);
    const changes = new TicketChangesSupabase(supabaseClient, eventEmitter);
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1`;
    const apiManager = new ApiManager(supabaseClient, edgeFunctionUrl);
    console.debug('Instantiating TicketManager in extension')
    const manager = new TicketManager(customerProfile, store, changes, apiManager);
    return { ticketStore: store, ticketChanges: changes, ticketManager: manager };
  }, [customerProfile, supabaseClient, supabaseUrl]);

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