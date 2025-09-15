import React from 'react';
import { useParams } from 'react-router-dom';
import { useTicketState } from '@dashboard/Ticket/hooks/useTicketState';
import { useTicketActions } from '@dashboard/Ticket/hooks/useTicketActions';
import { formatElapsedTime } from '@dashboard/shared/utils/ticketFormatters';
import TicketPreviewLayout from '@dashboard/Ticket/components/TicketDetailView/TicketPreviewLayout';

const TicketPreview: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { ticket, elapsedTime } = useTicketState(ticketId);
  const { handleClaimTicket } = useTicketActions();

  return (
    <TicketPreviewLayout
      ticket={ticket}
      headerConfig={{
        statusDisplay: `${formatElapsedTime(elapsedTime)} - Waiting`,
        actions: (
          <button
            onClick={() => ticket && handleClaimTicket(ticket)}
            className="unjam-bg-blue-600 hover:unjam-bg-blue-700 unjam-text-white unjam-px-6 unjam-py-3 unjam-rounded-lg unjam-font-medium unjam-transition-colors"
          >
            Claim This Ticket
          </button>
        )
      }}
      notFoundConfig={{
        title: "Ticket Not Found",
        message: "The ticket you're looking for doesn't exist or may have already been claimed.",
        redirectPath: "/new",
        redirectLabel: "Back to New Tickets",
        emoji: "🔍"
      }}
    />
  );
};

export default TicketPreview;