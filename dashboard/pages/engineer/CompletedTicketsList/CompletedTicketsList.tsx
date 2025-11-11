import React, { useState } from 'react';
import { useTicketListState } from '@dashboard/engineer/TicketList/hooks/useTicketListState';
import TicketsTable from '@dashboard/engineer/TicketList/components/TicketsTable/TicketsTable';
import { CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react';

const CompletedTicketsList: React.FC = () => {
  const { tickets } = useTicketListState(['completed', 'auto-completed', 'pending-payment', 'awaiting-confirmation', 'payment-failed']);
  const [showEmpty, setShowEmpty] = useState(false);

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
        title="Completed Tickets"
        description="Review your completed ticket history"
        viewDetailsPath="/completed"
        timeDisplayColor="unjam-text-green-600"
        emptyState={{
          icon: CheckCircle,
          title: "No completed tickets",
          subtitle: "Your completed tickets will appear here"
        }}
      />
    </div>
  );
};

export default CompletedTicketsList;