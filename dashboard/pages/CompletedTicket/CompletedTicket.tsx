import React from 'react';
import { useParams } from 'react-router-dom';
import { useTicketState } from '@dashboard/hooks/useTicketState';
import { getCompletionMessage } from '@dashboard/utils/ticketFormatters';
import TicketDetailView from '@dashboard/components/TicketDetailView/TicketDetailView';

const CompletedTicket: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { ticket } = useTicketState(ticketId);

  const completionInfo = ticket ? getCompletionMessage(ticket.status) : null;

  return (
    <TicketDetailView
      ticket={ticket}
      headerConfig={{
        statusDisplay: "0:00 - Completed"
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