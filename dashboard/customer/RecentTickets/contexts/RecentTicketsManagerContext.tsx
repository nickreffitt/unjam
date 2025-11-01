import React, { createContext, useContext, useMemo } from 'react';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import { useSupabase } from '@dashboard/shared/contexts/SupabaseContext';
import { TicketManager } from '@common/features/TicketManager';
import { TicketStoreSupabase } from '@common/features/TicketManager/store/TicketStoreSupabase';
import { TicketChangesSupabase } from '@common/features/TicketManager/store/TicketChangesSupabase';
import { TicketEventEmitterLocal } from '@common/features/TicketManager/events/TicketEventEmitterLocal';
import { RatingManager } from '@common/features/RatingManager';
import { RatingStoreSupabase } from '@common/features/RatingManager/store/RatingStoreSupabase';
import { RatingChangesSupabase } from '@common/features/RatingManager/store/RatingChangesSupabase';
import { RatingEventEmitterLocal } from '@common/features/RatingManager/events/RatingEventEmitterLocal';
import type { CustomerProfile } from '@common/types';

interface RecentTicketsManagerContextType {
  userProfile: CustomerProfile;
  ticketManager: TicketManager;
  ratingManager: RatingManager;
}

const RecentTicketsManagerContext = createContext<RecentTicketsManagerContextType | null>(null);

interface RecentTicketsManagerProviderProps {
  children: React.ReactNode;
}

export const RecentTicketsManagerProvider: React.FC<RecentTicketsManagerProviderProps> = ({ children }) => {
  const { authUser } = useAuthState();
  const { supabaseClient } = useSupabase();

  if (!authUser.profile) {
    throw new Error('No user profile available for recent tickets manager');
  }

  if (authUser.profile.type !== 'customer') {
    throw new Error('Recent tickets manager requires a customer profile');
  }

  const userProfile = authUser.profile as CustomerProfile;

  const autoCompleteTimeoutSeconds = parseInt(import.meta.env.VITE_AUTO_COMPLETE_TIMEOUT_SECONDS || '30', 10);

  // Initialize TicketManager and RatingManager using shared Supabase client
  const { ticketManager, ratingManager } = useMemo(() => {
    // Set up TicketManager
    const ticketEventEmitter = new TicketEventEmitterLocal();
    const ticketStore = new TicketStoreSupabase(supabaseClient, ticketEventEmitter);
    const ticketChanges = new TicketChangesSupabase(supabaseClient, ticketEventEmitter);
    const ticketManager = new TicketManager(
      userProfile,
      ticketStore,
      ticketChanges,
      autoCompleteTimeoutSeconds
    );

    // Set up RatingManager
    const ratingEventEmitter = new RatingEventEmitterLocal();
    const ratingStore = new RatingStoreSupabase(supabaseClient, ratingEventEmitter);
    const ratingChanges = new RatingChangesSupabase(supabaseClient, ratingEventEmitter);
    const ratingManager = new RatingManager(ratingStore, ratingChanges);

    return { ticketManager, ratingManager };
  }, [supabaseClient, userProfile, autoCompleteTimeoutSeconds]);

  const contextValue: RecentTicketsManagerContextType = useMemo(() => ({
    userProfile,
    ticketManager,
    ratingManager
  }), [userProfile, ticketManager, ratingManager]);

  return (
    <RecentTicketsManagerContext.Provider value={contextValue}>
      {children}
    </RecentTicketsManagerContext.Provider>
  );
};

export const useRecentTicketsManager = (): RecentTicketsManagerContextType => {
  const context = useContext(RecentTicketsManagerContext);
  if (!context) {
    throw new Error('useRecentTicketsManager must be used within a RecentTicketsManagerProvider');
  }
  return context;
};
