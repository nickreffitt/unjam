import { useState, useCallback, useRef } from 'react';
import { type ChatManager } from '@common/features/ChatManager';
import { useChatManager } from '@dashboard/ChatBox/contexts/ChatManagerContext';

export interface UseChatActionsReturn {
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: () => Promise<void>;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  injectCustomerMessage: (content: string) => Promise<void>;
}

export const useChatActions = (
  ticketId: string,
  chatManager: ChatManager,
  refreshMessages: () => Promise<void>
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

  const injectCustomerMessage = useCallback(async (content: string) => {
    if (!content || typeof content !== 'string') {
      console.error('injectCustomerMessage: Invalid content provided:', content);
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

  return {
    inputValue,
    setInputValue,
    handleSendMessage,
    handleKeyPress,
    injectCustomerMessage
  };
};