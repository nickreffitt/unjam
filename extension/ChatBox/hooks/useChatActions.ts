import { useState, useCallback, useRef } from 'react';
import { type ChatManager } from '@common/features/ChatManager';
import { useChatManager } from '@extension/ChatBox/contexts/ChatManagerContext';

export interface UseChatActionsReturn {
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: () => Promise<void>;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  handleInputChange: (value: string) => void;
  injectEngineerMessage: (content: string) => Promise<void>;
}

export const useChatActions = (
  ticketId: string,
  chatManager: ChatManager,
  refreshMessages: () => Promise<void>
): UseChatActionsReturn => {
  const [inputValue, setInputValue] = useState('');
  const { createChatStore } = useChatManager();

  // Use refs to access current values in stable callbacks (same pattern as dashboard)
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
        // Refresh messages to show the new message (same pattern as dashboard)
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

  const injectEngineerMessage = useCallback(async (content: string) => {
    if (!content || typeof content !== 'string') {
      console.error('injectEngineerMessage: Invalid content provided:', content);
      return;
    }

    try {
      // Create the message directly using ChatStore (same pattern as dashboard)
      const chatStore = createChatStoreRef.current(ticketIdRef.current);

      const testMessage = {
        id: `MSG-DEBUG-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        ticketId: ticketIdRef.current,
        sender: chatManagerRef.current.getReceiver(), // Engineer sends message (receiver is engineer in extension)
        receiver: chatManagerRef.current.getSender(), // Customer receives message (sender is customer in extension)
        content: content.trim(),
        createdAt: new Date(),
        isRead: false
      };

      // Add the test message to the ChatStore (same pattern as dashboard)
      chatStore.create(testMessage);
      console.debug('Created test engineer message via ChatStore:', testMessage);

      // Reload the ChatManager to sync with the new message in localStorage
      chatManagerRef.current.reload();

      // Directly refresh the current tab since storage events only work cross-tab
      await refreshMessagesRef.current();
    } catch (error) {
      console.error('Failed to inject engineer message:', error);
    }
  }, []);

  return {
    inputValue,
    setInputValue,
    handleSendMessage,
    handleKeyPress,
    handleInputChange,
    injectEngineerMessage
  };
};