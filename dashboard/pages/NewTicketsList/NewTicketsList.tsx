import React from 'react';
import { useTicketsList } from '@dashboard/hooks/useTicketsList';
import { useTableActions } from '@dashboard/hooks/useTableActions';
import TicketsTable from '@dashboard/components/TicketsTable/TicketsTable';

const NewTicketsList: React.FC = () => {
  const { tickets, setTickets } = useTicketsList(['waiting']);
  const { handleClaim } = useTableActions();

  const onClaim = (ticketId: string) => {
    // Remove ticket from local state when claimed
    setTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
  };

  const getClaimButton = (ticket: any) => (
    <button
      onClick={() => handleClaim(ticket.id, onClaim)}
      className="unjam-bg-orange-500 hover:unjam-bg-orange-600 unjam-text-white unjam-px-4 unjam-py-2 unjam-rounded-md unjam-text-sm unjam-font-medium unjam-transition-colors"
    >
      Claim
    </button>
  );

  return (
    <TicketsTable
      tickets={tickets}
      title="New Tickets"
      description="View and claim available tickets from customers"
      tableTitle="Available Tickets"
      viewDetailsPath="/new"
      timeDisplayColor="unjam-text-orange-600"
      emptyState={{
        emoji: "📋",
        title: "No new tickets available",
        subtitle: "New tickets will appear here when customers submit them"
      }}
      actions={getClaimButton}
    />
  );
};

export default NewTicketsList;