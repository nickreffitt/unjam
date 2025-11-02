import React, { useState } from 'react';
import { type Ticket } from '@common/types';
import { formatDate, getStatusDisplay } from '@dashboard/shared/utils/ticketFormatters';
import { Terminal, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [consoleLogsExpanded, setConsoleLogsExpanded] = useState(false);
  const [screenshotExpanded, setScreenshotExpanded] = useState(false);

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'unjam-text-red-600 unjam-bg-red-50';
      case 'warn':
        return 'unjam-text-yellow-600 unjam-bg-yellow-50';
      case 'info':
        return 'unjam-text-blue-600 unjam-bg-blue-50';
      case 'debug':
        return 'unjam-text-purple-600 unjam-bg-purple-50';
      default:
        return 'unjam-text-gray-600 unjam-bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
  };

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

      <div className="unjam-mb-6">
        <h3 className="unjam-text-lg unjam-font-medium unjam-text-gray-900 unjam-mb-4">Problem Description</h3>
        <div className="unjam-bg-gray-50 unjam-rounded-lg unjam-p-6">
          <pre className="unjam-text-sm unjam-text-gray-800 unjam-whitespace-pre-wrap unjam-font-mono unjam-leading-relaxed">
            {ticket.problemDescription}
          </pre>
        </div>
      </div>

      {/* Console Logs Section */}
      {ticket.consoleLogs && ticket.consoleLogs.length > 0 && (
        <div className="unjam-mb-6">
          <div
            className="unjam-flex unjam-items-center unjam-justify-between unjam-cursor-pointer unjam-mb-4"
            onClick={() => setConsoleLogsExpanded(!consoleLogsExpanded)}
          >
            <div className="unjam-flex unjam-items-center unjam-gap-2">
              <Terminal className="unjam-w-5 unjam-h-5 unjam-text-gray-600" />
              <h3 className="unjam-text-lg unjam-font-medium unjam-text-gray-900">
                Console Logs <span className="unjam-text-sm unjam-text-gray-500">({ticket.consoleLogs.length})</span>
              </h3>
            </div>
            {consoleLogsExpanded ? (
              <ChevronUp className="unjam-w-5 unjam-h-5 unjam-text-gray-600" />
            ) : (
              <ChevronDown className="unjam-w-5 unjam-h-5 unjam-text-gray-600" />
            )}
          </div>

          {consoleLogsExpanded && (
            <div className="unjam-bg-gray-900 unjam-rounded-lg unjam-p-4 unjam-max-h-96 unjam-overflow-y-auto">
              {ticket.consoleLogs.map((log, index) => (
                <div
                  key={index}
                  className="unjam-flex unjam-gap-2 unjam-py-1 unjam-border-b unjam-border-gray-800 last:unjam-border-0"
                >
                  <span className="unjam-text-gray-400 unjam-text-xs unjam-font-mono unjam-whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span className={`unjam-px-2 unjam-py-0.5 unjam-rounded unjam-text-xs unjam-font-medium unjam-uppercase ${getLogLevelColor(log.level)}`}>
                    {log.level}
                  </span>
                  <pre className="unjam-text-gray-100 unjam-text-sm unjam-font-mono unjam-whitespace-pre-wrap unjam-break-all unjam-flex-1">
                    {log.message}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Screenshot Section */}
      {ticket.screenshot && (
        <div>
          <div
            className="unjam-flex unjam-items-center unjam-justify-between unjam-cursor-pointer unjam-mb-4"
            onClick={() => setScreenshotExpanded(!screenshotExpanded)}
          >
            <div className="unjam-flex unjam-items-center unjam-gap-2">
              <ImageIcon className="unjam-w-5 unjam-h-5 unjam-text-gray-600" />
              <h3 className="unjam-text-lg unjam-font-medium unjam-text-gray-900">Screenshot</h3>
            </div>
            {screenshotExpanded ? (
              <ChevronUp className="unjam-w-5 unjam-h-5 unjam-text-gray-600" />
            ) : (
              <ChevronDown className="unjam-w-5 unjam-h-5 unjam-text-gray-600" />
            )}
          </div>

          {screenshotExpanded && (
            <div className="unjam-bg-gray-50 unjam-rounded-lg unjam-p-4">
              <img
                src={ticket.screenshot}
                alt="Page screenshot at ticket creation"
                className="unjam-w-full unjam-h-auto unjam-rounded-lg unjam-border unjam-border-gray-300"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TicketDetailsCard;