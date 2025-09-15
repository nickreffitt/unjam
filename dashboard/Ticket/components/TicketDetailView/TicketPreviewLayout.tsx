import React from 'react';
import { type Ticket } from '@common/types';
import { formatDate } from '@dashboard/shared/utils/ticketFormatters';
import TicketNotFound from '@dashboard/Ticket/components/TicketNotFound/TicketNotFound';
import TicketHeader from '@dashboard/Ticket/components/TicketHeader/TicketHeader';

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

interface TicketPreviewLayoutProps {
  ticket: Ticket | null;
  headerConfig: HeaderConfig;
  notFoundConfig: NotFoundConfig;
}

const TicketPreviewLayout: React.FC<TicketPreviewLayoutProps> = ({
  ticket,
  headerConfig,
  notFoundConfig
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
    <div className="unjam-p-8 unjam-max-w-4xl unjam-mx-auto">
      <TicketHeader
        ticket={ticket}
        statusDisplay={headerConfig.statusDisplay}
        actions={headerConfig.actions}
      />

      <div className="unjam-bg-white unjam-rounded-lg unjam-shadow-sm unjam-border unjam-border-gray-200 unjam-p-8">
        <h2 className="unjam-text-xl unjam-font-semibold unjam-text-gray-900 unjam-mb-6">Ticket Details</h2>
        
        <div className="unjam-grid unjam-grid-cols-1 md:unjam-grid-cols-3 unjam-gap-8 unjam-mb-8">
          <div>
            <h3 className="unjam-text-sm unjam-font-medium unjam-text-gray-500 unjam-uppercase unjam-tracking-wide unjam-mb-2">Ticket ID</h3>
            <p className="unjam-text-gray-900 unjam-font-mono unjam-break-all">{ticket.id}</p>
          </div>
          
          <div>
            <h3 className="unjam-text-sm unjam-font-medium unjam-text-gray-500 unjam-uppercase unjam-tracking-wide unjam-mb-2">Status</h3>
            <span className="unjam-inline-flex unjam-items-center unjam-px-2 unjam-py-1 unjam-rounded-full unjam-text-sm unjam-font-medium unjam-bg-orange-100 unjam-text-orange-800">
              <span className="unjam-w-2 unjam-h-2 unjam-bg-orange-400 unjam-rounded-full unjam-mr-2" />
              waiting
            </span>
          </div>
          
          <div>
            <h3 className="unjam-text-sm unjam-font-medium unjam-text-gray-500 unjam-uppercase unjam-tracking-wide unjam-mb-2">Submitted</h3>
            <p className="unjam-text-gray-900">{formatDate(ticket.createdAt)}</p>
          </div>
        </div>

        <div className="unjam-mb-8">
          <h3 className="unjam-text-sm unjam-font-medium unjam-text-gray-500 unjam-uppercase unjam-tracking-wide unjam-mb-2">Estimated Time</h3>
          <p className="unjam-text-gray-900">{ticket.estimatedTime}</p>
        </div>

        <div>
          <h3 className="unjam-text-lg unjam-font-medium unjam-text-gray-900 unjam-mb-4">Problem Description</h3>
          <div className="unjam-bg-gray-50 unjam-rounded-lg unjam-p-6">
            <pre className="unjam-text-sm unjam-text-gray-800 unjam-whitespace-pre-wrap unjam-font-mono unjam-leading-relaxed">
              {ticket.problemDescription}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketPreviewLayout;