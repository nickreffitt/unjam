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
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={onKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        className="
          unjam-flex-1
          unjam-px-4
          unjam-py-3
          unjam-bg-gray-50
          unjam-border
          unjam-border-gray-300
          unjam-rounded-lg
          unjam-text-gray-900
          unjam-text-sm
          placeholder:unjam-text-gray-400
          focus:unjam-outline-none
          focus:unjam-ring-2
          focus:unjam-ring-blue-500
          focus:unjam-border-transparent
          disabled:unjam-bg-gray-100
          disabled:unjam-text-gray-500
        "
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="
          unjam-p-3
          unjam-bg-blue-500
          unjam-text-white
          unjam-rounded-lg
          hover:unjam-bg-blue-600
          disabled:unjam-bg-gray-300
          disabled:unjam-cursor-not-allowed
          unjam-transition-colors
          unjam-flex
          unjam-items-center
          unjam-justify-center
        "
        aria-label="Send message"
      >
        <Send size={20} />
      </button>
    </div>
  );
};

export default ChatInput;