import React, { createContext, useContext, useMemo } from 'react';
import { RatingManager } from '@common/features/RatingManager';
import { type RatingStore, type RatingChanges, RatingChangesSupabase, RatingStoreSupabase } from '@common/features/RatingManager/store';
import { RatingEventEmitterLocal } from '@common/features/RatingManager/events';
import { useSupabase } from '@extension/shared/contexts/SupabaseContext';

interface RatingManagerContextType {
  ratingManager: RatingManager;
  ratingStore: RatingStore;
  ratingChanges: RatingChanges;
}

const RatingManagerContext = createContext<RatingManagerContextType | null>(null);

interface RatingManagerProviderProps {
  children: React.ReactNode;
}

export const RatingManagerProvider: React.FC<RatingManagerProviderProps> = ({ children }) => {
  const { supabaseClient } = useSupabase();

  // Create shared instances
  const { ratingStore, ratingChanges, ratingManager } = useMemo(() => {
    const eventEmitter = new RatingEventEmitterLocal();
    const store = new RatingStoreSupabase(supabaseClient, eventEmitter);
    const changes = new RatingChangesSupabase(supabaseClient, eventEmitter);
    console.debug('Instantiating RatingManager in extension');
    const manager = new RatingManager(store, changes);
    return { ratingStore: store, ratingChanges: changes, ratingManager: manager };
  }, [supabaseClient]);

  return (
    <RatingManagerContext.Provider value={{ ratingManager, ratingStore, ratingChanges }}>
      {children}
    </RatingManagerContext.Provider>
  );
};

export const useRatingManager = (): RatingManagerContextType => {
  const context = useContext(RatingManagerContext);
  if (!context) {
    throw new Error('useRatingManager must be used within a RatingManagerProvider');
  }
  return context;
};

export { RatingManagerContext };
