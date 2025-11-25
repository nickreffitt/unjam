import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTicketListState } from '@dashboard/engineer/TicketList/hooks/useTicketListState';
import TicketsTable from '@dashboard/engineer/TicketList/components/TicketsTable/TicketsTable';
import { MessageCircle, Clock, ToggleLeft, ToggleRight, Ticket } from 'lucide-react';
import { shouldShowCompletedState } from '@common/util/ticketStatusHelpers';

const ActiveTicketsList: React.FC = React.memo(() => {
  const { tickets: rawTickets } = useTicketListState(['in-progress']);
  const [showEmpty, setShowEmpty] = useState(false);
  const navigate = useNavigate();

  // Filter to include awaiting-confirmation tickets, but exclude ones with expired timers
  const tickets = useMemo(() => {
    return rawTickets.filter(ticket => {
      // Include in-progress tickets
      if (ticket.status === 'in-progress') {
        return true;
      }
      // Include awaiting-confirmation tickets only if timer hasn't expired
      if (ticket.status === 'awaiting-confirmation' && !shouldShowCompletedState(ticket)) {
        return true;
      }
      // Exclude everything else
      return false;
    });
  }, [rawTickets]);

  const getChatButton = (ticket: any) => (
    <Link
      to={`/active/${ticket.id}`}
      className="unjam-text-orange-600 hover:unjam-text-blue-700 unjam-text-sm"
    >
      <MessageCircle size={16} />
    </Link>
  );

  return (
    <div className="unjam-h-full unjam-overflow-y-auto">
      {/* Debug Toggle */}
      {process.env.NODE_ENV === 'development' && (
        <div className="unjam-fixed unjam-bottom-4 unjam-right-4 unjam-z-50 unjam-bg-white unjam-rounded-lg unjam-shadow-lg unjam-p-3 unjam-border unjam-border-gray-200">
          <button
            onClick={() => setShowEmpty(!showEmpty)}
            className="unjam-flex unjam-items-center unjam-gap-2 unjam-text-sm unjam-text-gray-700 hover:unjam-text-gray-900"
          >
            {showEmpty ? <ToggleRight size={24} className="unjam-text-blue-600" /> : <ToggleLeft size={24} />}
            <span className="unjam-font-medium">Empty State: {showEmpty ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      )}

      <TicketsTable
        tickets={showEmpty ? [] : tickets}
        title="Active Tickets"
        description="Manage your currently assigned tickets"
        viewDetailsPath="/active"
        timeDisplayColor="unjam-text-orange-600"
        timeSource="claimedAt"
        emptyState={{
          icon: Clock,
          title: "No Active Tickets",
          subtitle: "You don't have any active tickets at the moment. Claim a new ticket to start working.",
          action: {
            label: "View New Tickets",
            icon: Ticket,
            onClick: () => navigate('/new')
          }
        }}
        actions={getChatButton}
      />
    </div>
  );
});

export default ActiveTicketsList;