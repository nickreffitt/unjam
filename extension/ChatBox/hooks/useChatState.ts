import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { type ChatMessage as ChatMessageType, type UserProfile } from '@common/types';
import { type ChatManager } from '@common/features/ChatManager';
import { useChatListener } from '@common/features/ChatManager/hooks';
import { useChatManager } from '@extension/ChatBox/contexts/ChatManagerContext';
import { soundPlayer } from '@common/util';

export interface UseChatStateReturn {
  messages: ChatMessageType[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessageType[]>>;
  chatManager: ChatManager;
  scrollToBottom: () => void;
  refreshMessages: () => Promise<void>;
  isTyping: boolean;
  typingUser: UserProfile | null;
  triggerTypingIndicator: (user: UserProfile) => void;
}

export const useChatState = (
  ticketId: string,
  receiverProfile: UserProfile,
  messagesEndRef: React.RefObject<HTMLDivElement>
): UseChatStateReturn => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<UserProfile | null>(null);
  const typingExpiryRef = useRef<Date | null>(null); // Smart expiry: updates with each typing event
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
  const refreshMessagesRef = useRef<() => Promise<void>>(null as any);

  // Update refs on every render to keep them current
  ticketIdRef.current = ticketId;
  setMessagesRef.current = setMessages;
  messagesEndRefRef.current = messagesEndRef;

  // Refresh messages function (similar to dashboard pattern)
  const refreshMessages = useCallback(async () => {
    console.debug('extension useChatState: refreshMessages called for ticket', ticketIdRef.current);
    try {
      const recentMessages = await chatManagerRef.current?.getRecent(50);
      setMessagesRef.current(recentMessages || []);
    } catch (error) {
      console.error('Failed to refresh chat messages:', error);
      setMessagesRef.current([]);
    }
  }, []); // Empty dependency array - stable callback like dashboard

  // Update refreshMessagesRef
  refreshMessagesRef.current = refreshMessages;

  // Load messages on mount
  useEffect(() => {
    console.debug('extension useChatState: Initial load useEffect triggered for ticket:', ticketId);
    refreshMessages();
  }, [refreshMessages]);

  // Create stable callback functions to prevent ChatListener recreation (same pattern as dashboard)
  const handleChatMessageReceived = useCallback((message: ChatMessageType) => {
    console.debug('extension useChatState: Received chat message for ticket', message.ticketId, 'current ticket', ticketIdRef.current);
    // Only update if it's for this ticket
    if (message.ticketId === ticketIdRef.current && message.sender.type === 'engineer') {
      soundPlayer.playNotification().catch(error => {
        console.warn('Failed to play notification sound:', error);
      });

      // Hide typing indicator when message is received
      setIsTyping(false);
      setTypingUser(null);
      typingExpiryRef.current = null; // Clear expiry time
      // Reload from storage to sync with other tabs, then refresh
      chatManagerRef.current?.reload();
      refreshMessagesRef.current();
    }
  }, []); // Empty dependency array - stable callback like dashboard

  const handleChatReloaded = useCallback((reloadedTicketId: string) => {
    console.debug('extension useChatState: Chat reloaded for ticket', reloadedTicketId);
    // Reload messages if this ticket was reloaded
    if (reloadedTicketId === ticketIdRef.current) {
      // Reload from storage to sync with other tabs, then refresh
      chatManagerRef.current?.reload();
      refreshMessages();
    }
  }, []); // Empty dependency array - stable callback like dashboard

  const handleChatReceiverIsTyping = useCallback((ticketId: string, user: UserProfile) => {
    console.debug('extension useChatState: Received typing event for ticket', ticketId, 'user', user.name);
    // Only show typing indicator for this ticket and if user is an engineer (extension shows engineer typing)
    if (ticketId === ticketIdRef.current && user.type === 'engineer') {
      setIsTyping(true);
      setTypingUser(user);
      // Set expiry time to 6 seconds from now (1 second longer than throttle interval)
      typingExpiryRef.current = new Date(Date.now() + 6000);
      // Scroll to show the typing indicator
      setTimeout(() => {
        messagesEndRefRef.current.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100); // Small delay to allow DOM update
    }
  }, []); // Empty dependency array - stable callback

  // Memoize the callbacks object to prevent ChatListener recreation
  const chatListenerCallbacks = useMemo(() => ({
    onChatMessageReceived: handleChatMessageReceived,
    onChatReloaded: handleChatReloaded,
    onChatReceiverIsTyping: handleChatReceiverIsTyping
  }), []); // Empty dependency array - callbacks are stable with refs

  // Listen for real-time chat events with stable callbacks
  useChatListener(chatListenerCallbacks);

  const scrollToBottom = useCallback(() => {
    messagesEndRefRef.current.current?.scrollIntoView({ behavior: 'smooth' });
  }, []); // Empty dependency array - stable callback like dashboard

  // Check typing expiry every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (typingExpiryRef.current && new Date() > typingExpiryRef.current) {
        console.debug('extension useChatState: Typing indicator expired, hiding');
        setIsTyping(false);
        setTypingUser(null);
        typingExpiryRef.current = null;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Function to manually trigger typing indicator (for same-tab updates)
  const triggerTypingIndicator = useCallback((user: UserProfile) => {
    console.debug('extension useChatState: Manually triggering typing indicator for user', user.name);
    // Only show typing indicator if user is an engineer (extension shows engineer typing)
    if (user.type === 'engineer') {
      setIsTyping(true);
      setTypingUser(user);
      // Set expiry time to 6 seconds from now (1 second longer than throttle interval)
      typingExpiryRef.current = new Date(Date.now() + 6000);
      // Scroll to show the typing indicator
      setTimeout(() => {
        messagesEndRefRef.current.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100); // Small delay to allow DOM update
    }
  }, []); // Empty dependency array - stable callback

  return {
    messages,
    setMessages,
    chatManager,
    scrollToBottom,
    refreshMessages,
    isTyping,
    typingUser,
    triggerTypingIndicator
  };
};