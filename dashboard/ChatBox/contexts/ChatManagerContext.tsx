import React, { createContext, useContext, useMemo } from 'react';
import { ChatManager } from '@common/features/ChatManager';
import { ChatStore } from '@common/features/ChatManager/store';
import { useUserProfile } from '@dashboard/shared/UserProfileContext';

interface ChatManagerContextType {
  createChatManager: (ticketId: string, receiverProfile: any) => ChatManager;
  createChatStore: (ticketId: string) => ChatStore;
}

const ChatManagerContext = createContext<ChatManagerContextType | null>(null);

interface ChatManagerProviderProps {
  children: React.ReactNode;
}

export const ChatManagerProvider: React.FC<ChatManagerProviderProps> = ({ children }) => {
  const { engineerProfile } = useUserProfile();

  // Create factory functions for chat manager and store instances
  const contextValue = useMemo(() => {
    const createChatManager = (ticketId: string, receiverProfile: any) => {
      return new ChatManager(ticketId, engineerProfile, receiverProfile);
    };

    const createChatStore = (ticketId: string) => {
      return new ChatStore(ticketId);
    };

    return { createChatManager, createChatStore };
  }, [engineerProfile]);

  return (
    <ChatManagerContext.Provider value={contextValue}>
      {children}
    </ChatManagerContext.Provider>
  );
};

export const useChatManager = (): ChatManagerContextType => {
  const context = useContext(ChatManagerContext);
  if (!context) {
    throw new Error('useChatManager must be used within a ChatManagerProvider');
  }
  return context;
};