import React, { useState } from 'react';
import TicketBox from '@extension/components/TicketBox/TicketBox';
import TicketModal from '@extension/components/TicketModal/TicketModal';
import type { TicketStatus, Ticket } from '@common/types';
import { useTicketManager } from '@extension/contexts/TicketManagerContext';
import { useUserProfile } from '@extension/shared/UserProfileContext';
import { useTicketState } from '@extension/hooks';
import '@extension/styles.css';

const CustomerExtension: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTicketVisible, setIsTicketVisible] = useState(true);

  // Get customer profile and ticket manager from contexts
  const { customerProfile } = useUserProfile();
  const { ticketManager, ticketStore } = useTicketManager();

  // Use dedicated hooks for state
  const { activeTicket, setActiveTicket } = useTicketState();

  const handleTicketCreated = (ticketId: string) => {
    console.info('Ticket created with ID:', ticketId);
    // Since storage events only work cross-tab, manually get the created ticket and update context
    const createdTicket = ticketManager.getActiveTicket();
    if (createdTicket) {
      console.info('Setting active ticket in context:', createdTicket.id);
      setActiveTicket(createdTicket);
    } else {
      console.warn('No active ticket found after creation');
    }
    // Close the modal and show the ticket
    setIsTicketVisible(true);
    setIsModalOpen(false);
  };

  const handleTicketHide = () => {
    setIsTicketVisible(false);
  };

  const handleCreateNewTicketClick = () => {
    // If ticket exists and is not resolved, just show the existing ticket
    if (activeTicket && activeTicket.status !== 'completed' && activeTicket.status !== 'auto-completed') {
      setIsTicketVisible(true);
    } else {
      // Only allow creating new ticket if no ticket exists or current ticket is completed
      setIsModalOpen(true);
    }
  };

  const handleMarkFixed = () => {
    if (activeTicket) {
      const updatedTicket = {
        ...activeTicket,
        status: 'completed' as TicketStatus,
      };
      ticketStore.update(activeTicket.id, updatedTicket);
      // Manually update context for same-tab updates (storage events only work cross-tab)
      setActiveTicket(updatedTicket);
      console.info('Customer marked ticket as fixed');
    }
  };

  const handleConfirmFixed = async () => {
    if (activeTicket) {
      try {
        const updatedTicket = await ticketManager.markAsResolved(activeTicket.id);
        // Manually update context for same-tab updates (storage events only work cross-tab)
        setActiveTicket(updatedTicket);
        console.info('Customer confirmed fix');
      } catch (error) {
        console.error('Failed to confirm fix:', error);
      }
    }
  };

  const handleMarkStillBroken = async () => {
    if (activeTicket) {
      try {
        const updatedTicket = await ticketManager.markStillBroken(activeTicket.id);
        // Manually update context for same-tab updates (storage events only work cross-tab)
        setActiveTicket(updatedTicket);
        console.info('Customer marked as still broken');
      } catch (error) {
        console.error('Failed to mark as still broken:', error);
      }
    }
  };

  const handleSubmitRating = (rating: number, feedback?: string) => {
    console.info('Rating submitted:', { rating, feedback });
    setActiveTicket(null);
    setIsTicketVisible(false);
  };


  const getButtonText = () => {
    // If ticket exists and is not completed, show "Show Active Ticket"
    if (activeTicket && activeTicket.status !== 'completed' && activeTicket.status !== 'auto-completed') {
      return 'Show Active Ticket';
    }
    // If no ticket exists or ticket is completed, allow creating new ticket
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
        {process.env.NODE_ENV === 'development' && activeTicket && (
          <div className="unjam-mt-8 unjam-p-4 unjam-bg-white unjam-rounded-lg unjam-shadow unjam-max-w-sm unjam-mx-auto">
            <h3 className="unjam-font-semibold unjam-mb-2">Debug Controls</h3>
            <div className="unjam-space-y-2">
              <button
                onClick={() => {
                  if (activeTicket) {
                    const updatedTicket = { ...activeTicket, status: 'waiting' as TicketStatus };
                    ticketStore.update(activeTicket.id, updatedTicket);
                    // Manually update context for same-tab updates (storage events only work cross-tab)
                    setActiveTicket(updatedTicket);
                  }
                }}
                className="unjam-block unjam-w-full unjam-text-sm unjam-bg-orange-200 hover:unjam-bg-orange-300 unjam-px-2 unjam-py-1 unjam-rounded"
              >
                Set to Waiting
              </button>
              <button
                onClick={() => {
                  if (activeTicket) {
                    const updatedTicket = {
                      ...activeTicket,
                      status: 'in-progress' as TicketStatus,
                      assignedTo: {
                        id: 'ENG-001',
                        name: 'John',
                        type: 'engineer' as const,
                        email: 'john@engineer.com'
                      },
                      claimedAt: new Date()
                    };
                    ticketStore.update(activeTicket.id, updatedTicket);
                    // Manually update context for same-tab updates (storage events only work cross-tab)
                    setActiveTicket(updatedTicket);
                  }
                }}
                className="unjam-block unjam-w-full unjam-text-sm unjam-bg-blue-200 hover:unjam-bg-blue-300 unjam-px-2 unjam-py-1 unjam-rounded"
              >
                Set to In Progress (John)
              </button>
              <button
                onClick={() => {
                  if (activeTicket) {
                    // Calculate auto-complete timeout
                    const timeoutMinutes = Number((import.meta as { env?: Record<string, string> }).env?.VITE_AUTO_COMPLETE_TIMEOUT_MINUTES) || 30;
                    const now = new Date();
                    const autoCompleteTimeoutAt = new Date(now.getTime() + (timeoutMinutes * 60 * 1000));

                    const updatedTicket: Ticket = { 
                      ...activeTicket, 
                      status: 'awaiting-confirmation',
                      markedAsFixedAt: new Date(),
                      autoCompleteTimeoutAt,
                    };
                    ticketStore.update(activeTicket.id, updatedTicket);
                    // Manually update context for same-tab updates (storage events only work cross-tab)
                    setActiveTicket(updatedTicket);
                  }
                }}
                className="unjam-block unjam-w-full unjam-text-sm unjam-bg-green-200 hover:unjam-bg-green-300 unjam-px-2 unjam-py-1 unjam-rounded"
              >
                Set to Awaiting Confirmation
              </button>
              <button
                onClick={() => {
                  if (activeTicket) {
                    const updatedTicket = { 
                      ...activeTicket, 
                      status: 'completed' as TicketStatus,  
                      resolvedAt: new Date()
                    };
                    ticketStore.update(activeTicket.id, updatedTicket);
                    // Manually update context for same-tab updates (storage events only work cross-tab)
                    setActiveTicket(updatedTicket);
                  }
                }}
                className="unjam-block unjam-w-full unjam-text-sm unjam-bg-purple-200 hover:unjam-bg-purple-300 unjam-px-2 unjam-py-1 unjam-rounded"
              >
                Set to Completed
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

      {activeTicket && isTicketVisible && (
        <TicketBox
          ticket={activeTicket}
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