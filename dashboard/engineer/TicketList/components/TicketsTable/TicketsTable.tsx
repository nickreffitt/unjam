import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { type Ticket } from '@common/types';
import { formatElapsedTime, formatLiveElapsedTime, getStatusDisplay } from '@dashboard/shared/utils/ticketFormatters';
import { Clock, Check, Eye, type LucideIcon } from 'lucide-react';
import EmptyState from '@dashboard/engineer/TicketList/components/EmptyState/EmptyState';
import BillingVerificationAlert from '@dashboard/engineer/BillingAccount/components/BillingVerificationAlert/BillingVerificationAlert';
import { useBillingAccountState } from '@dashboard/engineer/BillingAccount/hooks/useBillingAccountState';

interface EmptyStateConfig {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
  };
}

interface TicketsTableProps {
  tickets: Ticket[];
  title: string;
  description: string;
  emptyState: EmptyStateConfig;
  viewDetailsPath: string; // e.g., "/new", "/active", "/completed"
  timeDisplayColor: string; // e.g., "text-orange-600", "text-blue-600", "text-green-600"
  actions?: (ticket: Ticket) => React.ReactNode;
  timeSource?: 'createdAt' | 'claimedAt' | 'elapsedTime'; // Which field to use for time calculation
}

const TicketsTableContent: React.FC<TicketsTableProps> = ({
  tickets,
  title,
  description,
  emptyState,
  viewDetailsPath,
  timeDisplayColor,
  actions,
  timeSource = 'elapsedTime'
}) => {
  const [, setCurrentTime] = useState(new Date());
  const { engineerAccount } = useBillingAccountState();

  const canPerformActions = engineerAccount?.verificationStatus === 'active' || engineerAccount?.verificationStatus === 'eventually_due';

  // Update current time every second for live time calculations
  useEffect(() => {
    if (timeSource === 'createdAt' || timeSource === 'claimedAt') {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [timeSource]);

  const getTicketTimeDisplay = (ticket: Ticket): string => {
    if (ticket.status === 'completed' || ticket.status === 'auto-completed') {
      return 'Completed';
    }

    if (ticket.status === 'pending-payment') {
      return 'Pending Payment';
    }

    if (ticket.status === 'awaiting-confirmation') {
      return 'Awaiting Confirmation';
    }

    switch (timeSource) {
      case 'createdAt':
        return formatLiveElapsedTime(ticket.createdAt);
      case 'claimedAt':
        return ticket.claimedAt ? formatLiveElapsedTime(ticket.claimedAt) : formatElapsedTime(ticket.elapsedTime);
      case 'elapsedTime':
      default:
        return formatElapsedTime(ticket.elapsedTime);
    }
  };

  return (
    <div className="unjam-p-8 unjam-max-w-6xl unjam-mx-auto">
      <div className="unjam-mb-8">
        <h1 className="unjam-text-3xl unjam-font-bold unjam-text-gray-900 unjam-mb-2">{title}</h1>
        <p className="unjam-text-gray-600">{description}</p>
      </div>

      <BillingVerificationAlert />

        <div className="unjam-bg-white unjam-rounded-lg unjam-shadow-sm unjam-border unjam-border-gray-200">

        <div className="unjam-overflow-x-auto">
          <table className="unjam-w-full">
            {tickets.length > 0 && (
              <thead className="unjam-bg-gray-50 unjam-border-b unjam-border-gray-200">
                <tr>
                  <th className="unjam-text-left unjam-py-4 unjam-px-6 unjam-font-medium unjam-text-gray-700">Ticket</th>
                  <th className="unjam-text-left unjam-py-4 unjam-px-6 unjam-font-medium unjam-text-gray-700">Summary</th>
                  <th className="unjam-text-left unjam-py-4 unjam-px-6 unjam-font-medium unjam-text-gray-700">Status</th>
                  <th className="unjam-text-left unjam-py-4 unjam-px-6 unjam-font-medium unjam-text-gray-700">Time</th>
                  <th className="unjam-text-left unjam-py-4 unjam-px-6 unjam-font-medium unjam-text-gray-700">Actions</th>
                </tr>
              </thead>
            )}
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
                        <span className={`unjam-w-2 unjam-h-2 ${statusInfo.dotColor} unjam-rounded-full unjam-mr-2`} />
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="unjam-py-4 unjam-px-6">
                      <div className={`unjam-flex unjam-items-center unjam-text-sm ${timeDisplayColor}`}>
                        <span className="unjam-mr-2">
                          {ticket.status === 'completed' || ticket.status === 'auto-completed' || ticket.status === 'pending-payment' || ticket.status === 'awaiting-confirmation'
                            ? <Check size={14} />
                            : <Clock size={14} />
                          }
                        </span>
                        {getTicketTimeDisplay(ticket)}
                      </div>
                    </td>
                    <td className="unjam-py-4 unjam-px-6">
                      <div className="unjam-flex unjam-items-center unjam-space-x-3">
                        <Link
                          to={`${viewDetailsPath}/${ticket.id}`}
                          className="unjam-text-gray-600 hover:unjam-text-gray-800 unjam-transition-colors"
                          title="View details"
                        >
                          <Eye size={16} />
                        </Link>
                        {actions && (
                          <div className={canPerformActions ? '' : 'unjam-pointer-events-none unjam-opacity-50'} title={canPerformActions ? '' : 'Billing account verification required'}>
                            {actions(ticket)}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {tickets.length === 0 && (
            <EmptyState
              icon={emptyState.icon}
              title={emptyState.title}
              subtitle={emptyState.subtitle}
              action={emptyState.action}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const TicketsTable: React.FC<TicketsTableProps> = (props) => {
  return (
      <TicketsTableContent {...props} />
  );
};

export default TicketsTable;