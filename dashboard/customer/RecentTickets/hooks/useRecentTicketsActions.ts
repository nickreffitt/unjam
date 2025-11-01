import { useCallback } from 'react';

interface UseRecentTicketsActionsProps {
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  setCurrentPage: (page: number) => void;
}

/**
 * Hook to manage recent tickets actions (pagination)
 */
export const useRecentTicketsActions = ({
  currentPage,
  hasNextPage,
  hasPrevPage,
  setCurrentPage
}: UseRecentTicketsActionsProps) => {

  const handleNextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, hasNextPage, setCurrentPage]);

  const handlePrevPage = useCallback(() => {
    if (hasPrevPage) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage, hasPrevPage, setCurrentPage]);

  const handleTicketClick = useCallback((ticketId: string) => {
    // TODO: Navigate to ticket detail view when implemented
    console.log('Ticket clicked:', ticketId);
  }, []);

  return {
    handleNextPage,
    handlePrevPage,
    handleTicketClick
  };
};
