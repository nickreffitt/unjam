import React from 'react';
import { useParams } from 'react-router-dom';
import { useTicketState } from '@dashboard/Ticket/hooks/useTicketState';
import { getCompletionMessage, formatCompletionTime } from '@dashboard/shared/utils/ticketFormatters';
import TicketDetailView from '@dashboard/Ticket/components/TicketDetailView/TicketDetailView';

const CompletedTicket: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { ticket } = useTicketState(ticketId);

  const completionInfo = ticket ? getCompletionMessage(ticket.status) : null;

  // Calculate the completion time between claimedAt and resolvedAt
  const getCompletionTimeDisplay = () => {
    if (!ticket || !ticket.claimedAt || !ticket.resolvedAt) {
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