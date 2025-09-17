import { useRef, forwardRef, useImperativeHandle } from 'react';
import { type UserProfile } from '@common/types';
import ChatMessage from '@dashboard/ChatBox/components/ChatMessage/ChatMessage';
import ChatInput from '@dashboard/ChatBox/components/ChatInput/ChatInput';
import { useChatState } from '@dashboard/ChatBox/hooks/useChatState';
import { useChatActions } from '@dashboard/ChatBox/hooks/useChatActions';

interface ChatBoxProps {
  ticketId: string;
  receiverName: string;
  receiverProfile: UserProfile;
  className?: string;
}

export interface ChatBoxRef {
  injectCustomerMessage: (content: string) => void;
  refreshMessages: () => Promise<void>;
}

const ChatBox = forwardRef<ChatBoxRef, ChatBoxProps>(({ ticketId, receiverName, receiverProfile, className = '' }, ref) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use custom hooks for state and actions
  const { messages, chatManager, refreshMessages } = useChatState(ticketId, receiverProfile, messagesEndRef);
  const { inputValue, setInputValue, handleSendMessage, handleKeyPress, injectCustomerMessage } = useChatActions(ticketId, chatManager, refreshMessages);

  // Expose functions via ref
  useImperativeHandle(ref, () => ({
    injectCustomerMessage,
    refreshMessages
  }), [injectCustomerMessage, refreshMessages]);

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
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="unjam-px-6 unjam-py-4 unjam-border-t unjam-border-gray-200">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
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