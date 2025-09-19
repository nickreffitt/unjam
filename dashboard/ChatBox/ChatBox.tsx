import { useRef, forwardRef, useImperativeHandle } from 'react';
import { type UserProfile } from '@common/types';
import ChatMessage from '@dashboard/ChatBox/components/ChatMessage/ChatMessage';
import ChatInput from '@dashboard/ChatBox/components/ChatInput/ChatInput';
import TypingIndicator from '@dashboard/ChatBox/components/TypingIndicator/TypingIndicator';
import { useChatState } from '@dashboard/ChatBox/hooks/useChatState';
import { useChatActions } from '@dashboard/ChatBox/hooks/useChatActions';

interface ChatBoxProps {
  ticketId: string;
  receiverName: string;
  receiverProfile: UserProfile;
  className?: string;
}

export interface ChatBoxRef {
  simulateCustomerMessage: (content: string) => void;
  refreshMessages: () => Promise<void>;
  triggerTypingIndicator: (user: UserProfile) => void;
}

const ChatBox = forwardRef<ChatBoxRef, ChatBoxProps>(({ ticketId, receiverName, receiverProfile, className = '' }, ref) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use custom hooks for state and actions
  const { messages, chatManager, refreshMessages, isTyping, typingUser, setIsTyping, setTypingUser, typingExpiryRef } = useChatState(ticketId, receiverProfile, messagesEndRef);
  const { inputValue, handleSendMessage, handleKeyPress, handleInputChange, simulateCustomerMessage, triggerTypingIndicator } = useChatActions(ticketId, chatManager, refreshMessages, setIsTyping, setTypingUser, typingExpiryRef, messagesEndRef);

  // Expose functions via ref
  useImperativeHandle(ref, () => ({
    simulateCustomerMessage,
    refreshMessages,
    triggerTypingIndicator
  }), [simulateCustomerMessage, refreshMessages, triggerTypingIndicator]);

  return (
    <div className={`unjam-flex unjam-flex-col unjam-h-full unjam-bg-white unjam-rounded-lg unjam-shadow-sm unjam-border unjam-border-gray-200 ${className}`}>
      {/* Chat Header */}
      <div className="unjam-px-6 unjam-py-4 unjam-border-b unjam-border-gray-200">
        <h2 className="unjam-text-xl unjam-font-semibold unjam-text-gray-900">Chat</h2>
      </div>

      {/* Messages Container */}
      <div className="unjam-flex-1 unjam-overflow-y-auto unjam-px-6 unjam-py-4 unjam-space-y-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isSender={message.sender.type === 'engineer'}
            displayName={message.sender.type === 'engineer' ? 'You' : receiverName}
          />
        ))}
        {/* Typing Indicator */}
        {isTyping && typingUser && (
          <TypingIndicator user={typingUser} />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="unjam-px-6 unjam-py-4 unjam-border-t unjam-border-gray-200">
        <ChatInput
          value={inputValue}
          onChange={handleInputChange}
          onSend={handleSendMessage}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
        />
      </div>
    </div>
  );
});

ChatBox.displayName = 'ChatBox';

export default ChatBox;