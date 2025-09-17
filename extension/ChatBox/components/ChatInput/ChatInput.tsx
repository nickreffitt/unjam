import React from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onKeyPress,
  placeholder = 'Type your message...',
  disabled = false,
}) => {
  return (
    <div className="unjam-flex unjam-items-center unjam-gap-3">
      <input
        data-testid="chat-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={onKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        className="
          unjam-flex-1
          unjam-px-4
          unjam-py-2
          unjam-bg-white
          unjam-border
          unjam-border-gray-300
          unjam-rounded
          unjam-text-gray-900
          unjam-text-sm
          placeholder:unjam-text-gray-400
          focus:unjam-outline-none
          focus:unjam-ring-1
          focus:unjam-ring-gray-400
          focus:unjam-border-gray-400
          disabled:unjam-bg-gray-100
          disabled:unjam-text-gray-500
        "
      />
      <button
        data-testid="chat-send-button"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="
          unjam-px-4
          unjam-py-2
          unjam-bg-gray-600
          unjam-text-white
          unjam-rounded
          hover:unjam-bg-gray-700
          disabled:unjam-bg-gray-300
          disabled:unjam-cursor-not-allowed
          unjam-transition-colors
          unjam-flex
          unjam-items-center
          unjam-justify-center
          unjam-text-sm
        "
        aria-label="Send message"
      >
        <Send size={20} />
      </button>
    </div>
  );
};

export default ChatInput;