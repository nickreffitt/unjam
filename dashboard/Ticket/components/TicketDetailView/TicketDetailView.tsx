import React from 'react';
import { type Ticket } from '@common/types';
import TicketNotFound from '@dashboard/Ticket/components/TicketNotFound/TicketNotFound';
import TicketHeader from '@dashboard/Ticket/components/TicketHeader/TicketHeader';
import TicketDetailsCard from '@dashboard/Ticket/components/TicketDetailsCard/TicketDetailsCard';
import TicketStatusBanner from '@dashboard/Ticket/components/TicketStatusBanner/TicketStatusBanner';
import ChatBox, { type ChatBoxRef } from '@dashboard/ChatBox/ChatBox';
import { ChatManagerProvider } from '@dashboard/ChatBox/contexts/ChatManagerContext';

interface NotFoundConfig {
  title?: string;
  message?: string;
  redirectPath: string;
  redirectLabel: string;
  emoji?: string;
}

interface HeaderConfig {
  statusDisplay: string;
  actions?: React.ReactNode;
}

interface StatusBannerConfig {
  icon: string;
  message: string;
  bgColor: string;
  textColor: string;
}

interface TicketDetailViewProps {
  ticket: Ticket | null;
  loading?: boolean;
  headerConfig: HeaderConfig;
  notFoundConfig: NotFoundConfig;
  statusBanner?: StatusBannerConfig;
  showAssignedTo?: boolean;
  showEstimatedTime?: boolean;
  chatActive?: boolean;
  chatBoxRef?: React.RefObject<ChatBoxRef>;
}

const TicketDetailView: React.FC<TicketDetailViewProps> = ({
  ticket,
  headerConfig,
  notFoundConfig,
  statusBanner,
  showAssignedTo = false,
  showEstimatedTime = false,
  chatActive = false,
  chatBoxRef
}) => {
  if (!ticket) {
    return (
      <TicketNotFound
        title={notFoundConfig.title}
        message={notFoundConfig.message}
        redirectPath={notFoundConfig.redirectPath}
        redirectLabel={notFoundConfig.redirectLabel}
        emoji={notFoundConfig.emoji}
      />
    );
  }

  return (
    <div className="unjam-p-8 unjam-max-w-6xl unjam-mx-auto">
      <TicketHeader
        ticket={ticket}
        statusDisplay={headerConfig.statusDisplay}
        actions={headerConfig.actions}
      />

      {statusBanner && (
        <TicketStatusBanner
          icon={statusBanner.icon}
          message={statusBanner.message}
          bgColor={statusBanner.bgColor}
          textColor={statusBanner.textColor}
        />
      )}

      <div className="unjam-grid unjam-grid-cols-1 lg:unjam-grid-cols-3 unjam-gap-6">
        {/* Ticket Details */}
        <div className="lg:unjam-col-span-2">
          <TicketDetailsCard
            ticket={ticket}
            showAssignedTo={showAssignedTo}
            showEstimatedTime={showEstimatedTime}
          />
        </div>

        {/* Chat Section */}
        <div className="lg:unjam-col-span-1">
          {chatActive && ticket.createdBy && (
            <ChatManagerProvider>
              <div className="unjam-h-[600px]">
                <ChatBox
                  ref={chatBoxRef}
                  ticketId={ticket.id}
                  receiverName={ticket.createdBy.name || 'Customer'}
                  receiverProfile={ticket.createdBy}
                />
              </div>
            </ChatManagerProvider>
          )}
          {!chatActive && (
            <div className="unjam-bg-white unjam-rounded-lg unjam-shadow-sm unjam-border unjam-border-gray-200 unjam-p-6 unjam-h-full">
              <div className="unjam-flex unjam-items-center unjam-justify-between unjam-mb-4">
                <h2 className="unjam-text-lg unjam-font-semibold unjam-text-gray-900">Chat</h2>
              </div>
              <div className="unjam-flex-1 unjam-flex unjam-items-center unjam-justify-center unjam-h-64 unjam-bg-gray-50 unjam-rounded-lg">
                <p className="unjam-text-gray-500 unjam-text-center">
                  {ticket.status === 'completed' || ticket.status === 'auto-completed' ? (
                    <>
                      Chat history for<br />
                      completed ticket
                    </>
                  ) : (
                    <>
                      Chat not available for<br />
                      this ticket status
                    </>
                  )}
                </p>
              </div>
              {(ticket.status === 'completed' || ticket.status === 'auto-completed') && (
                <div className="unjam-text-center unjam-text-sm unjam-text-gray-500 unjam-mt-4">
                  Ticket completed - chat disabled
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetailView;