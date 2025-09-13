import React from 'react';
import { Link } from 'react-router-dom';
import { Ticket } from '@common/types';
import { formatElapsedTime, getStatusDisplay } from '@dashboard/utils/ticketFormatters';

interface EmptyStateConfig {
  emoji: string;
  title: string;
  subtitle: string;
}

interface TicketsTableProps {
  tickets: Ticket[];
  title: string;
  description: string;
  tableTitle: string;
  emptyState: EmptyStateConfig;
  viewDetailsPath: string; // e.g., "/new", "/active", "/completed"
  timeDisplayColor: string; // e.g., "text-orange-600", "text-blue-600", "text-green-600"
  actions?: (ticket: Ticket) => React.ReactNode;
}

const TicketsTable: React.FC<TicketsTableProps> = ({
  tickets,
  title,
  description,
  tableTitle,
  emptyState,
  viewDetailsPath,
  timeDisplayColor,
  actions
}) => {
  return (
    <div className="unjam-p-8 unjam-max-w-6xl unjam-mx-auto">
      <div className="unjam-mb-8">
        <h1 className="unjam-text-3xl unjam-font-bold unjam-text-gray-900 unjam-mb-2">{title}</h1>
        <p className="unjam-text-gray-600">{description}</p>
      </div>

      <div className="unjam-bg-white unjam-rounded-lg unjam-shadow-sm unjam-border unjam-border-gray-200">
        <div className="unjam-p-6 unjam-border-b unjam-border-gray-200">
          <h2 className="unjam-text-lg unjam-font-semibold unjam-text-gray-900">{tableTitle}</h2>
        </div>

        <div className="unjam-overflow-x-auto">
          <table className="unjam-w-full">
            <thead className="unjam-bg-gray-50 unjam-border-b unjam-border-gray-200">
              <tr>
                <th className="unjam-text-left unjam-py-4 unjam-px-6 unjam-font-medium unjam-text-gray-700">Ticket</th>
                <th className="unjam-text-left unjam-py-4 unjam-px-6 unjam-font-medium unjam-text-gray-700">Summary</th>
                <th className="unjam-text-left unjam-py-4 unjam-px-6 unjam-font-medium unjam-text-gray-700">Status</th>
                <th className="unjam-text-left unjam-py-4 unjam-px-6 unjam-font-medium unjam-text-gray-700">Time</th>
                <th className="unjam-text-left unjam-py-4 unjam-px-6 unjam-font-medium unjam-text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="unjam-divide-y unjam-divide-gray-200">
              {tickets.map((ticket) => {
                const statusInfo = getStatusDisplay(ticket.status);
                return (
                  <tr key={ticket.id} className="hover:unjam-bg-gray-50">
                    <td className="unjam-py-4 unjam-px-6 unjam-text-sm unjam-text-gray-900 unjam-font-mono">
                      {ticket.id}
                    </td>
                    <td className="unjam-py-4 unjam-px-6">
                      <div className="unjam-text-sm unjam-text-gray-900">{ticket.summary}</div>
                      <div className="unjam-text-xs unjam-text-gray-500">Est: {ticket.estimatedTime}</div>
                    </td>
                    <td className="unjam-py-4 unjam-px-6">
                      <span className={`unjam-inline-flex unjam-items-center unjam-px-2 unjam-py-1 unjam-rounded-full unjam-text-xs unjam-font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                        <span className={`unjam-w-2 unjam-h-2 ${statusInfo.dotColor} unjam-rounded-full unjam-mr-2`}></span>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="unjam-py-4 unjam-px-6">
                      <div className={`unjam-flex unjam-items-center unjam-text-sm ${timeDisplayColor}`}>
                        <span className="unjam-mr-2">
                          {ticket.status === 'completed' || ticket.status === 'auto-completed' ? '✓' : '⏱'}
                        </span>
                        {ticket.status === 'completed' || ticket.status === 'auto-completed' 
                          ? 'Completed' 
                          : formatElapsedTime(ticket.elapsedTime)
                        }
                      </div>
                    </td>
                    <td className="unjam-py-4 unjam-px-6">
                      <div className="unjam-flex unjam-items-center unjam-space-x-3">
                        <Link
                          to={`${viewDetailsPath}/${ticket.id}`}
                          className="unjam-text-gray-600 hover:unjam-text-gray-800 unjam-transition-colors"
                          title="View details"
                        >
                          👁
                        </Link>
                        {actions && actions(ticket)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {tickets.length === 0 && (
            <div className="unjam-text-center unjam-py-12">
              <div className="unjam-text-gray-500 unjam-mb-2">{emptyState.emoji}</div>
              <p className="unjam-text-gray-500 unjam-text-lg">{emptyState.title}</p>
              <p className="unjam-text-gray-400 unjam-text-sm">{emptyState.subtitle}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketsTable;