import React from 'react';
import { ChevronLeft, ChevronRight, Clock, Star } from 'lucide-react';
import { RecentTicketsManagerProvider } from './contexts/RecentTicketsManagerContext';
import { useRecentTicketsState, useRecentTicketsActions } from './hooks';
import type { Ticket } from '@common/types';

const RecentTicketsContent: React.FC = () => {
  const {
    ticketsWithRatings,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    isLoading,
    error,
    setCurrentPage
  } = useRecentTicketsState();

  const { handleNextPage, handlePrevPage, handleTicketClick } = useRecentTicketsActions({
    currentPage,
    hasNextPage,
    hasPrevPage,
    setCurrentPage
  });

  const calculateElapsedTime = (ticket: Ticket): number => {
    // Calculate elapsed time from claimedAt to resolvedAt (or markedAsFixedAt if resolvedAt not set)
    if (!ticket.claimedAt) return 0;

    const endTime = ticket.resolvedAt || ticket.markedAsFixedAt;
    if (!endTime) return 0;

    const elapsedMs = endTime.getTime() - ticket.claimedAt.getTime();
    return Math.floor(elapsedMs / 1000); // Convert to seconds
  };

  const formatCreditsUsed = (elapsedTimeSeconds: number): string => {
    // Calculate credits based on elapsed time (1 credit per hour, max 2)
    const hours = elapsedTimeSeconds / 3600;
    const credits = Math.min(Math.ceil(hours), 2);
    return `${credits} credit${credits > 1 ? 's' : ''}`;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderStars = (ratingValue?: number) => {
    if (!ratingValue) {
      return <span className="unjam-text-gray-400 unjam-text-xs">Not rated</span>;
    }

    // Rating is 0-500, convert to 0-5 stars
    const stars = ratingValue / 100;
    const fullStars = Math.floor(stars);
    const hasHalfStar = stars % 1 >= 0.5;

    return (
      <div className="unjam-flex unjam-items-center unjam-space-x-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`unjam-h-4 unjam-w-4 ${
              i < fullStars
                ? 'unjam-text-yellow-400 unjam-fill-yellow-400'
                : i === fullStars && hasHalfStar
                ? 'unjam-text-yellow-400'
                : 'unjam-text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="unjam-bg-white unjam-shadow unjam-rounded-lg unjam-p-6">
        <h2 className="unjam-text-xl unjam-font-semibold unjam-text-gray-900 unjam-mb-4">Recent Tickets</h2>
        <div className="unjam-text-center unjam-py-8">
          <p className="unjam-text-gray-500">Loading tickets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="unjam-bg-white unjam-shadow unjam-rounded-lg unjam-p-6">
        <h2 className="unjam-text-xl unjam-font-semibold unjam-text-gray-900 unjam-mb-4">Recent Tickets</h2>
        <div className="unjam-text-center unjam-py-8">
          <p className="unjam-text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (ticketsWithRatings.length === 0) {
    return (
      <div className="unjam-bg-white unjam-shadow unjam-rounded-lg unjam-p-6">
        <h2 className="unjam-text-xl unjam-font-semibold unjam-text-gray-900 unjam-mb-4">Recent Tickets</h2>
        <div className="unjam-text-center unjam-py-8">
          <Clock className="unjam-h-12 unjam-w-12 unjam-text-gray-300 unjam-mx-auto unjam-mb-3" />
          <p className="unjam-text-gray-500">No tickets yet</p>
          <p className="unjam-text-sm unjam-text-gray-400 unjam-mt-1">
            Your recent support tickets will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="unjam-bg-white unjam-shadow unjam-rounded-lg unjam-p-6">
      <h2 className="unjam-text-xl unjam-font-semibold unjam-text-gray-900 unjam-mb-4">Recent Tickets</h2>

      {/* Tickets Table */}
      <div className="unjam-overflow-x-auto">
        <table className="unjam-min-w-full unjam-divide-y unjam-divide-gray-200">
          <thead>
            <tr>
              <th className="unjam-px-4 unjam-py-3 unjam-text-left unjam-text-xs unjam-font-medium unjam-text-gray-500 unjam-uppercase unjam-tracking-wider">
                Date
              </th>
              <th className="unjam-px-4 unjam-py-3 unjam-text-left unjam-text-xs unjam-font-medium unjam-text-gray-500 unjam-uppercase unjam-tracking-wider">
                Summary
              </th>
              <th className="unjam-px-4 unjam-py-3 unjam-text-left unjam-text-xs unjam-font-medium unjam-text-gray-500 unjam-uppercase unjam-tracking-wider">
                Status
              </th>
              <th className="unjam-px-4 unjam-py-3 unjam-text-left unjam-text-xs unjam-font-medium unjam-text-gray-500 unjam-uppercase unjam-tracking-wider">
                Credits Used
              </th>
              <th className="unjam-px-4 unjam-py-3 unjam-text-left unjam-text-xs unjam-font-medium unjam-text-gray-500 unjam-uppercase unjam-tracking-wider">
                Rating
              </th>
            </tr>
          </thead>
          <tbody className="unjam-bg-white unjam-divide-y unjam-divide-gray-200">
            {ticketsWithRatings.map(({ ticket, rating }) => (
              <tr
                key={ticket.id}
                onClick={() => handleTicketClick(ticket.id)}
                className="hover:unjam-bg-gray-50 unjam-cursor-pointer unjam-transition-colors"
              >
                <td className="unjam-px-4 unjam-py-3 unjam-whitespace-nowrap unjam-text-sm unjam-text-gray-500">
                  {formatDate(ticket.createdAt)}
                </td>
                <td className="unjam-px-4 unjam-py-3 unjam-text-sm unjam-text-gray-900">
                  <div className="unjam-max-w-md unjam-truncate">{ticket.summary}</div>
                </td>
                <td className="unjam-px-4 unjam-py-3 unjam-whitespace-nowrap unjam-text-sm">
                  <span
                    className={`unjam-px-2 unjam-py-1 unjam-rounded-full unjam-text-xs unjam-font-medium ${
                      ticket.status === 'completed' || ticket.status === 'auto-completed'
                        ? 'unjam-bg-green-100 unjam-text-green-800'
                        : ticket.status === 'in-progress'
                        ? 'unjam-bg-blue-100 unjam-text-blue-800'
                        : ticket.status === 'waiting'
                        ? 'unjam-bg-yellow-100 unjam-text-yellow-800'
                        : 'unjam-bg-gray-100 unjam-text-gray-800'
                    }`}
                  >
                    {ticket.status}
                  </span>
                </td>
                <td className="unjam-px-4 unjam-py-3 unjam-whitespace-nowrap unjam-text-sm unjam-text-gray-500">
                  {(ticket.status === 'completed' || ticket.status === 'auto-completed')
                    ? formatCreditsUsed(calculateElapsedTime(ticket))
                    : '-'}
                </td>
                <td className="unjam-px-4 unjam-py-3 unjam-whitespace-nowrap unjam-text-sm">
                  {renderStars(rating?.rating)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="unjam-flex unjam-items-center unjam-justify-between unjam-mt-4 unjam-pt-4 unjam-border-t unjam-border-gray-200">
          <button
            onClick={handlePrevPage}
            disabled={!hasPrevPage}
            className={`unjam-flex unjam-items-center unjam-space-x-1 unjam-px-3 unjam-py-1 unjam-rounded unjam-text-sm ${
              !hasPrevPage
                ? 'unjam-text-gray-400 unjam-cursor-not-allowed'
                : 'unjam-text-gray-700 hover:unjam-bg-gray-100 unjam-transition-colors'
            }`}
          >
            <ChevronLeft className="unjam-h-4 unjam-w-4" />
            <span>Previous</span>
          </button>
          <span className="unjam-text-sm unjam-text-gray-600">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={!hasNextPage}
            className={`unjam-flex unjam-items-center unjam-space-x-1 unjam-px-3 unjam-py-1 unjam-rounded unjam-text-sm ${
              !hasNextPage
                ? 'unjam-text-gray-400 unjam-cursor-not-allowed'
                : 'unjam-text-gray-700 hover:unjam-bg-gray-100 unjam-transition-colors'
            }`}
          >
            <span>Next</span>
            <ChevronRight className="unjam-h-4 unjam-w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

const RecentTickets: React.FC = () => {
  return (
    <RecentTicketsManagerProvider>
      <RecentTicketsContent />
    </RecentTicketsManagerProvider>
  );
};

export default RecentTickets;
