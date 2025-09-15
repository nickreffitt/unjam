import React, { useState } from 'react';
import TicketBox, { type Ticket, type TicketStatus } from '@extension/components/TicketBox/TicketBox';
import TicketModal from '@extension/components/TicketModal/TicketModal';
import type { CustomerProfile } from '@common';
import '@extension/styles.css';

const CustomerExtension: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [isTicketVisible, setIsTicketVisible] = useState(true);

  // Create a mock customer profile for development
  const customerProfile: CustomerProfile = {
    id: 'CUST-DEV-001',
    name: 'Development Customer',
    type: 'customer',
    email: 'dev@customer.com'
  };

  const handleTicketCreated = (ticketId: string) => {
    console.info('Ticket created with ID:', ticketId);
    // In a real implementation, we might fetch the ticket or receive it via real-time updates
    // For now, create a basic ticket representation
    const newTicket: Ticket = {
      id: ticketId,
      status: 'waiting' as TicketStatus,
      createdAt: new Date(),
    };

    setCurrentTicket(newTicket);
    setIsTicketVisible(true);
    setIsModalOpen(false);
  };

  const handleTicketHide = () => {
    setIsTicketVisible(false);
  };

  const handleCreateNewTicketClick = () => {
    // If ticket exists and is not resolved, just show the existing ticket
    if (currentTicket && currentTicket.status !== 'resolved') {
      setIsTicketVisible(true);
    } else {
      // Only allow creating new ticket if no ticket exists or current ticket is resolved
      setIsModalOpen(true);
    }
  };

  const handleMarkFixed = () => {
    if (currentTicket) {
      const updatedTicket: Ticket = {
        ...currentTicket,
        status: 'resolved' as TicketStatus,
      };
      setCurrentTicket(updatedTicket);
      console.info('Customer marked ticket as fixed');
    }
  };

  const handleConfirmFixed = () => {
    if (currentTicket) {
      const updatedTicket: Ticket = {
        ...currentTicket,
        status: 'resolved' as TicketStatus,
      };
      setCurrentTicket(updatedTicket);
      console.info('Customer confirmed fix');
    }
  };

  const handleMarkStillBroken = () => {
    if (currentTicket) {
      const updatedTicket: Ticket = {
        ...currentTicket,
        status: 'active' as TicketStatus,
      };
      setCurrentTicket(updatedTicket);
      console.info('Customer marked as still broken');
    }
  };

  const handleSubmitRating = (rating: number, feedback?: string) => {
    console.info('Rating submitted:', { rating, feedback });
    setCurrentTicket(null);
    setIsTicketVisible(false);
  };


  const getButtonText = () => {
    // If ticket exists and is not resolved, show "Show Active Ticket"
    if (currentTicket && currentTicket.status !== 'resolved') {
      return 'Show Active Ticket';
    }
    // If no ticket exists or ticket is resolved, allow creating new ticket
    return 'Create New Ticket';
  };

  return (
    <div className="unjam-min-h-screen unjam-bg-gray-100 unjam-flex unjam-items-center unjam-justify-center unjam-font-sans">
      <div className="unjam-text-center">
        <h1 className="unjam-text-3xl unjam-font-bold unjam-text-gray-800 unjam-mb-8">
          Customer Support
        </h1>
        
        <button
          onClick={handleCreateNewTicketClick}
          className="unjam-bg-blue-600 hover:unjam-bg-blue-700 unjam-text-white unjam-font-semibold unjam-py-3 unjam-px-6 unjam-rounded-lg unjam-shadow-lg unjam-transition-colors"
        >
          {getButtonText()}
        </button>
        
        {/* Debug controls for testing different states */}
        {process.env.NODE_ENV === 'development' && currentTicket && (
          <div className="unjam-mt-8 unjam-p-4 unjam-bg-white unjam-rounded-lg unjam-shadow unjam-max-w-sm unjam-mx-auto">
            <h3 className="unjam-font-semibold unjam-mb-2">Debug Controls</h3>
            <div className="unjam-space-y-2">
              <button
                onClick={() => setCurrentTicket({...currentTicket, status: 'waiting'})}
                className="unjam-block unjam-w-full unjam-text-sm unjam-bg-orange-200 hover:unjam-bg-orange-300 unjam-px-2 unjam-py-1 unjam-rounded"
              >
                Set to Waiting
              </button>
              <button
                onClick={() => setCurrentTicket({
                  ...currentTicket, 
                  status: 'active',
                  engineerName: 'John',
                  claimedAt: new Date()
                })}
                className="unjam-block unjam-w-full unjam-text-sm unjam-bg-blue-200 hover:unjam-bg-blue-300 unjam-px-2 unjam-py-1 unjam-rounded"
              >
                Set to Active (John)
              </button>
              <button
                onClick={() => setCurrentTicket({...currentTicket, status: 'marked_resolved'})}
                className="unjam-block unjam-w-full unjam-text-sm unjam-bg-green-200 hover:unjam-bg-green-300 unjam-px-2 unjam-py-1 unjam-rounded"
              >
                Set to Marked Resolved
              </button>
              <button
                onClick={() => setCurrentTicket({...currentTicket, status: 'resolved'})}
                className="unjam-block unjam-w-full unjam-text-sm unjam-bg-purple-200 hover:unjam-bg-purple-300 unjam-px-2 unjam-py-1 unjam-rounded"
              >
                Set to Resolved
              </button>
            </div>
          </div>
        )}
      </div>

      <TicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customerProfile={customerProfile}
        onTicketCreated={handleTicketCreated}
      />

      {currentTicket && isTicketVisible && (
        <TicketBox
          ticket={currentTicket}
          onHide={handleTicketHide}
          onMarkFixed={handleMarkFixed}
          onConfirmFixed={handleConfirmFixed}
          onMarkStillBroken={handleMarkStillBroken}
          onSubmitRating={handleSubmitRating}
        />
      )}
    </div>
  );
};

export default CustomerExtension;