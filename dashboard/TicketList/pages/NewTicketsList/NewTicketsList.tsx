import React, { useState } from 'react';
import { useTicketsList } from '@dashboard/TicketList/hooks/useTicketsList';
import { useTicketActions } from '@dashboard/Ticket/hooks/useTicketActions';
import TicketsTable from '@dashboard/TicketList/components/TicketsTable/TicketsTable';
import { Ticket as TicketIcon, ToggleLeft, ToggleRight, RefreshCw, Plus } from 'lucide-react';
import { type Ticket } from '@common/types';

const NewTicketsList: React.FC = () => {
  const { tickets, createTestTicket } = useTicketsList(['waiting']);
  const { handleClaimTicket } = useTicketActions();
  const [showEmpty, setShowEmpty] = useState(false);


  const onClaim = async (ticket: Ticket) => {
    await handleClaimTicket(ticket);
  };

  const getClaimButton = (ticket: Ticket) => (
    <button
      onClick={() => onClaim(ticket)}
      className="unjam-bg-orange-500 hover:unjam-bg-orange-600 unjam-text-white unjam-px-4 unjam-py-2 unjam-rounded-md unjam-text-sm unjam-font-medium unjam-transition-colors"
    >
      Claim
    </button>
  );

  return (
    <div>
      {/* Debug Controls */}
      {(process.env.NODE_ENV === 'development') && (
        <div className="unjam-fixed unjam-bottom-4 unjam-left-4 unjam-z-50 unjam-bg-white unjam-rounded-lg unjam-shadow-lg unjam-p-3 unjam-border unjam-border-gray-200 unjam-space-y-2">
          <button
            onClick={() => setShowEmpty(!showEmpty)}
            className="unjam-flex unjam-items-center unjam-gap-2 unjam-text-sm unjam-text-gray-700 hover:unjam-text-gray-900 unjam-w-full"
          >
            {showEmpty ? <ToggleRight size={24} className="unjam-text-blue-600" /> : <ToggleLeft size={24} />}
            <span className="unjam-font-medium">Empty State: {showEmpty ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={createTestTicket}
            className="unjam-flex unjam-items-center unjam-gap-2 unjam-text-sm unjam-text-gray-700 hover:unjam-text-gray-900 unjam-bg-green-100 hover:unjam-bg-green-200 unjam-px-2 unjam-py-1 unjam-rounded unjam-w-full"
          >
            <Plus size={16} className="unjam-text-green-600" />
            <span className="unjam-font-medium">Add Test Ticket</span>
          </button>
        </div>
      )}

      <TicketsTable
        tickets={showEmpty ? [] : tickets}
        title="New Tickets"
        description="View and claim available tickets from customers"
        viewDetailsPath="/new"
        timeDisplayColor="unjam-text-orange-600"
        timeSource="createdAt"
        emptyState={{
          icon: TicketIcon,
          title: "No New Tickets",
          subtitle: "There are no tickets waiting to be claimed at the moment. Check back soon for new support requests.",
          action: {
            label: "Refresh Tickets",
            icon: RefreshCw,
            onClick: () => window.location.reload()
          }
        }}
        actions={getClaimButton}
      />
    </div>
  );
};

export default NewTicketsList;