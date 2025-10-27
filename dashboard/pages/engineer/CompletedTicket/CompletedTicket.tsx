import React from 'react';
import { useParams } from 'react-router-dom';
import { useTicketState } from '@dashboard/engineer/Ticket/hooks/useTicketState';
import { getCompletionMessage, formatCompletionTime } from '@dashboard/shared/utils/ticketFormatters';
import TicketDetailView from '@dashboard/engineer/Ticket/components/TicketDetailView/TicketDetailView';
import { shouldShowCompletedState } from '@common/util/ticketStatusHelpers';

const CompletedTicket: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { ticket } = useTicketState(ticketId);

  // Get appropriate completion message based on status and timer expiration
  const getCompletionInfo = () => {
    if (!ticket) return null;

    // If awaiting-confirmation timer expired, treat as pending-payment
    if (ticket.status === 'awaiting-confirmation' && shouldShowCompletedState(ticket)) {
      return {
        icon: '💳',
        text: 'This ticket has been completed. Payment will be processed shortly.',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800'
      };
    }

    // Otherwise use default message for the status
    return getCompletionMessage(ticket.status);
  };

  const completionInfo = getCompletionInfo();

  // Calculate the completion time between claimedAt and resolvedAt
  const getCompletionTimeDisplay = () => {
    if (!ticket) {
      return "Completed";
    }

    // Handle pending-payment status
    if (ticket.status === 'pending-payment') {
      if (ticket.claimedAt && ticket.resolvedAt) {
        const completionTime = formatCompletionTime(ticket.claimedAt, ticket.resolvedAt);
        return `${completionTime} - Payment Processing`;
      }
      return "Payment Processing";
    }

    // Handle awaiting-confirmation status
    if (ticket.status === 'awaiting-confirmation') {
      // Check if timer expired (effectively pending payment)
      if (shouldShowCompletedState(ticket)) {
        if (ticket.claimedAt && ticket.resolvedAt) {
          const completionTime = formatCompletionTime(ticket.claimedAt, ticket.resolvedAt);
          return `${completionTime} - Payment Processing`;
        }
        return "Payment Processing";
      }
      // Timer still active
      if (ticket.claimedAt && ticket.resolvedAt) {
        const completionTime = formatCompletionTime(ticket.claimedAt, ticket.resolvedAt);
        return `${completionTime} - Awaiting Confirmation`;
      }
      return "Awaiting Confirmation";
    }

    // Handle other completed statuses
    if (!ticket.claimedAt || !ticket.resolvedAt) {
      return "Completed";
    }
    const completionTime = formatCompletionTime(ticket.claimedAt, ticket.resolvedAt);
    return `${completionTime} - Completed`;
  };

  return (
    <TicketDetailView
      ticket={ticket}
      headerConfig={{
        statusDisplay: getCompletionTimeDisplay()
      }}
      notFoundConfig={{
        title: "Ticket Not Found",
        message: "The completed ticket you're looking for doesn't exist or may have been removed.",
        redirectPath: "/completed",
        redirectLabel: "View Completed Tickets",
        emoji: "📋"
      }}
      statusBanner={completionInfo ? {
        icon: completionInfo.icon,
        message: completionInfo.text,
        bgColor: completionInfo.bgColor,
        textColor: completionInfo.textColor
      } : undefined}
      chatActive={false}
    />
  );
};

export default CompletedTicket;