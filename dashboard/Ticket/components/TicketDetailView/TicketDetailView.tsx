import React from 'react';
import { type Ticket } from '@common/types';
import TicketNotFound from '@dashboard/Ticket/components/TicketNotFound/TicketNotFound';
import TicketHeader from '@dashboard/Ticket/components/TicketHeader/TicketHeader';
import TicketDetailsCard from '@dashboard/Ticket/components/TicketDetailsCard/TicketDetailsCard';
import ChatSection from '@dashboard/Ticket/components/ChatSection/ChatSection';
import TicketStatusBanner from '@dashboard/Ticket/components/TicketStatusBanner/TicketStatusBanner';

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
}

const TicketDetailView: React.FC<TicketDetailViewProps> = ({
  ticket,
  headerConfig,
  notFoundConfig,
  statusBanner,
  showAssignedTo = false,
  showEstimatedTime = false,
  chatActive = false
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
          <ChatSection
            isActive={chatActive}
            ticketStatus={ticket.status}
          />
        </div>
      </div>
    </div>
  );
};

export default TicketDetailView;