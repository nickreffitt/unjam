import React from 'react';
import { useParams } from 'react-router-dom';
import { useTicketState } from '@dashboard/hooks/useTicketState';
import { useTicketActions } from '@dashboard/hooks/useTicketActions';
import { formatElapsedTime, formatTimeoutRemaining } from '@dashboard/utils/ticketFormatters';
import TicketDetailView from '@dashboard/components/TicketDetailView/TicketDetailView';

const ActiveTicket: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { ticket, elapsedTime, timeoutRemaining, setTicket, setTimeoutRemaining } = useTicketState(ticketId);
  const { handleMarkAsFixed, handleAbandonTask, simulateCustomerConfirmation } = useTicketActions();

  const getStatusDisplay = () => {
    switch (ticket?.status) {
      case 'in-progress':
        return `${formatElapsedTime(elapsedTime)} - Active`;
      case 'marked-resolved':
        return `Waiting for customer confirmation - Auto-complete in ${formatTimeoutRemaining(timeoutRemaining)}`;
      case 'auto-completed':
        return '0:00 - Auto Completed';
      case 'completed':
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
            className="unjam-bg-green-600 hover:unjam-bg-green-700 unjam-text-white unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-transition-colors unjam-flex unjam-items-center"
          >
            <span className="unjam-mr-2">✓</span>
            Mark as fixed
          </button>
          <button
            onClick={() => handleAbandonTask(ticket.id)}
            className="unjam-bg-red-600 hover:unjam-bg-red-700 unjam-text-white unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-transition-colors unjam-flex unjam-items-center"
          >
            <span className="unjam-mr-2">⚠</span>
            Abandon task
          </button>
        </>
      );
    }

    if (ticket.status === 'marked-resolved') {
      return (
        <>
          <div className="unjam-bg-yellow-100 unjam-text-yellow-800 unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-flex unjam-items-center">
            <span className="unjam-mr-2">⏳</span>
            Waiting for customer confirmation
          </div>
          <button
            onClick={() => simulateCustomerConfirmation(ticket, setTicket, setTimeoutRemaining)}
            className="unjam-bg-blue-500 hover:unjam-bg-blue-600 unjam-text-white unjam-px-3 unjam-py-2 unjam-rounded-md unjam-text-sm unjam-font-medium unjam-transition-colors"
            title="Simulate customer confirmation (for testing)"
          >
            🧪 Test: Customer Confirms
          </button>
        </>
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
      showAssignedTo={true}
      showEstimatedTime={true}
      chatActive={true}
    />
  );
};

export default ActiveTicket;