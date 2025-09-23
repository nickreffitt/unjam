import React, { useRef } from 'react';
import UnjamButton from '@extension/Ticket/components/UnjamButton/UnjamButton';
import TicketBox from '@extension/Ticket/components/TicketBox/TicketBox';
import TicketModal from '@extension/Ticket/components/TicketModal/TicketModal';
import ChatBox, { type ChatBoxRef } from '@extension/ChatBox/ChatBox';
import DebugChat, { type DebugChatRef } from '@extension/DebugChat/DebugChat';
import DebugTicket, { type DebugTicketRef } from '@extension/DebugTicket/DebugTicket';
import { useUserProfile } from '@extension/shared/UserProfileContext';
import { useTicketState } from '@extension/Ticket/hooks';
import '@extension/styles.css';

const CustomerExtension: React.FC = () => {
  const chatBoxRef = useRef<ChatBoxRef>(null);
  const debugChatRef = useRef<DebugChatRef>(null);
  const debugTicketRef = useRef<DebugTicketRef>(null);

  // Get customer profile from context
  const { customerProfile } = useUserProfile();

  // Use dedicated hooks for state and actions (following consistent pattern)
  const {
    activeTicket,
    isChatVisible,
    setIsChatVisible,
    isTicketVisible,
    setIsTicketVisible,
    isModalOpen,
    setIsModalOpen,
    handleCreateNewTicketClick,
    getButtonText
  } = useTicketState();


  return (
    <div className="unjam-min-h-screen unjam-bg-gray-100 unjam-flex unjam-items-center unjam-justify-center unjam-font-sans">
      <div className="unjam-text-center">
        <h1 className="unjam-text-3xl unjam-font-bold unjam-text-gray-800 unjam-mb-8">
          Customer Support
        </h1>
        
        <UnjamButton
          onClick={handleCreateNewTicketClick}
          text={getButtonText()}
        />

        {/* Debug Ticket component for testing different ticket states */}
        {process.env.NODE_ENV === 'development' && activeTicket && (
          <div className="unjam-mt-4">
            <DebugTicket ref={debugTicketRef} />
          </div>
        )}

        {/* Debug Chat component for testing engineer chat behavior */}
        {process.env.NODE_ENV === 'development' && activeTicket && (
          <div className="unjam-mt-4">
            <DebugChat
              ref={debugChatRef}
              activeTicket={activeTicket}
              chatBoxRef={chatBoxRef}
              isChatVisible={isChatVisible}
              onToggleChat={() => setIsChatVisible(!isChatVisible)}
            />
          </div>
        )}

      </div>

      <TicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customerProfile={customerProfile}
      />

      {/* Stacked container for ChatBox and TicketBox */}
      <div className="unjam-fixed unjam-bottom-4 unjam-right-4 unjam-flex unjam-flex-col unjam-gap-4">
        {isChatVisible && activeTicket && activeTicket.status === 'in-progress' && activeTicket.assignedTo && (
          <ChatBox
            ref={chatBoxRef}
            ticketId={activeTicket.id}
            engineerName={activeTicket.assignedTo.name}
            engineerProfile={activeTicket.assignedTo}
            onClose={() => setIsChatVisible(false)}
          />
        )}

        {activeTicket && isTicketVisible && (
          <TicketBox
            ticket={activeTicket}
            onHide={() => setIsTicketVisible(false)}
            isChatVisible={isChatVisible}
            onToggleChat={() => setIsChatVisible(!isChatVisible)}
          />
        )}
      </div>
    </div>
  );
};

export default CustomerExtension;