import React, { createContext, useContext, useMemo } from 'react';
import { ChatManager } from '@common/features/ChatManager';
import { type ChatStore, type ChatChanges, ChatStoreSupabase, ChatChangesSupabase } from '@common/features/ChatManager/store';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import { useSupabase } from '@dashboard/shared/contexts/SupabaseContext';
import { ChatEventEmitterLocal } from '@common/features/ChatManager/events';
import { type UserProfile } from '@common/types';
interface ChatManagerContextType {
  createChatManager: (ticketId: string, receiverProfile: any) => ChatManager;
  createChatStore: (ticketId: string) => ChatStore;
  userProfile: UserProfile;
}

const ChatManagerContext = createContext<ChatManagerContextType | null>(null);

interface ChatManagerProviderProps {
  children: React.ReactNode;
}

export const ChatManagerProvider: React.FC<ChatManagerProviderProps> = ({ children }) => {
  const { authUser } = useAuthState();
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
      if (!authUser.profile) {
        throw new Error('No user profile available for chat manager');
      }
      const chatStore = createChatStore(ticketId);
      const chatChanges = createChatChanges(ticketId);
      return new ChatManager(ticketId, authUser.profile, receiverProfile, chatStore, chatChanges);
    };

    if (!authUser.profile) {
      throw new Error('No user profile available for chat manager');
    }
    const userProfile = authUser.profile;

    return { createChatManager, createChatStore, userProfile };
  }, [authUser, supabaseClient, chatEventEmitter]);

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