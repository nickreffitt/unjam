import React from 'react';

interface ChatSectionProps {
  isActive: boolean;
  ticketStatus?: string;
}

const ChatSection: React.FC<ChatSectionProps> = ({
  isActive,
  ticketStatus
}) => {
  const getPlaceholderText = () => {
    if (ticketStatus === 'completed' || ticketStatus === 'auto-completed') {
      return (
        <>
          Chat history for<br />
          completed ticket
        </>
      );
    }
    return (
      <>
        Chat functionality will be<br />
        implemented in a future phase
      </>
    );
  };

  const getFooterText = () => {
    if (ticketStatus === 'completed' || ticketStatus === 'auto-completed') {
      return 'Ticket completed - chat disabled';
    }
    return null;
  };

  return (
    <div className="unjam-bg-white unjam-rounded-lg unjam-shadow-sm unjam-border unjam-border-gray-200 unjam-p-6 unjam-h-full">
      <div className="unjam-flex unjam-items-center unjam-justify-between unjam-mb-4">
        <h2 className="unjam-text-lg unjam-font-semibold unjam-text-gray-900">Chat</h2>
        <div className="unjam-flex unjam-items-center unjam-text-green-600 unjam-text-sm">
          <span className="unjam-w-2 unjam-h-2 unjam-bg-green-400 unjam-rounded-full unjam-mr-2" />
          Notifications enabled
        </div>
      </div>
      
      <div className="unjam-flex-1 unjam-flex unjam-items-center unjam-justify-center unjam-h-64 unjam-bg-gray-50 unjam-rounded-lg unjam-mb-4">
        <p className="unjam-text-gray-500 unjam-text-center">
          {getPlaceholderText()}
        </p>
      </div>
      
      {isActive ? (
        <div className="unjam-flex">
          <input
            type="text"
            placeholder="Type your message..."
            className="unjam-flex-1 unjam-px-3 unjam-py-2 unjam-border unjam-border-gray-300 unjam-rounded-l-md focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-blue-500 focus:unjam-border-transparent"
            disabled
          />
          <button
            className="unjam-bg-blue-600 unjam-text-white unjam-px-4 unjam-py-2 unjam-rounded-r-md hover:unjam-bg-blue-700 unjam-transition-colors unjam-opacity-50"
            disabled
          >
            →
          </button>
        </div>
      ) : (
        getFooterText() && (
          <div className="unjam-text-center unjam-text-sm unjam-text-gray-500">
            {getFooterText()}
          </div>
        )
      )}
    </div>
  );
};

export default ChatSection;