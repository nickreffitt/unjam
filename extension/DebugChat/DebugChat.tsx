import React, { forwardRef, useImperativeHandle, useCallback } from 'react';
import { type UserProfile, type Ticket } from '@common/types';
import { useChatManager } from '@extension/ChatBox/contexts/ChatManagerContext';
import { type ChatBoxRef } from '@extension/ChatBox/ChatBox';

interface DebugChatProps {
  activeTicket: Ticket | null;
  chatBoxRef: React.RefObject<ChatBoxRef>;
  isChatVisible: boolean;
  onToggleChat: () => void;
  className?: string;
}

export interface DebugChatRef {
  // Could add methods here if needed in the future
}

const DebugChat = forwardRef<DebugChatRef, DebugChatProps>(({
  activeTicket,
  chatBoxRef,
  isChatVisible,
  onToggleChat,
  className = ''
}, ref) => {
  const { createChatStore } = useChatManager();

  // Expose functions via ref (if needed in the future)
  useImperativeHandle(ref, () => ({}), []);

  const generateRandomMessage = useCallback(() => {
    const words = [
      'thanks', 'for', 'helping', 'me', 'yes', 'that', 'fixed', 'it', 'no', 'still', 'broken',
      'I', 'see', 'the', 'issue', 'now', 'oh', 'okay', 'let', 'me', 'try', 'that',
      'working', 'on', 'it', 'hmm', 'interesting', 'perfect', 'great', 'awesome', 'nice',
      'understood', 'got', 'it', 'makes', 'sense', 'thank', 'you', 'so', 'much'
    ];

    try {
      const messageLength = Math.floor(Math.random() * 10) + 2; // 2 to 12 words
      const selectedWords = [];

      for (let i = 0; i < messageLength; i++) {
        const randomIndex = Math.floor(Math.random() * words.length);
        const selectedWord = words[randomIndex];
        if (selectedWord) {
          selectedWords.push(selectedWord);
        }
      }

      if (selectedWords.length === 0) {
        return 'Thanks for the help!';
      }

      return `${selectedWords.join(' ')}.`;
    } catch (error) {
      console.error('DebugChat: Error generating random message:', error);
      return 'Thanks for the help!';
    }
  }, []);

  const handleSendRandomEngineerMessage = useCallback(() => {
    const randomMessage = generateRandomMessage();
    console.debug('DebugChat: Generated engineer message:', randomMessage);

    if (randomMessage && typeof randomMessage === 'string' && chatBoxRef.current) {
      chatBoxRef.current.injectEngineerMessage(randomMessage);
    } else {
      console.error('DebugChat: Failed to generate valid message or chat not available');
    }
  }, [generateRandomMessage, chatBoxRef]);

  const handleTriggerEngineerTyping = useCallback(() => {
    if (activeTicket && activeTicket.assignedTo) {
      console.debug('DebugChat: Triggering engineer typing indicator for customer to see');
      const chatStore = createChatStore(activeTicket.id);
      chatStore.markIsTyping(activeTicket.assignedTo);

      // Also trigger same-tab UI update
      if (chatBoxRef.current) {
        chatBoxRef.current.triggerTypingIndicator(activeTicket.assignedTo);
      }
    } else {
      console.warn('DebugChat: No active ticket or assigned engineer for typing simulation');
    }
  }, [activeTicket, createChatStore, chatBoxRef]);

  // Don't render if there's no active ticket with an assigned engineer
  if (!activeTicket || !activeTicket.assignedTo) {
    return null;
  }

  return (
    <div data-testid="debug-chat" className={`unjam-w-120 unjam-bg-white unjam-rounded-lg unjam-shadow unjam-border unjam-border-gray-300 unjam-p-4 unjam-font-sans ${className}`}>
      <h3 className="unjam-font-semibold unjam-mb-3 unjam-text-indigo-800">Debug Controls</h3>

      <div className="unjam-space-y-3">
        <button
          onClick={onToggleChat}
          className={`unjam-block unjam-w-full unjam-text-sm unjam-px-3 unjam-py-2 unjam-rounded unjam-font-medium ${
            isChatVisible
              ? 'unjam-bg-red-200 hover:unjam-bg-red-300'
              : 'unjam-bg-teal-200 hover:unjam-bg-teal-300'
          }`}
        >
          {isChatVisible ? 'Hide Chat' : 'Show Chat'}
        </button>

        {isChatVisible && (
          <>
            <button
              onClick={handleSendRandomEngineerMessage}
              className="unjam-block unjam-w-full unjam-text-sm unjam-bg-indigo-200 hover:unjam-bg-indigo-300 unjam-px-3 unjam-py-2 unjam-rounded unjam-font-medium"
            >
              Send Random Engineer Message
            </button>

            <button
              onClick={handleTriggerEngineerTyping}
              className="unjam-block unjam-w-full unjam-text-sm unjam-bg-yellow-200 hover:unjam-bg-yellow-300 unjam-px-3 unjam-py-2 unjam-rounded unjam-font-medium"
            >
              Trigger Engineer Typing
            </button>
          </>
        )}
      </div>
    </div>
  );
});

DebugChat.displayName = 'DebugChat';

export default DebugChat;