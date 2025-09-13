import React from 'react';
import { Link } from 'react-router-dom';
import { useTicketsList } from '@dashboard/hooks/useTicketsList';
import TicketsTable from '@dashboard/components/TicketsTable/TicketsTable';

const ActiveTicketsList: React.FC = () => {
  const { tickets } = useTicketsList(['in-progress']);

  const getChatButton = (ticket: any) => (
    <Link
      to={`/active/${ticket.id}`}
      className="unjam-text-blue-600 hover:unjam-text-blue-700 unjam-text-sm"
    >
      💬
    </Link>
  );

  return (
    <TicketsTable
      tickets={tickets}
      title="Active Tickets"
      description="Manage your currently assigned tickets"
      tableTitle="Your Active Tickets"
      viewDetailsPath="/active"
      timeDisplayColor="unjam-text-blue-600"
      emptyState={{
        emoji: "⏱️",
        title: "No active tickets",
        subtitle: "Your claimed tickets will appear here"
      }}
      actions={getChatButton}
    />
  );
};

export default ActiveTicketsList;