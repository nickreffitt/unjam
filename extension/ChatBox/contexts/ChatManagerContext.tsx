import React, { createContext, useContext, useMemo } from 'react';
import { ChatManager } from '@common/features/ChatManager';
import { ChatStore } from '@common/features/ChatManager/store';
import { useUserProfile } from '@extension/shared/UserProfileContext';
import { ChatEventEmitter } from '@common/features/ChatManager/events';

interface ChatManagerContextType {
  createChatManager: (ticketId: string, receiverProfile: any) => ChatManager;
  createChatStore: (ticketId: string) => ChatStore;
}

const ChatManagerContext = createContext<ChatManagerContextType | null>(null);

interface ChatManagerProviderProps {
  children: React.ReactNode;
}

export const ChatManagerProvider: React.FC<ChatManagerProviderProps> = ({ children }) => {
  const { customerProfile } = useUserProfile();

  // Create factory functions for chat manager and store instances
  const contextValue = useMemo(() => {
    const createChatStore = (ticketId: string) => {
      const eventEmitter = new ChatEventEmitter();
      return new ChatStore(ticketId, eventEmitter);
    };

    const createChatManager = (ticketId: string, receiverProfile: any) => {
      const chatStore = createChatStore(ticketId);
      return new ChatManager(ticketId, customerProfile, receiverProfile, chatStore);
    };

    return { createChatManager, createChatStore };
  }, [customerProfile]);

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