import React, { createContext, useContext, useMemo } from 'react';
import { ScreenShareManager } from '@common/features/ScreenShareManager';
import { ScreenShareRequestStore, ScreenShareSessionStore } from '@common/features/ScreenShareManager/store';

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

  // Create shared store instances that all managers will use
  const requestStore = useMemo(() => new ScreenShareRequestStore(), []);
  const sessionStore = useMemo(() => new ScreenShareSessionStore(), []);

  const contextValue = useMemo(() => {
    const createScreenShareManager = (ticketId: string) => {
      // Return cached manager if it exists
      if (managersCache.has(ticketId)) {
        return managersCache.get(ticketId)!;
      }

      // Create new manager with shared stores
      const manager = new ScreenShareManager(ticketId, requestStore, sessionStore);
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
  }, [managersCache, requestStore, sessionStore]);

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