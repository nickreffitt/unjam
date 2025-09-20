import React, { createContext, useContext, useMemo } from 'react';
import { ScreenShareManager } from '@common/features/ScreenShareManager';
import { ScreenShareRequestStore, ScreenShareSessionStore } from '@common/features/ScreenShareManager/store';
import { useUserProfile } from '@extension/shared/UserProfileContext';

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
  const { customerProfile } = useUserProfile();

  // Create singleton store instances that are shared across all managers
  // Since there's only one active ticket at a time, we can share the same stores
  const contextValue = useMemo(() => {
    // Create shared store instances once
    const sharedRequestStore = new ScreenShareRequestStore();
    const sharedSessionStore = new ScreenShareSessionStore();

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

      // Create new manager and cache it
      console.debug('ScreenShareManagerContext: Creating new manager for ticket:', ticketId);
      manager = new ScreenShareManager(ticketId, sharedRequestStore, sharedSessionStore);
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