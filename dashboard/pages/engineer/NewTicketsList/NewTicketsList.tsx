import React, { useState } from 'react';
import { useTicketListState } from '@dashboard/engineer/TicketList/hooks/useTicketListState';
import { useTicketActions } from '@dashboard/engineer/Ticket/hooks/useTicketActions';
import { useTicketListActions } from '@dashboard/engineer/TicketList/hooks/useTicketListActions';
import TicketsTable from '@dashboard/engineer/TicketList/components/TicketsTable/TicketsTable';
import { Ticket as TicketIcon, ToggleLeft, ToggleRight, RefreshCw, Plus, X } from 'lucide-react';
import { type Ticket, type ErrorDisplay } from '@common/types';

const NewTicketsList: React.FC = () => {
  const { tickets, refreshTickets } = useTicketListState(['waiting']);
  const { handleClaimTicket } = useTicketActions();
  const { createTestTicket } = useTicketListActions();
  const [showEmpty, setShowEmpty] = useState(false);
  const [claimError, setClaimError] = useState<ErrorDisplay | null>(null);

  const onClaim = async (ticket: Ticket) => {
    try {
      setClaimError(null);
      await handleClaimTicket(ticket);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to claim ticket';
      setClaimError({
        title: 'Unable to claim ticket',
        message: errorMessage
      });
      console.error('Claim error:', error);
    }
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
    <div className="unjam-h-full unjam-overflow-y-auto">
      {/* Error Display */}
      {claimError && (
        <div className="unjam-mt-8 unjam-mb-6 unjam-max-w-6xl unjam-mx-auto unjam-px-8">
          <div className="unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded-lg unjam-p-4">
            <div className="unjam-flex unjam-items-start unjam-justify-between">
              <div className="unjam-flex">
                <div className="unjam-flex-shrink-0">
                  <div className="unjam-w-5 unjam-h-5 unjam-bg-red-100 unjam-rounded-full unjam-flex unjam-items-center unjam-justify-center">
                    <span className="unjam-text-red-600 unjam-text-sm unjam-font-semibold">!</span>
                  </div>
                </div>
                <div className="unjam-ml-3">
                  <h3 className="unjam-text-sm unjam-font-medium unjam-text-red-800">{claimError.title}</h3>
                  <div className="unjam-mt-2 unjam-text-sm unjam-text-red-700">
                    <p>{claimError.message}</p>
                  </div>
                </div>
              </div>
              <div className="unjam-flex-shrink-0">
                <button
                  onClick={() => setClaimError(null)}
                  className="unjam-inline-flex unjam-text-red-400 hover:unjam-text-red-600 unjam-transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Controls */}
      {(process.env.NODE_ENV === 'development') && (
        <div className="unjam-fixed unjam-bottom-4 unjam-right-4 unjam-z-50 unjam-bg-white unjam-rounded-lg unjam-shadow-lg unjam-p-3 unjam-border unjam-border-gray-200 unjam-space-y-2">
          <button
            onClick={() => setShowEmpty(!showEmpty)}
            className="unjam-flex unjam-items-center unjam-gap-2 unjam-text-sm unjam-text-gray-700 hover:unjam-text-gray-900 unjam-w-full"
          >
            {showEmpty ? <ToggleRight size={24} className="unjam-text-blue-600" /> : <ToggleLeft size={24} />}
            <span className="unjam-font-medium">Empty State: {showEmpty ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={() => createTestTicket(refreshTickets)}
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