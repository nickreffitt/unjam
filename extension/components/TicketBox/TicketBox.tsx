import React, { useState, useEffect } from 'react';

export type TicketStatus = 'waiting' | 'active' | 'marked_resolved' | 'resolved';

export interface Ticket {
  id: string;
  status: TicketStatus;
  engineerName?: string;
  createdAt: Date;
  claimedAt?: Date;
  abandonedAt?: Date;
}

interface TicketBoxProps {
  ticket: Ticket | null;
  onHide: () => void;
  onMarkFixed: () => void;
  onConfirmFixed: () => void;
  onMarkStillBroken: () => void;
  onSubmitRating: (rating: number, feedback?: string) => void;
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
  onMarkFixed,
  onConfirmFixed,
  onMarkStillBroken,
  onSubmitRating
}) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  if (!ticket) return null;

  const getTimerStartTime = (): Date => {
    if (ticket.status === 'active' && ticket.claimedAt) {
      return ticket.claimedAt;
    }
    return ticket.createdAt;
  };

  const handleRatingSubmit = () => {
    onSubmitRating(rating, feedback);
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => (
      <button
        key={index}
        onClick={() => setRating(index + 1)}
        className={`unjam-text-2xl unjam-transition-colors ${
          index < rating ? 'unjam-text-yellow-400' : 'unjam-text-gray-300'
        }`}
      >
        ★
      </button>
    ));
  };

  const getStatusIcon = () => {
    switch (ticket.status) {
      case 'waiting':
        return '⏱';
      case 'active':
        return '⏱';
      case 'marked_resolved':
        return '✅';
      case 'resolved':
        return '✅';
      default:
        return '⏱';
    }
  };

  const getStatusColor = () => {
    switch (ticket.status) {
      case 'waiting':
        return 'unjam-border-orange-400 unjam-bg-orange-50';
      case 'active':
        return 'unjam-border-orange-400 unjam-bg-orange-50';
      case 'marked_resolved':
        return 'unjam-border-green-400 unjam-bg-green-50';
      case 'resolved':
        return 'unjam-border-green-400 unjam-bg-green-50';
      default:
        return 'unjam-border-orange-400 unjam-bg-orange-50';
    }
  };

  return (
    <div className={`unjam-fixed unjam-bottom-4 unjam-right-4 unjam-w-80 unjam-bg-white unjam-rounded-lg unjam-shadow-lg unjam-border-2 ${getStatusColor()} unjam-p-4 unjam-font-sans`}>
      {/* Header */}
      <div className="unjam-flex unjam-items-center unjam-justify-between unjam-mb-3">
        <div className="unjam-flex unjam-items-center unjam-gap-2">
          <span className="unjam-text-lg">{getStatusIcon()}</span>
          <span className="unjam-text-sm unjam-font-medium unjam-text-gray-700">
            Ticket {ticket.id}
          </span>
        </div>
        <button
          onClick={onHide}
          className="unjam-text-gray-400 hover:unjam-text-gray-600 unjam-text-lg unjam-font-bold"
        >
          ×
        </button>
      </div>

      {/* Content based on status */}
      {ticket.status === 'waiting' && (
        <div className="unjam-text-center">
          <p className="unjam-text-gray-600 unjam-mb-2">Waiting for engineer...</p>
          <div className="unjam-text-2xl unjam-font-mono unjam-mb-1">
            <Timer startTime={getTimerStartTime()} />
          </div>
          <p className="unjam-text-xs unjam-text-gray-500">ETA is ~2:30</p>
        </div>
      )}

      {ticket.status === 'active' && (
        <div className="unjam-text-center">
          <p className="unjam-text-gray-600 unjam-mb-2">
            {ticket.engineerName} is working on your issue
          </p>
          <div className="unjam-text-2xl unjam-font-mono unjam-mb-1">
            <Timer startTime={getTimerStartTime()} />
          </div>
          <p className="unjam-text-xs unjam-text-gray-500 unjam-mb-4">ETA is ~2:30</p>
          
          <div className="unjam-space-y-2">
            <button className="unjam-w-full unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-2 hover:unjam-bg-gray-50">
              💬 Hide Chat
            </button>
            <button 
              onClick={onMarkFixed}
              className="unjam-w-full unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-2 hover:unjam-bg-gray-50"
            >
              ✅ This is fixed
            </button>
          </div>
        </div>
      )}

      {ticket.status === 'marked_resolved' && (
        <div className="unjam-text-center">
          <p className="unjam-text-gray-600 unjam-mb-4">Issue resolved! Please confirm:</p>
          
          <div className="unjam-flex unjam-gap-2">
            <button 
              onClick={onConfirmFixed}
              className="unjam-flex-1 unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-1 hover:unjam-bg-gray-50"
            >
              ✅ Yes, it's fixed!
            </button>
            <button 
              onClick={onMarkStillBroken}
              className="unjam-flex-1 unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm unjam-flex unjam-items-center unjam-justify-center unjam-gap-1 hover:unjam-bg-gray-50"
            >
              × Still broken
            </button>
          </div>
        </div>
      )}

      {ticket.status === 'resolved' && (
        <div>
          <p className="unjam-text-gray-700 unjam-mb-4 unjam-font-medium">Rate your experience:</p>
          
          <div className="unjam-flex unjam-justify-center unjam-gap-1 unjam-mb-4">
            {renderStars()}
          </div>
          
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your feedback (optional)"
            className="unjam-w-full unjam-p-2 unjam-border unjam-border-gray-300 unjam-rounded unjam-text-sm unjam-resize-none unjam-mb-4"
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