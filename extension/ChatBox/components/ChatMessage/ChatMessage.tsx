import React from 'react';
import { User } from 'lucide-react';
import { type ChatMessage as ChatMessageType } from '@common/types';
import { linkify } from '@common/util';

interface ChatMessageProps {
  message: ChatMessageType;
  isSender: boolean;
  displayName: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isSender, displayName }) => {
  const formatTime = (date: Date) => {
    const d = new Date(date);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`unjam-flex ${isSender ? 'unjam-justify-end' : 'unjam-justify-start'}`}>
      <div className={`unjam-max-w-[280px] unjam-min-w-0 ${isSender ? 'unjam-order-2' : ''}`}>
        {/* Message bubble */}
        <div
          className={`
            unjam-rounded-2xl unjam-px-3 unjam-py-2 unjam-shadow-sm unjam-break-words
            ${isSender
              ? 'unjam-bg-blue-500 unjam-text-white unjam-rounded-br-sm unjam-message-bubble-sender'
              : 'unjam-bg-gray-100 unjam-text-gray-900 unjam-rounded-bl-sm unjam-message-bubble-receiver'
            }
          `}
        >
          {/* Name and time header */}
          <div className={`unjam-flex unjam-items-center unjam-gap-2 unjam-mb-1 ${
            isSender ? 'unjam-text-blue-100' : 'unjam-text-gray-600'
          } unjam-text-xs`}>
            <User size={12} />
            <span className="unjam-font-medium unjam-truncate">{displayName}</span>
            <span className="unjam-text-xs unjam-flex-shrink-0">{formatTime(message.createdAt)}</span>
          </div>

          {/* Message content */}
          <div className="unjam-text-sm unjam-leading-snug unjam-break-words unjam-overflow-wrap-anywhere">
            {linkify(message.content)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;