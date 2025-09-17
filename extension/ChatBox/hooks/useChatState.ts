import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { type ChatMessage as ChatMessageType, type UserProfile } from '@common/types';
import { type ChatManager } from '@common/features/ChatManager';
import { useChatListener } from '@common/features/ChatManager/hooks';
import { useChatManager } from '@extension/ChatBox/contexts/ChatManagerContext';

export interface UseChatStateReturn {
  messages: ChatMessageType[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessageType[]>>;
  chatManager: ChatManager;
  scrollToBottom: () => void;
  refreshMessages: () => Promise<void>;
}

export const useChatState = (
  ticketId: string,
  receiverProfile: UserProfile,
  messagesEndRef: React.RefObject<HTMLDivElement>
): UseChatStateReturn => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const { createChatManager } = useChatManager();

  // Create ChatManager instance for this ticket (only once)
  const chatManagerRef = useRef<ChatManager | null>(null);
  if (!chatManagerRef.current) {
    chatManagerRef.current = createChatManager(ticketId, receiverProfile);
  }
  const chatManager = chatManagerRef.current;

  // Use refs to store values to avoid useCallback recreation cycles (same pattern as dashboard)
  const ticketIdRef = useRef(ticketId);
  const setMessagesRef = useRef(setMessages);
  const messagesEndRefRef = useRef(messagesEndRef);

  // Update refs on every render to keep them current
  ticketIdRef.current = ticketId;
  setMessagesRef.current = setMessages;
  messagesEndRefRef.current = messagesEndRef;

  // Refresh messages function (similar to dashboard pattern)
  const refreshMessages = useCallback(async () => {
    console.debug('extension useChatState: refreshMessages called for ticket', ticketIdRef.current);
    try {
      const recentMessages = await chatManagerRef.current.getRecent(50);
      setMessagesRef.current(recentMessages);
    } catch (error) {
      console.error('Failed to refresh chat messages:', error);
      setMessagesRef.current([]);
    }
  }, []); // Empty dependency array - stable callback like dashboard

  // Load messages on mount
  useEffect(() => {
    console.debug('extension useChatState: Initial load useEffect triggered for ticket:', ticketId);
    refreshMessages();
  }, [refreshMessages]);

  // Create stable callback functions to prevent ChatListener recreation (same pattern as dashboard)
  const handleChatMessageSent = useCallback((message: ChatMessageType) => {
    console.debug('extension useChatState: Received chat message for ticket', message.ticketId, 'current ticket', ticketIdRef.current);
    // Only update if it's for this ticket
    if (message.ticketId === ticketIdRef.current) {
      setMessagesRef.current(prev => {
        // Avoid duplicates by checking if message already exists
        if (prev.some(m => m.id === message.id)) {
          console.debug('extension useChatState: Message already exists, skipping', message.id);
          return prev;
        }
        console.debug('extension useChatState: Adding new message', message.id);
        return [...prev, message];
      });
    }
  }, []); // Empty dependency array - stable callback like dashboard

  const handleChatReloaded = useCallback((reloadedTicketId: string) => {
    console.debug('extension useChatState: Chat reloaded for ticket', reloadedTicketId);
    // Reload messages if this ticket was reloaded
    if (reloadedTicketId === ticketIdRef.current) {
      refreshMessages();
    }
  }, []); // Empty dependency array - stable callback like dashboard

  // Memoize the callbacks object to prevent ChatListener recreation
  const chatListenerCallbacks = useMemo(() => ({
    onChatMessageSent: handleChatMessageSent,
    onChatReloaded: handleChatReloaded
  }), [handleChatMessageSent, handleChatReloaded]);

  // Listen for real-time chat events with stable callbacks
  useChatListener(chatListenerCallbacks);

  const scrollToBottom = useCallback(() => {
    messagesEndRefRef.current.current?.scrollIntoView({ behavior: 'smooth' });
  }, []); // Empty dependency array - stable callback like dashboard

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return {
    messages,
    setMessages,
    chatManager,
    scrollToBottom,
    refreshMessages
  };
};