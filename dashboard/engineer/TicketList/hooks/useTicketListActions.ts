import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { type Ticket, type CustomerProfile } from '@common/types';
import { useTicketManager } from '@dashboard/engineer/Ticket/contexts/TicketManagerContext';

export interface UseTicketListActionsReturn {
  handleClaim: (ticketId: string, onClaimed?: (ticketId: string) => void) => void;
  handleViewDetails: (ticketId: string, basePath: string) => void;
  handleChat: (ticketId: string) => void;
  createTestTicket: (refreshTickets: () => void) => void;
}

export const useTicketListActions = (): UseTicketListActionsReturn => {
  const navigate = useNavigate();
  const { ticketStore } = useTicketManager();

  // Create a mock customer profile for creating test tickets
  const mockCustomer: CustomerProfile = useMemo(() => ({
    id: 'CUST-DEBUG-001',
    name: 'Debug Customer',
    type: 'customer',
    email: 'debug@test.com'
  }), []);

  const handleClaim = (ticketId: string, onClaimed?: (ticketId: string) => void) => {
    console.debug('Claiming ticket:', ticketId);

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

  const createTestTicket = (refreshTickets: () => void) => {
    if (!ticketStore) {
      console.error('No ticket store available');
      return;
    }

    const timestamp = Date.now();
    const testTicket: Ticket = {
      id: `TKT-TEST-${timestamp}`,
      status: 'waiting',
      summary: `Test issue #${timestamp}`,
      estimatedTime: '5-10 min',
      problemDescription: `Test issue #${timestamp}: This is a sample ticket created for testing purposes. The user is experiencing a sample problem that needs engineer attention.`,
      createdBy: mockCustomer,
      createdAt: new Date(),
      elapsedTime: Math.floor(Math.random() * 300) // Random elapsed time for variety
    };

    // Add the test ticket to the shared TicketStore instance
    ticketStore.create(testTicket);
    console.debug('Created test ticket:', testTicket);

    // Directly refresh the current tab since storage events only work cross-tab
    refreshTickets();
  };

  return {
    handleClaim,
    handleViewDetails,
    handleChat,
    createTestTicket
  };
};