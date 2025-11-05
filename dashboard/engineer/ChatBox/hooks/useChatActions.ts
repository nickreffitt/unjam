import { useState, useCallback, useRef } from 'react';
import { type ChatManager } from '@common/features/ChatManager';
import { type UserProfile } from '@common/types';
import { useChatManager } from '@dashboard/engineer/ChatBox/contexts/ChatManagerContext';

export interface UseChatActionsReturn {
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: () => Promise<void>;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  handleInputChange: (value: string) => void;
  simulateCustomerMessage: (content: string) => Promise<void>;
  triggerTypingIndicator: (user: UserProfile) => void;
}

export const useChatActions = (
  ticketId: string,
  chatManager: ChatManager,
  refreshMessages: () => Promise<void>,
  setIsTyping: (typing: boolean) => void,
  setTypingUser: (user: UserProfile | null) => void,
  typingExpiryRef: React.MutableRefObject<Date | null>,
  messagesEndRef: React.RefObject<HTMLDivElement>
): UseChatActionsReturn => {
  const [inputValue, setInputValue] = useState('');
  const { createChatStore } = useChatManager();

  // Use refs to access current values in stable callbacks
  const ticketIdRef = useRef(ticketId);
  const chatManagerRef = useRef(chatManager);
  const refreshMessagesRef = useRef(refreshMessages);
  const createChatStoreRef = useRef(createChatStore);

  // Update refs on every render
  ticketIdRef.current = ticketId;
  chatManagerRef.current = chatManager;
  refreshMessagesRef.current = refreshMessages;
  createChatStoreRef.current = createChatStore;

  const handleSendMessage = useCallback(async () => {
    if (inputValue.trim()) {
      try {
        await chatManagerRef.current.send(inputValue.trim());
        setInputValue('');
        // Reload the ChatManager to sync with localStorage (same as we do for test messages)
        chatManagerRef.current.reload();
        // Refresh messages to show the new message (similar to refreshTickets)
        // Since storage events only work cross-tab, we need to manually refresh
        await refreshMessagesRef.current();
      } catch (error) {
        console.error('Failed to send message:', error);
        // Keep the input value so user can retry
      }
    }
  }, [inputValue]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    // Trigger typing indicator when user types (throttled to once every 5 seconds)
    if (value.trim().length > 0) {
      chatManagerRef.current.markIsTyping();
    }
  }, []);

  const simulateCustomerMessage = useCallback(async (content: string) => {
    if (!content || typeof content !== 'string') {
      console.error('simulateCustomerMessage: Invalid content provided:', content);
      return;
    }

    try {
      // Create the message directly using ChatStore like createTestTicket uses ticketStore
      const chatStore = createChatStoreRef.current(ticketIdRef.current);

      const testMessage = {
        id: `MSG-DEBUG-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        ticketId: ticketIdRef.current,
        sender: chatManagerRef.current.getReceiver(), // Customer sends message
        receiver: chatManagerRef.current.getSender(), // Engineer receives message
        content: content.trim(),
        createdAt: new Date(),
        isRead: false
      };

      // Add the test message to the ChatStore (same pattern as ticketStore.create)
      chatStore.create(testMessage);
      console.debug('Created test message via ChatStore:', testMessage);

      // Reload the ChatManager to sync with the new message in localStorage
      // This is needed because we created a new ChatStore instance above
      chatManagerRef.current.reload();

      // Directly refresh the current tab since storage events only work cross-tab
      await refreshMessagesRef.current();
    } catch (error) {
      console.error('Failed to inject customer message:', error);
    }
  }, []);

  // Function to manually trigger typing indicator (for same-tab updates)
  const triggerTypingIndicator = useCallback((user: UserProfile) => {
    console.debug('dashboard useChatActions: Manually triggering typing indicator for user', user.name);
    // Only show typing indicator if user is a customer (dashboard shows customer typing)
    if (user.type === 'customer') {
      setIsTyping(true);
      setTypingUser(user);
      // Set expiry time to 6 seconds from now (1 second longer than throttle interval)
      typingExpiryRef.current = new Date(Date.now() + 6000);
      // Scroll to show the typing indicator
      setTimeout(() => {
        const messagesContainer = messagesEndRef.current?.parentElement;
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100); // Small delay to allow DOM update
    }
  }, [setIsTyping, setTypingUser, typingExpiryRef, messagesEndRef]);

  return {
    inputValue,
    setInputValue,
    handleSendMessage,
    handleKeyPress,
    handleInputChange,
    simulateCustomerMessage,
    triggerTypingIndicator
  };
};