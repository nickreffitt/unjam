import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, MessageCircle, X, Star, Copy, Check } from 'lucide-react';
import { type Ticket } from '@common/types';
import { useTicketState } from '@extension/Ticket/hooks/useTicketState';
import { useTicketActions } from '@extension/Ticket/hooks/useTicketActions';

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

const TicketBox: React.FC<TicketBoxProps> = ({
  ticket,
  onHide,
  isChatVisible: chatVisibleProp,
  onToggleChat
}) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied] = useState(false);

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
    handleSubmitRating
  } = useTicketActions(ticket, setActiveTicket, setIsTicketVisible);

  if (!ticket) return null;

  const getTimerStartTime = (): Date => {
    // For in-progress tickets, use claimedAt (when engineer started working)
    if (ticket.status === 'in-progress' && ticket.claimedAt) {
      return ticket.claimedAt;
    }
    // For waiting tickets or fallback, use createdAt (when ticket was created)
    return ticket.createdAt;
  };

  const handleRatingSubmit = () => {
    handleSubmitRating(rating, feedback);
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

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => (
      <button
        key={index}
        onClick={() => setRating(index + 1)}
        className={`unjam-transition-colors ${
          index < rating ? 'unjam-text-yellow-400' : 'unjam-text-gray-300'
        }`}
      >
        <Star size={24} fill={index < rating ? 'currentColor' : 'none'} />
      </button>
    ));
  };

  const getStatusIcon = () => {
    switch (ticket.status) {
      case 'waiting':
        return <Clock size={18} />;
      case 'in-progress':
        return <Clock size={18} />;
      case 'awaiting-confirmation':
        return <CheckCircle size={18} />;
      case 'completed':
      case 'auto-completed':
        return <CheckCircle size={18} />;
      default:
        return <Clock size={18} />;
    }
  };

  const getStatusColor = () => {
    switch (ticket.status) {
      case 'waiting':
        return 'unjam-border-orange-400 unjam-bg-orange-50';
      case 'in-progress':
        return 'unjam-border-orange-400 unjam-bg-orange-50';
      case 'awaiting-confirmation':
        return 'unjam-border-green-400 unjam-bg-green-50';
      case 'completed':
      case 'auto-completed':
        return 'unjam-border-green-400 unjam-bg-green-50';
      default:
        return 'unjam-border-orange-400 unjam-bg-orange-50';
    }
  };

  return (
    <div data-testid="ticket-box" className={`unjam-w-120 unjam-bg-white unjam-rounded-lg unjam-shadow-lg unjam-border ${getStatusColor()} unjam-p-4 unjam-font-sans`}>
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
          <p className="unjam-text-xs unjam-text-gray-500">ETA is ~2:30</p>
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
          </div>
        </div>
      )}

      {ticket.status === 'awaiting-confirmation' && (
        <div className="unjam-text-center">
          <p className="unjam-text-gray-600 unjam-mb-4">Issue resolved! Please confirm:</p>
          
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
        </div>
      )}

      {(ticket.status === 'completed' || ticket.status === 'auto-completed') && (
        <div>
          <p className="unjam-text-gray-700 unjam-mb-4 unjam-font-medium">Rate your experience:</p>
          
          <div className="unjam-flex unjam-justify-center unjam-gap-1 unjam-mb-4">
            {renderStars()}
          </div>
          
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your feedback (optional)"
            className="unjam-w-full unjam-bg-white unjam-text-black unjam-p-2 unjam-border unjam-border-gray-300 unjam-rounded unjam-text-sm unjam-resize-none unjam-mb-4"
            rows={3}
          />
          
          <button
            onClick={handleRatingSubmit}
            className="unjam-w-full unjam-bg-gray-600 unjam-text-white unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm hover:unjam-bg-gray-700"
          >
            Submit Rating
          </button>
        </div>
      )}
    </div>
  );
};

export default TicketBox;