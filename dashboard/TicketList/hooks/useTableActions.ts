import { useNavigate } from 'react-router-dom';

export interface UseTableActionsReturn {
  handleClaim: (ticketId: string, onClaimed?: (ticketId: string) => void) => void;
  handleViewDetails: (ticketId: string, basePath: string) => void;
  handleChat: (ticketId: string) => void;
}

export const useTableActions = (): UseTableActionsReturn => {
  const navigate = useNavigate();

  const handleClaim = (ticketId: string, onClaimed?: (ticketId: string) => void) => {
    console.info('Claiming ticket:', ticketId);

    // Call the onClaimed callback to update local state
    if (onClaimed) {
      onClaimed(ticketId);
    }

    // Navigate to the active ticket view
    navigate(`/active/${ticketId}`);
  };

  const handleViewDetails = (ticketId: string, basePath: string) => {
    navigate(`${basePath}/${ticketId}`);
  };

  const handleChat = (ticketId: string) => {
    navigate(`/active/${ticketId}`);
  };

  return {
    handleClaim,
    handleViewDetails,
    handleChat
  };
};