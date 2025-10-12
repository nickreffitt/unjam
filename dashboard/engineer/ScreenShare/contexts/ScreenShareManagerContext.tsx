import React, { createContext, useContext, useMemo } from 'react';
import { ScreenShareManager } from '@common/features/ScreenShareManager';
import { type ScreenShareRequestStore, type ScreenShareSessionStore, ScreenShareRequestChangesSupabase, ScreenShareRequestStoreSupabase, ScreenShareSessionChangesSupabase } from '@common/features/ScreenShareManager/store';
import { WebRTCEventEmitter } from '@common/features/WebRTCManager';
import { ScreenShareEventEmitter } from '@common/features/ScreenShareManager/events';
import { useSupabase } from '@dashboard/shared/contexts/SupabaseContext';
import { ScreenShareSessionStoreSupabase } from '@common/features/ScreenShareManager/store/ScreenShareSessionStoreSupabase';
import { WebRTCSignalingChangesSupabase, WebRTCSignalingStoreSupabase } from '@common/features/WebRTCManager/store';

interface ScreenShareManagerContextType {
  createScreenShareManager: (ticketId: string) => ScreenShareManager;
  createRequestStore: () => ScreenShareRequestStore;
  createSessionStore: () => ScreenShareSessionStore;
  clearManagerCache: (ticketId: string) => void;
}

const ScreenShareManagerContext = createContext<ScreenShareManagerContextType | null>(null);

interface ScreenShareManagerProviderProps {
  children: React.ReactNode;
}

export const ScreenShareManagerProvider: React.FC<ScreenShareManagerProviderProps> = ({ children }) => {
  // Cache managers per ticketId to ensure all hooks share the same instance
  const managersCache = useMemo(() => new Map<string, ScreenShareManager>(), []);
  const { supabaseClient } = useSupabase()

  // Create shared store instances that all managers will use
  const eventEmitter = useMemo(() => new ScreenShareEventEmitter(), []);
  const webRTCEventEmitter = useMemo(() => new WebRTCEventEmitter(), []);

  const requestStore = useMemo(() => new ScreenShareRequestStoreSupabase(supabaseClient, eventEmitter), []);
  const sessionStore = useMemo(() => new ScreenShareSessionStoreSupabase(supabaseClient, eventEmitter), []);
  const signalingStore = useMemo(() => new WebRTCSignalingStoreSupabase(supabaseClient, webRTCEventEmitter), []);

  const contextValue = useMemo(() => {
    const createScreenShareManager = (ticketId: string) => {
      // Return cached manager if it exists
      if (managersCache.has(ticketId)) {
        return managersCache.get(ticketId);
      }

      // Create request and session changes listener for this ticket
      const requestChanges = new ScreenShareRequestChangesSupabase(ticketId, supabaseClient, eventEmitter);
      const sessionChanges = new ScreenShareSessionChangesSupabase(ticketId, supabaseClient, eventEmitter);
      const signalChanges = new WebRTCSignalingChangesSupabase(ticketId, supabaseClient, webRTCEventEmitter)

      // Create new manager with shared stores
      const manager = new ScreenShareManager(ticketId, requestStore, sessionStore, requestChanges, sessionChanges, eventEmitter, signalingStore, signalChanges, webRTCEventEmitter);
      managersCache.set(ticketId, manager);
      return manager;
    };

    const createRequestStore = () => requestStore;
    const createSessionStore = () => sessionStore;

    const clearManagerCache = (ticketId: string) => {
      console.debug('ScreenShareManagerContext: Clearing manager cache for ticket:', ticketId);
      managersCache.delete(ticketId);
    };

    return { createScreenShareManager, createRequestStore, createSessionStore, clearManagerCache };
  }, [managersCache, supabaseClient, eventEmitter, webRTCEventEmitter, requestStore, sessionStore, signalingStore]);

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
