import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, MessageCircle, X, Copy, Check, XCircle } from 'lucide-react';
import { type Ticket } from '@common/types';
import { useTicketState } from '@extension/Ticket/hooks/useTicketState';
import { useTicketActions } from '@extension/Ticket/hooks/useTicketActions';
import { useTicketManager } from '@extension/Ticket/contexts/TicketManagerContext';
import Rating from '@extension/Rating/Rating';
import { shouldShowCompletedState } from '@common/util/ticketStatusHelpers';

interface TicketBoxProps {
  ticket: Ticket | null;
  onHide?: () => void;
  isChatVisible?: boolean;
  onToggleChat?: () => void;
}

interface TimerProps {
  startTime: Date;
}

const Timer: React.FC<TimerProps> = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(() => {
    const now = new Date();
    return Math.floor((now.getTime() - startTime.getTime()) / 1000);
  });

  useEffect(() => {
    // Update immediately
    const updateTime = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsed(diff);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>;
};

interface CountdownTimerProps {
  endTime: Date;
  ticketStatus: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ endTime, ticketStatus }) => {
  const [remaining, setRemaining] = useState(() => {
    const now = new Date();
    return Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
      setRemaining(diff);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [endTime, ticketStatus]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>;
};

const TicketBox: React.FC<TicketBoxProps> = ({
  ticket,
  onHide,
  isChatVisible: chatVisibleProp,
  onToggleChat
}) => {
  const [copied, setCopied] = useState(false);
  const [, forceUpdate] = useState({});

  // Get state and actions from hooks
  const {
    isChatVisible: localChatVisible,
    setIsChatVisible,
    setIsTicketVisible,
    setActiveTicket
  } = useTicketState();

  // Use prop values if provided, otherwise fall back to local state
  const isChatVisible = chatVisibleProp !== undefined ? chatVisibleProp : localChatVisible;

  const {
    handleMarkFixed,
    handleConfirmFixed,
    handleMarkStillBroken,
    handleCancelTicket
  } = useTicketActions(ticket, setActiveTicket, setIsTicketVisible);

  const { ticketManager } = useTicketManager();

  // Check if cancel button should be shown
  const canCancel = ticket ? ticketManager.canCancelTicket(ticket) : false;

  // Force re-render every second when in awaiting-confirmation state to check if timer expired
  useEffect(() => {
    if (ticket?.status === 'awaiting-confirmation' && ticket.autoCompleteTimeoutAt) {
      const interval = setInterval(() => {
        forceUpdate({});
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [ticket?.status, ticket?.autoCompleteTimeoutAt]);

  // Force re-render every second when ticket can be cancelled to update cancel button visibility
  // This ensures the cancel button disappears after 5 minutes for in-progress/awaiting-confirmation tickets
  useEffect(() => {
    if (ticket && (ticket.status === 'in-progress' || ticket.status === 'awaiting-confirmation') && ticket.claimedAt) {
      const interval = setInterval(() => {
        forceUpdate({});
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [ticket?.status, ticket?.claimedAt]);

  if (!ticket) return null;

  const getTimerStartTime = (): Date => {
    // For in-progress tickets, use claimedAt (when engineer started working)
    if (ticket.status === 'in-progress' && ticket.claimedAt) {
      return ticket.claimedAt;
    }
    // For waiting tickets or fallback, use createdAt (when ticket was created)
    return ticket.createdAt;
  };

  const handleToggleChat = () => {
    // Use prop handler if provided, otherwise use local state
    if (onToggleChat) {
      onToggleChat();
    } else {
      setIsChatVisible(!isChatVisible);
    }
  };

  const handleHide = () => {
    if (onHide) {
      onHide();
    } else {
      setIsTicketVisible(false);
    }
  };

  const handleCopyTicketId = async () => {
    if (!ticket) return;

    try {
      await navigator.clipboard.writeText(ticket.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy ticket ID:', err);
    }
  };

  const getTruncatedTicketId = () => {
    if (!ticket) return '';
    const firstPart = ticket.id.split('-')[0];
    return firstPart;
  };

  const getStatusIcon = () => {
    if (shouldShowCompletedState(ticket)) {
      return <CheckCircle size={18} />;
    }

    switch (ticket.status) {
      case 'waiting':
        return <Clock size={18} />;
      case 'in-progress':
        return <Clock size={18} />;
      case 'awaiting-confirmation':
        return <CheckCircle size={18} />;
      default:
        return <Clock size={18} />;
    }
  };

  const getStatusColor = () => {
    if (shouldShowCompletedState(ticket)) {
      return 'unjam-border-green-400 unjam-bg-green-50';
    }

    switch (ticket.status) {
      case 'waiting':
        return 'unjam-border-orange-400 unjam-bg-orange-50';
      case 'in-progress':
        return 'unjam-border-orange-400 unjam-bg-orange-50';
      case 'awaiting-confirmation':
        return 'unjam-border-green-400 unjam-bg-green-50';
      default:
        return 'unjam-border-orange-400 unjam-bg-orange-50';
    }
  };

  return (
    <div data-testid="ticket-box" className={`unjam-w-80 unjam-bg-white unjam-rounded-lg unjam-shadow-lg unjam-border ${getStatusColor()} unjam-p-4 unjam-font-sans`}>
      {/* Header */}
      <div className="unjam-flex unjam-items-center unjam-justify-between unjam-mb-3">
        <div className="unjam-flex unjam-items-center unjam-gap-2">
          <span className="unjam-text-lg unjam-text-gray-700">{getStatusIcon()}</span>
          <button
            onClick={handleCopyTicketId}
            className="unjam-flex unjam-items-center unjam-gap-1 unjam-text-sm unjam-font-medium unjam-text-gray-700 hover:unjam-text-gray-900 unjam-transition-colors"
            title="Click to copy full ticket ID"
          >
            <span>Ticket {getTruncatedTicketId()}</span>
            {copied ? (
              <Check size={14} className="unjam-text-green-600" />
            ) : (
              <Copy size={14} className="unjam-opacity-60" />
            )}
          </button>
        </div>
        <button
          data-testid="ticket-box-close-button"
          onClick={handleHide}
          className="unjam-text-gray-400 hover:unjam-text-gray-600"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content based on status */}
      {ticket.status === 'waiting' && (
        <div className="unjam-text-center">
          <p className="unjam-text-gray-600 unjam-mb-2">Waiting for engineer...</p>
          <div className="unjam-text-2xl unjam-text-black unjam-font-mono unjam-mb-1">
            <Timer startTime={getTimerStartTime()} />
          </div>
          <p className="unjam-text-xs unjam-text-gray-500 unjam-mb-4">ETA is ~2:30</p>

          {canCancel && (
            <button
              onClick={handleCancelTicket}
              className="unjam-w-full unjam-text-red-600 unjam-bg-white unjam-border unjam-border-red-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-2 hover:unjam-bg-red-50"
            >
              <XCircle size={16} />
              Cancel Ticket
            </button>
          )}
        </div>
      )}

      {ticket.status === 'in-progress' && (
        <div className="unjam-text-center">
          <p className="unjam-text-gray-600 unjam-mb-2">
            {ticket.assignedTo?.name || 'Engineer'} is working on your issue
          </p>
          <div className="unjam-text-2xl unjam-text-black unjam-font-mono unjam-mb-1">
            <Timer startTime={getTimerStartTime()} />
          </div>
          <p className="unjam-text-xs unjam-text-gray-500 unjam-mb-4">ETA is ~2:30</p>

          <div className="unjam-space-y-2">
            {ticket.assignedTo && (
              <button
                onClick={handleToggleChat}
                className="unjam-w-full unjam-text-black unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-2 hover:unjam-bg-gray-50"
              >
                <MessageCircle size={16} />
                {isChatVisible ? 'Hide Chat' : 'Show Chat'}
              </button>
            )}
            <button
              onClick={handleMarkFixed}
              className="unjam-w-full unjam-text-black unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-2 hover:unjam-bg-gray-50"
            >
              <CheckCircle size={16} />
              This is fixed
            </button>
            {canCancel && (
              <button
                onClick={handleCancelTicket}
                className="unjam-w-full unjam-text-red-600 unjam-bg-white unjam-border unjam-border-red-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-2 hover:unjam-bg-red-50"
              >
                <XCircle size={16} />
                Cancel Ticket
              </button>
            )}
          </div>
        </div>
      )}

      {ticket.status === 'awaiting-confirmation' && !shouldShowCompletedState(ticket) && (
        <div className="unjam-text-center">
          <p className="unjam-text-gray-600 unjam-mb-4">Issue resolved! Please confirm:</p>
          {ticket.autoCompleteTimeoutAt && (
            <div className="unjam-text-2xl unjam-text-black unjam-font-mono unjam-mb-4">
              <CountdownTimer endTime={ticket.autoCompleteTimeoutAt} ticketStatus={ticket.status} />
            </div>
          )}

          <div className="unjam-space-y-2">
            <div className="unjam-flex unjam-gap-2">
              <button
                onClick={handleConfirmFixed}
                className="unjam-flex-1 unjam-width-half unjam-bg-white unjam-text-black unjam-border unjam-border-gray-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-1 hover:unjam-bg-gray-50"
              >
                <CheckCircle size={14} />
                Fixed
              </button>
              <button
                onClick={handleMarkStillBroken}
                className="unjam-flex-1 unjam-width-half unjam-bg-white unjam-text-black unjam-border unjam-border-gray-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-1 hover:unjam-bg-gray-50"
              >
                <X size={14} />
                No
              </button>
            </div>
            {canCancel && (
              <button
                onClick={handleCancelTicket}
                className="unjam-w-full unjam-text-red-600 unjam-bg-white unjam-border unjam-border-red-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-2 hover:unjam-bg-red-50"
              >
                <XCircle size={16} />
                Cancel Ticket
              </button>
            )}
          </div>
        </div>
      )}

      {shouldShowCompletedState(ticket) && (
        <Rating ticket={ticket} onClose={handleHide} />
      )}
    </div>
  );
};

export default TicketBox;