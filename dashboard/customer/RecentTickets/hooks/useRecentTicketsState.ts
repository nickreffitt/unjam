import { useState, useEffect } from 'react';
import { useRecentTicketsManager } from '../contexts/RecentTicketsManagerContext';
import type { Ticket, Rating } from '@common/types';

const PAGE_SIZE = 5;

interface TicketWithRating {
  ticket: Ticket;
  rating?: Rating;
}

/**
 * Hook to manage recent tickets state with pagination
 * Fetches tickets and their associated ratings in batch
 */
export const useRecentTicketsState = () => {
  const { ticketManager, ratingManager } = useRecentTicketsManager();
  const [ticketsWithRatings, setTicketsWithRatings] = useState<TicketWithRating[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTicketsAndRatings = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const offset = currentPage * PAGE_SIZE;

        // Fetch paginated tickets
        const tickets = await ticketManager.getCustomerTickets(PAGE_SIZE, offset);

        // Extract ticket IDs for batch rating fetch
        const ticketIds = tickets.map(ticket => ticket.id);

        // Fetch all ratings in one batch call
        const ratings = ticketIds.length > 0
          ? await ratingManager.getRatingsByTicketIds(ticketIds)
          : [];

        // Create a map of ticket ID to rating for quick lookup
        const ratingsByTicketId = new Map(
          ratings.map(rating => [rating.ticketId, rating])
        );

        // Combine tickets with their ratings
        const combined = tickets.map(ticket => ({
          ticket,
          rating: ratingsByTicketId.get(ticket.id)
        }));

        setTicketsWithRatings(combined);

        // TODO: Implement total count fetch for accurate pagination
        // For now, assume there might be more pages if we got a full page
        setTotalCount(tickets.length === PAGE_SIZE ? (currentPage + 2) * PAGE_SIZE : offset + tickets.length);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load recent tickets';
        console.error('[useRecentTicketsState] Error:', errorMessage);
        setError(errorMessage);
        setTicketsWithRatings([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicketsAndRatings();
  }, [ticketManager, ratingManager, currentPage]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPrevPage = currentPage > 0;

  return {
    ticketsWithRatings,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    isLoading,
    error,
    setCurrentPage
  };
};
