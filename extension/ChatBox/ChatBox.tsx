import { useRef, forwardRef, useImperativeHandle } from 'react';
import { type UserProfile } from '@common/types';
import ChatHeader from '@extension/ChatBox/components/ChatHeader/ChatHeader';
import ChatMessage from '@extension/ChatBox/components/ChatMessage/ChatMessage';
import ChatInput from '@extension/ChatBox/components/ChatInput/ChatInput';
import TypingIndicator from '@extension/ChatBox/components/TypingIndicator/TypingIndicator';
import { useChatState } from '@extension/ChatBox/hooks/useChatState';
import { useChatActions } from '@extension/ChatBox/hooks/useChatActions';

interface ChatBoxProps {
  ticketId: string;
  engineerName: string;
  engineerProfile: UserProfile;
  onClose?: () => void;
  className?: string;
}

export interface ChatBoxRef {
  injectEngineerMessage: (content: string) => void;
  refreshMessages: () => Promise<void>;
  triggerTypingIndicator: (user: UserProfile) => void;
}

const ChatBox = forwardRef<ChatBoxRef, ChatBoxProps>(({ ticketId, engineerName, engineerProfile, onClose, className = '' }, ref) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use custom hooks for state and actions (same pattern as dashboard)
  const { messages, chatManager, refreshMessages, isTyping, typingUser, triggerTypingIndicator } = useChatState(ticketId, engineerProfile, messagesEndRef);
  const { inputValue, handleSendMessage, handleKeyPress, handleInputChange, injectEngineerMessage } = useChatActions(ticketId, chatManager, refreshMessages);

  // Expose functions via ref (same pattern as dashboard)
  useImperativeHandle(ref, () => ({
    injectEngineerMessage,
    refreshMessages,
    triggerTypingIndicator
  }), [injectEngineerMessage, refreshMessages, triggerTypingIndicator]);

  // Mock rating for now - this could be moved to a separate hook later
  const rating = 5.0;

  return (
    <div data-testid="chat-box" className={`unjam-w-120 unjam-h-[450px] unjam-bg-white unjam-rounded-lg unjam-shadow-lg unjam-border unjam-border-gray-400 unjam-bg-blue-50 unjam-flex unjam-flex-col unjam-z-50 unjam-font-sans ${className}`}>
      {/* Chat Header */}
      <ChatHeader
        engineerName={engineerName}
        rating={rating}
        onClose={onClose}
      />

      {/* Messages Container */}
      <div className="unjam-flex-1 unjam-overflow-y-auto unjam-px-4 unjam-py-2 unjam-space-y-3">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isSender={message.sender.type === 'customer'}
            displayName={message.sender.type === 'customer' ? 'You' : engineerName}
          />
        ))}
        {/* Typing Indicator */}
        {isTyping && typingUser && (
          <TypingIndicator user={typingUser} />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="unjam-p-4">
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