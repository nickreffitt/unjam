import React from 'react';
import { useTicketsList } from '@dashboard/hooks/useTicketsList';
import TicketsTable from '@dashboard/components/TicketsTable/TicketsTable';

const CompletedTicketsList: React.FC = () => {
  const { tickets } = useTicketsList(['completed', 'auto-completed']);

  return (
    <TicketsTable
      tickets={tickets}
      title="Completed Tickets"
      description="Review your completed ticket history"
      tableTitle="Completed Tickets"
      viewDetailsPath="/completed"
      timeDisplayColor="unjam-text-green-600"
      emptyState={{
        emoji: "✅",
        title: "No completed tickets",
        subtitle: "Your completed tickets will appear here"
      }}
    />
  );
};

export default CompletedTicketsList;