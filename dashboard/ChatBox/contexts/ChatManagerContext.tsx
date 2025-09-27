import React, { createContext, useContext, useMemo } from 'react';
import { ChatManager } from '@common/features/ChatManager';
import { ChatStore } from '@common/features/ChatManager/store';
import { useUserProfile } from '@dashboard/shared/contexts/AuthManagerContext';
import { ChatEventEmitterLocal } from '@common/features/ChatManager/events';

interface ChatManagerContextType {
  createChatManager: (ticketId: string, receiverProfile: any) => ChatManager;
  createChatStore: (ticketId: string) => ChatStore;
}

const ChatManagerContext = createContext<ChatManagerContextType | null>(null);

interface ChatManagerProviderProps {
  children: React.ReactNode;
}

export const ChatManagerProvider: React.FC<ChatManagerProviderProps> = ({ children }) => {
  const { currentProfile } = useUserProfile();

  // Create factory functions for chat manager and store instances
  const contextValue = useMemo(() => {
    const createChatStore = (ticketId: string) => {
      const eventEmitter = new ChatEventEmitterLocal();
      return new ChatStore(ticketId, eventEmitter);
    };

    const createChatManager = (ticketId: string, receiverProfile: any) => {
      if (!currentProfile) {
        throw new Error('No user profile available for chat manager');
      }
      const chatStore = createChatStore(ticketId);
      return new ChatManager(ticketId, currentProfile, receiverProfile, chatStore);
    };

    return { createChatManager, createChatStore };
  }, [currentProfile]);

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