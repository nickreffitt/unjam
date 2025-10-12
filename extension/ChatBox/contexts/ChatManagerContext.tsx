import React, { createContext, useContext, useMemo } from 'react';
import { ChatManager } from '@common/features/ChatManager';
import { type ChatStore, ChatStoreSupabase, ChatChangesSupabase } from '@common/features/ChatManager/store';
import { useUserProfile } from '@extension/shared/UserProfileContext';
import { useSupabase } from '@extension/shared/contexts/SupabaseContext';
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
  const { customerProfile } = useUserProfile();
  const { supabaseClient } = useSupabase();

  // Create shared event emitter instance
  const chatEventEmitter = useMemo(() => {
    return new ChatEventEmitterLocal();
  }, []);

  // Create factory functions for chat manager and store instances
  const contextValue = useMemo(() => {
    const createChatStore = (ticketId: string) => {
      return new ChatStoreSupabase(ticketId, supabaseClient, chatEventEmitter);
    };

    const createChatChanges = (ticketId: string) => {
      return new ChatChangesSupabase(ticketId, supabaseClient, chatEventEmitter);
    };

    const createChatManager = (ticketId: string, receiverProfile: any) => {
      const chatStore = createChatStore(ticketId);
      const chatChanges = createChatChanges(ticketId);
      return new ChatManager(ticketId, customerProfile, receiverProfile, chatStore, chatChanges);
    };

    return { createChatManager, createChatStore };
  }, [customerProfile, supabaseClient, chatEventEmitter]);

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