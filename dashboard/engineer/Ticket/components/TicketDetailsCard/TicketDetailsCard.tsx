import React from 'react';
import { type Ticket } from '@common/types';
import { formatDate, getStatusDisplay } from '@dashboard/shared/utils/ticketFormatters';

interface TicketDetailsCardProps {
  ticket: Ticket;
  showAssignedTo?: boolean;
  showEstimatedTime?: boolean;
}

const TicketDetailsCard: React.FC<TicketDetailsCardProps> = ({
  ticket,
  showAssignedTo = false,
  showEstimatedTime = false
}) => {
  const statusInfo = getStatusDisplay(ticket.status);

  return (
    <div className="unjam-bg-white unjam-rounded-lg unjam-shadow-sm unjam-border unjam-border-gray-200 unjam-p-6">
      <h2 className="unjam-text-lg unjam-font-semibold unjam-text-gray-900 unjam-mb-6">Ticket Details</h2>
      
      <div className="unjam-grid unjam-grid-cols-1 md:unjam-grid-cols-2 unjam-gap-6 unjam-mb-6">
        <div>
          <h3 className="unjam-text-sm unjam-font-medium unjam-text-gray-500 unjam-uppercase unjam-tracking-wide unjam-mb-2">Ticket ID</h3>
          <p className="unjam-text-gray-900 unjam-font-mono unjam-text-sm unjam-break-all">{ticket.id}</p>
        </div>
        
        <div>
          <h3 className="unjam-text-sm unjam-font-medium unjam-text-gray-500 unjam-uppercase unjam-tracking-wide unjam-mb-2">Status</h3>
          <span className={`unjam-inline-flex unjam-items-center unjam-px-2 unjam-py-1 unjam-rounded-full unjam-text-sm unjam-font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
            <span className={`unjam-w-2 unjam-h-2 ${statusInfo.dotColor} unjam-rounded-full unjam-mr-2`} />
            {statusInfo.text}
          </span>
        </div>
        
        <div>
          <h3 className="unjam-text-sm unjam-font-medium unjam-text-gray-500 unjam-uppercase unjam-tracking-wide unjam-mb-2">Submitted</h3>
          <p className="unjam-text-gray-900">{formatDate(ticket.createdAt)}</p>
        </div>
        
        {showAssignedTo && (
          <div>
            <h3 className="unjam-text-sm unjam-font-medium unjam-text-gray-500 unjam-uppercase unjam-tracking-wide unjam-mb-2">Assigned To</h3>
            <div className="unjam-flex unjam-items-center">
              <div className="unjam-bg-blue-500 unjam-text-white unjam-rounded-full unjam-w-8 unjam-h-8 unjam-flex unjam-items-center unjam-justify-center unjam-text-sm unjam-font-medium unjam-mr-2">
                {ticket.assignedTo?.name?.charAt(0) || ''}
              </div>
              <span className="unjam-text-blue-600 unjam-font-medium">{ticket.assignedTo?.name || ''}</span>
            </div>
          </div>
        )}
      </div>

      {showEstimatedTime && (
        <div className="unjam-mb-6">
          <h3 className="unjam-text-sm unjam-font-medium unjam-text-gray-500 unjam-uppercase unjam-tracking-wide unjam-mb-2">Estimated Time</h3>
          <p className="unjam-text-gray-900">{ticket.estimatedTime}</p>
        </div>
      )}

      <div>
        <h3 className="unjam-text-lg unjam-font-medium unjam-text-gray-900 unjam-mb-4">Problem Description</h3>
        <div className="unjam-bg-gray-50 unjam-rounded-lg unjam-p-6">
          <pre className="unjam-text-sm unjam-text-gray-800 unjam-whitespace-pre-wrap unjam-font-mono unjam-leading-relaxed">
            {ticket.problemDescription}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailsCard;