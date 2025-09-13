import React from 'react';
import { Ticket } from '@common/types';

interface TicketHeaderProps {
  ticket: Ticket;
  statusDisplay: string;
  actions?: React.ReactNode;
}

const TicketHeader: React.FC<TicketHeaderProps> = ({
  ticket,
  statusDisplay,
  actions
}) => {
  return (
    <div className="unjam-mb-6 unjam-flex unjam-items-center unjam-justify-between">
      <div>
        <h1 className="unjam-text-3xl unjam-font-bold unjam-text-gray-900 unjam-mb-2">
          {ticket.summary}
        </h1>
        <div className="unjam-flex unjam-items-center unjam-text-sm unjam-text-gray-600">
          <span className="unjam-mr-4">⏱ {statusDisplay}</span>
        </div>
      </div>
      {actions && (
        <div className="unjam-flex unjam-space-x-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export default TicketHeader;