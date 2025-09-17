import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTicketState } from '@dashboard/Ticket/hooks/useTicketState';
import { useTicketActions } from '@dashboard/Ticket/hooks/useTicketActions';
import { formatElapsedTime, formatLiveElapsedTime, formatCountdownTime, formatCompletionTime } from '@dashboard/shared/utils/ticketFormatters';
import TicketDetailView from '@dashboard/Ticket/components/TicketDetailView/TicketDetailView';
import { Check, AlertTriangle, Clock, TestTube, Timer } from 'lucide-react';

const ActiveTicket: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { ticket, elapsedTime, timeoutRemaining, setTicket, setTimeoutRemaining } = useTicketState(ticketId);
  const { handleMarkAsFixed, handleAbandonTask, simulateCustomerConfirmation, simulateAutoCompleteTimer } = useTicketActions();
  const [, setCurrentTime] = useState(new Date());

  // Update timer every second for live time calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusDisplay = () => {
    if (!ticket) return '';

    switch (ticket.status) {
      case 'in-progress':
        // Show live elapsed time since claimedAt
        if (ticket.claimedAt) {
          return `${formatLiveElapsedTime(ticket.claimedAt)} - Active`;
        }
        return `${formatElapsedTime(elapsedTime)} - Active`;
      case 'awaiting-confirmation':
        // Show countdown to autoCompleteTimeoutAt
        if (ticket.autoCompleteTimeoutAt) {
          const timeoutDate = new Date(ticket.autoCompleteTimeoutAt);
          return `Waiting for customer confirmation - Auto-complete in ${formatCountdownTime(timeoutDate)}`;
        }
        return `Waiting for customer confirmation - Auto-complete in ${formatElapsedTime(timeoutRemaining)}`;
      case 'auto-completed':
        // Show actual completion time from claimedAt to resolvedAt
        if (ticket.claimedAt && ticket.resolvedAt) {
          return `${formatCompletionTime(ticket.claimedAt, ticket.resolvedAt)} - Auto Completed`;
        }
        return '0:00 - Auto Completed';
      case 'completed':
        // Show actual completion time from claimedAt to resolvedAt
        if (ticket.claimedAt && ticket.resolvedAt) {
          return `${formatCompletionTime(ticket.claimedAt, ticket.resolvedAt)} - Completed`;
        }
        return '0:00 - Completed';
      default:
        return `${formatElapsedTime(elapsedTime)} - Active`;
    }
  };

  const getActionButtons = () => {
    if (!ticket) return null;

    if (ticket.status === 'in-progress') {
      return (
        <>
          <button
            onClick={() => handleMarkAsFixed(ticket, setTicket, setTimeoutRemaining)}
            className="unjam-bg-green-600 hover:unjam-bg-green-700 unjam-text-white unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-transition-colors unjam-flex unjam-items-center unjam-gap-2"
          >
            <Check size={16} />
            Mark as fixed
          </button>
          <button
            onClick={() => handleAbandonTask(ticket.id)}
            className="unjam-bg-red-600 hover:unjam-bg-red-700 unjam-text-white unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-transition-colors unjam-flex unjam-items-center unjam-gap-2"
          >
            <AlertTriangle size={16} />
            Abandon task
          </button>
        </>
      );
    }

    if (ticket.status === 'awaiting-confirmation') {
      return (
        <div className="unjam-bg-yellow-100 unjam-text-yellow-800 unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-flex unjam-items-center unjam-gap-2">
          <Clock size={16} />
          Waiting for customer confirmation
        </div>
      );
    }

    if (ticket.status === 'completed' || ticket.status === 'auto-completed') {
      return (
        <div className="unjam-bg-green-100 unjam-text-green-800 unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-flex unjam-items-center">
          <span className="unjam-mr-2">✓</span>
          {ticket.status === 'auto-completed' ? 'Auto Completed' : 'Completed'}
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* Debug Controls */}
      {(process.env.NODE_ENV === 'development') && ticket?.status === 'awaiting-confirmation' && (
        <div className="unjam-fixed unjam-bottom-4 unjam-left-4 unjam-z-50 unjam-bg-white unjam-rounded-lg unjam-shadow-lg unjam-p-3 unjam-border unjam-border-gray-200 unjam-space-y-2">
          <button
            onClick={() => simulateCustomerConfirmation(ticket, setTicket, setTimeoutRemaining)}
            className="unjam-flex unjam-items-center unjam-gap-2 unjam-text-sm unjam-text-gray-700 hover:unjam-text-gray-900 unjam-bg-blue-100 hover:unjam-bg-blue-200 unjam-px-2 unjam-py-1 unjam-rounded unjam-w-full"
            title="Simulate customer confirmation (for testing)"
          >
            <TestTube size={16} className="unjam-text-blue-600" />
            <span className="unjam-font-medium">Customer Confirms</span>
          </button>
          <button
            onClick={() => simulateAutoCompleteTimer(ticket, setTicket, setTimeoutRemaining)}
            className="unjam-flex unjam-items-center unjam-gap-2 unjam-text-sm unjam-text-gray-700 hover:unjam-text-gray-900 unjam-bg-purple-100 hover:unjam-bg-purple-200 unjam-px-2 unjam-py-1 unjam-rounded unjam-w-full"
            title="Simulate auto-complete timer expiring (for testing)"
          >
            <Timer size={16} className="unjam-text-purple-600" />
            <span className="unjam-font-medium">Timer Expires</span>
          </button>
        </div>
      )}

      <TicketDetailView
        ticket={ticket}
        headerConfig={{
          statusDisplay: getStatusDisplay(),
          actions: getActionButtons()
        }}
        notFoundConfig={{
          title: "Ticket Not Found",
          message: "The ticket you're looking for doesn't exist or has been removed.",
          redirectPath: "/new",
          redirectLabel: "View New Tickets",
          emoji: "🎫"
        }}
        showAssignedTo
        showEstimatedTime
        chatActive
      />
    </>
  );
};

export default ActiveTicket;