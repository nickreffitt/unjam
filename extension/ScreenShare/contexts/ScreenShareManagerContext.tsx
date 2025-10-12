import React, { createContext, useContext, useMemo } from 'react';
import { ScreenShareManager } from '@common/features/ScreenShareManager';
import { type ScreenShareRequestStore, type ScreenShareSessionStore, ScreenShareRequestChangesSupabase, ScreenShareRequestStoreSupabase, ScreenShareSessionChangesSupabase } from '@common/features/ScreenShareManager/store';
import { WebRTCEventEmitter, WebRTCSignalingStoreLocal } from '@common/features/WebRTCManager';
import { ScreenShareEventEmitter } from '@common/features/ScreenShareManager/events';
import { useSupabase } from '@extension/shared/contexts/SupabaseContext';
import { ScreenShareSessionStoreSupabase } from '@common/features/ScreenShareManager/store/ScreenShareSessionStoreSupabase';
import { WebRTCSignalingChangesSupabase, WebRTCSignalingStoreSupabase } from '@common/features/WebRTCManager/store';

interface ScreenShareManagerContextType {
  createScreenShareManager: (ticketId: string) => ScreenShareManager;
  createScreenShareRequestStore: () => ScreenShareRequestStore;
  createScreenShareSessionStore: () => ScreenShareSessionStore;
}

const ScreenShareManagerContext = createContext<ScreenShareManagerContextType | null>(null);

interface ScreenShareManagerProviderProps {
  children: React.ReactNode;
}

export const ScreenShareManagerProvider: React.FC<ScreenShareManagerProviderProps> = ({ children }) => {
  const { supabaseClient } = useSupabase();

  // Create singleton store instances that are shared across all managers
  // Since there's only one active ticket at a time, we can share the same stores
  const contextValue = useMemo(() => {
    // Create shared store instances once
    const eventEmitter = new ScreenShareEventEmitter();
    const webRTCEventEmitter = new WebRTCEventEmitter();
    const sharedRequestStore = new ScreenShareRequestStoreSupabase(supabaseClient, eventEmitter);
    const sharedSessionStore = new ScreenShareSessionStoreSupabase(supabaseClient, eventEmitter);
    const sharedSignalingStore = new WebRTCSignalingStoreSupabase(supabaseClient, webRTCEventEmitter);
    
    // Cache manager instances per ticket ID to prevent disposing active WebRTC connections
    const managerCache = new Map<string, ScreenShareManager>();

    const createScreenShareRequestStore = () => {
      return sharedRequestStore;
    };

    const createScreenShareSessionStore = () => {
      return sharedSessionStore;
    };

    const createScreenShareManager = (ticketId: string) => {
      // Return existing manager if one exists for this ticket
      let manager = managerCache.get(ticketId);
      if (manager) {
        console.debug('ScreenShareManagerContext: Returning cached manager for ticket:', ticketId);
        return manager;
      }

      // Create request and session changes listener for this ticket
      const requestChanges = new ScreenShareRequestChangesSupabase(ticketId, supabaseClient, eventEmitter);
      const sessionChanges = new ScreenShareSessionChangesSupabase(ticketId, supabaseClient, eventEmitter);
      const signalChanges = new WebRTCSignalingChangesSupabase(ticketId, supabaseClient, webRTCEventEmitter)

      // Create new manager and cache it
      console.debug('ScreenShareManagerContext: Creating new manager for ticket:', ticketId);
      manager = new ScreenShareManager(ticketId, sharedRequestStore, sharedSessionStore, requestChanges, sessionChanges, eventEmitter, sharedSignalingStore, signalChanges, webRTCEventEmitter);
      managerCache.set(ticketId, manager);
      return manager;
    };

    return {
      createScreenShareManager,
      createScreenShareRequestStore,
      createScreenShareSessionStore
    };
  }, []);

  return (
    <ScreenShareManagerContext.Provider value={contextValue}>
      {children}
    </ScreenShareManagerContext.Provider>
  );
};

export const useScreenShareManager = (): ScreenShareManagerContextType => {
  const context = useContext(ScreenShareManagerContext);
  if (!context) {
    throw new Error('useScreenShareManager must be used within a ScreenShareManagerProvider');
  }
  return context;
};
