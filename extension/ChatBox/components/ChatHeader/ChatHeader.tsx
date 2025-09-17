import React from 'react';
import { X, Star, MessageCircle } from 'lucide-react';

interface ChatHeaderProps {
  engineerName: string;
  rating: number;
  onClose?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ engineerName, rating, onClose }) => {
  return (
    <div data-testid="chat-header" className="unjam-p-4 unjam-flex unjam-items-center unjam-justify-between unjam-mb-0">
      <div className="unjam-flex unjam-items-center unjam-gap-2">
        <span className="unjam-text-lg">
          <MessageCircle size={18} />
        </span>
        <div className="unjam-flex unjam-items-center unjam-space-x-2">
          <span className="unjam-text-sm unjam-font-medium unjam-text-gray-700">
            {engineerName}
          </span>
          <div className="unjam-flex unjam-items-center unjam-space-x-1">
            <Star size={14} className="unjam-text-yellow-400 unjam-fill-current" />
            <span className="unjam-text-xs unjam-text-gray-600 unjam-font-medium">
              {rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="unjam-text-gray-400 hover:unjam-text-gray-600"
          aria-label="Close chat"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};

export default ChatHeader;