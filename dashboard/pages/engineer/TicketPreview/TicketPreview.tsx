import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTicketState } from '@dashboard/engineer/Ticket/hooks/useTicketState';
import { useTicketActions } from '@dashboard/engineer/Ticket/hooks/useTicketActions';
import { formatElapsedTime } from '@dashboard/shared/utils/ticketFormatters';
import TicketPreviewLayout from '@dashboard/engineer/Ticket/components/TicketDetailView/TicketPreviewLayout';
import { X } from 'lucide-react';
import { type ErrorDisplay } from '@common/types';
import { useBillingAccountState } from '@dashboard/engineer/BillingAccount/hooks/useBillingAccountState';

const TicketPreviewContent: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { ticket, elapsedTime } = useTicketState(ticketId);
  const { handleClaimTicket } = useTicketActions();
  const [claimError, setClaimError] = useState<ErrorDisplay | null>(null);
  const { engineerAccount } = useBillingAccountState();

  const canClaim = engineerAccount?.verificationStatus === 'active' || engineerAccount?.verificationStatus === 'eventually_due';

  const onClaimTicket = async () => {
    if (!ticket) return;

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

  return (
    <div className="unjam-h-screen unjam-overflow-y-auto">
      {/* Error Display */}
      {claimError && (
        <div className="unjam-mt-8 unjam-mb-6 unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded-lg unjam-p-4 unjam-max-w-6xl unjam-mx-auto unjam-px-8">
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
      )}

      <TicketPreviewLayout
        ticket={ticket}
        headerConfig={{
          statusDisplay: `${formatElapsedTime(elapsedTime)} - Waiting`,
          actions: (
            <button
              onClick={onClaimTicket}
              disabled={!canClaim}
              className={`unjam-px-6 unjam-py-3 unjam-rounded-lg unjam-font-medium unjam-transition-colors ${
                canClaim
                  ? 'unjam-bg-blue-600 hover:unjam-bg-blue-700 unjam-text-white'
                  : 'unjam-bg-gray-300 unjam-text-gray-500 unjam-cursor-not-allowed'
              }`}
              title={canClaim ? '' : 'Billing account verification required'}
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
    </div>
  );
};

const TicketPreview: React.FC = () => {
  return (
    <TicketPreviewContent />
  );
};

export default TicketPreview;