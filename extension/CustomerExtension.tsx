import React, { useState, useRef } from 'react';
import TicketBox from '@extension/Ticket/components/TicketBox/TicketBox';
import TicketModal from '@extension/Ticket/components/TicketModal/TicketModal';
import ChatBox, { type ChatBoxRef } from '@extension/ChatBox/ChatBox';
import type { TicketStatus, Ticket } from '@common/types';
import { useTicketManager } from '@extension/Ticket/contexts/TicketManagerContext';
import { useUserProfile } from '@extension/shared/UserProfileContext';
import { useTicketState } from '@extension/Ticket/hooks';
import { useChatManager } from '@extension/ChatBox/contexts/ChatManagerContext';
import '@extension/styles.css';

const CustomerExtension: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTicketVisible, setIsTicketVisible] = useState(true);
  const chatBoxRef = useRef<ChatBoxRef>(null);

  // Get customer profile and ticket manager from contexts
  const { customerProfile } = useUserProfile();
  const { ticketManager, ticketStore } = useTicketManager();
  const { createChatStore } = useChatManager();

  // Use dedicated hooks for state
  const { activeTicket, setActiveTicket, isChatVisible, setIsChatVisible } = useTicketState();

  const handleTicketCreated = (ticketId: string) => {
    console.debug('Ticket created with ID:', ticketId);
    // Since storage events only work cross-tab, manually get the created ticket and update context
    const createdTicket = ticketManager.getActiveTicket();
    if (createdTicket) {
      console.debug('Setting active ticket in context:', createdTicket.id);
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
      console.debug('Customer marked ticket as fixed');
    }
  };

  const handleConfirmFixed = async () => {
    if (activeTicket) {
      try {
        const updatedTicket = await ticketManager.markAsResolved(activeTicket.id);
        // Manually update context for same-tab updates (storage events only work cross-tab)
        setActiveTicket(updatedTicket);
        console.debug('Customer confirmed fix');
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
        console.debug('Customer marked as still broken');
      } catch (error) {
        console.error('Failed to mark as still broken:', error);
      }
    }
  };

  const handleSubmitRating = (rating: number, feedback?: string) => {
    console.debug('Rating submitted:', { rating, feedback });
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

  const generateRandomMessage = () => {
    const words = [
      'thanks', 'for', 'helping', 'me', 'yes', 'that', 'fixed', 'it', 'no', 'still', 'broken',
      'I', 'see', 'the', 'issue', 'now', 'oh', 'okay', 'let', 'me', 'try', 'that',
      'working', 'on', 'it', 'hmm', 'interesting', 'perfect', 'great', 'awesome', 'nice',
      'understood', 'got', 'it', 'makes', 'sense', 'thank', 'you', 'so', 'much'
    ];

    try {
      const messageLength = Math.floor(Math.random() * 10) + 2; // 2 to 12 words
      const selectedWords = [];

      for (let i = 0; i < messageLength; i++) {
        const randomIndex = Math.floor(Math.random() * words.length);
        const selectedWord = words[randomIndex];
        if (selectedWord) {
          selectedWords.push(selectedWord);
        }
      }

      if (selectedWords.length === 0) {
        return 'Thanks for the help!';
      }

      return `${selectedWords.join(' ')}.`;
    } catch (error) {
      console.error('Error generating random message:', error);
      return 'Thanks for the help!';
    }
  };

  const handleSendRandomEngineerMessage = () => {
    const randomMessage = generateRandomMessage();
    console.debug('Generated engineer message:', randomMessage);

    if (randomMessage && typeof randomMessage === 'string' && chatBoxRef.current) {
      chatBoxRef.current.injectEngineerMessage(randomMessage);
    } else {
      console.error('Failed to generate valid message or chat not available');
    }
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
              <button
                onClick={() => setIsChatVisible(!isChatVisible)}
                className={`unjam-block unjam-w-full unjam-text-sm unjam-px-2 unjam-py-1 unjam-rounded unjam-font-medium ${
                  isChatVisible
                    ? 'unjam-bg-red-200 hover:unjam-bg-red-300'
                    : 'unjam-bg-teal-200 hover:unjam-bg-teal-300'
                }`}
              >
                {isChatVisible ? 'Hide Chat' : 'Show Chat'}
              </button>
              {isChatVisible && (
                <>
                  <button
                    onClick={handleSendRandomEngineerMessage}
                    className="unjam-block unjam-w-full unjam-text-sm unjam-bg-indigo-200 hover:unjam-bg-indigo-300 unjam-px-2 unjam-py-1 unjam-rounded unjam-mt-2 unjam-font-medium"
                  >
                    Send Random Engineer Message
                  </button>
                  <button
                    onClick={() => {
                      if (activeTicket && activeTicket.assignedTo) {
                        console.debug('Debug: Triggering engineer typing indicator for customer to see');
                        const chatStore = createChatStore(activeTicket.id);
                        chatStore.markIsTyping(activeTicket.assignedTo);
                        // Also trigger same-tab UI update
                        if (chatBoxRef.current) {
                          chatBoxRef.current.triggerTypingIndicator(activeTicket.assignedTo);
                        }
                      } else {
                        console.warn('Debug: No active ticket or assigned engineer for typing simulation');
                      }
                    }}
                    className="unjam-block unjam-w-full unjam-text-sm unjam-bg-yellow-200 hover:unjam-bg-yellow-300 unjam-px-2 unjam-py-1 unjam-rounded unjam-mt-2 unjam-font-medium"
                  >
                    Trigger Engineer Typing
                  </button>
                </>
              )}
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

      {/* Stacked container for ChatBox and TicketBox */}
      <div className="unjam-fixed unjam-bottom-4 unjam-right-4 unjam-flex unjam-flex-col unjam-gap-4">
        {isChatVisible && activeTicket && activeTicket.assignedTo && (
          <ChatBox
            ref={chatBoxRef}
            ticketId={activeTicket.id}
            engineerName={activeTicket.assignedTo.name}
            engineerProfile={activeTicket.assignedTo}
            onClose={() => setIsChatVisible(false)}
          />
        )}

        {activeTicket && isTicketVisible && (
          <TicketBox
            ticket={activeTicket}
            onHide={handleTicketHide}
            onMarkFixed={handleMarkFixed}
            onConfirmFixed={handleConfirmFixed}
            onMarkStillBroken={handleMarkStillBroken}
            onSubmitRating={handleSubmitRating}
            onToggleChat={() => setIsChatVisible(!isChatVisible)}
            isChatVisible={isChatVisible}
          />
        )}
      </div>
    </div>
  );
};

export default CustomerExtension;