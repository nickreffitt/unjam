import React, { forwardRef, useImperativeHandle, useCallback } from 'react';
import { type Ticket, type TicketStatus } from '@common/types';
import { useTicketManager } from '@extension/Ticket/contexts/TicketManagerContext';
import { useTicketState } from '@extension/Ticket/hooks/useTicketState';

interface DebugTicketProps {
  className?: string;
}

export interface DebugTicketRef {
  // Could add methods here if needed in the future
}

const AUTO_COMPLETE_TIMEOUT_MINUTES = 30;

const DebugTicket = forwardRef<DebugTicketRef, DebugTicketProps>(({
  className = ''
}, ref) => {
  // Get ticket state and store from hooks
  const { activeTicket, setActiveTicket } = useTicketState();
  const { ticketStore } = useTicketManager();

  // Expose functions via ref (if needed in the future)
  useImperativeHandle(ref, () => ({}), []);

  const handleSetToWaiting = useCallback(() => {
    if (activeTicket) {
      const updatedTicket = { ...activeTicket, status: 'waiting' as TicketStatus };
      ticketStore.update(activeTicket.id, updatedTicket);
      // Manually update context for same-tab updates (storage events only work cross-tab)
      setActiveTicket(updatedTicket);
      console.debug('DebugTicket: Set ticket to waiting');
    }
  }, [activeTicket, ticketStore, setActiveTicket]);

  const handleSetToInProgress = useCallback(() => {
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
      console.debug('DebugTicket: Set ticket to in-progress with engineer John');
    }
  }, [activeTicket, ticketStore, setActiveTicket]);

  const handleSetToAwaitingConfirmation = useCallback(() => {
    if (activeTicket) {
      // Calculate auto-complete timeout
      const timeoutMinutes = AUTO_COMPLETE_TIMEOUT_MINUTES;
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
      console.debug('DebugTicket: Set ticket to awaiting-confirmation');
    }
  }, [activeTicket, ticketStore, setActiveTicket]);

  const handleSetToCompleted = useCallback(() => {
    if (activeTicket) {
      const updatedTicket = {
        ...activeTicket,
        status: 'completed' as TicketStatus,
        resolvedAt: new Date()
      };
      ticketStore.update(activeTicket.id, updatedTicket);
      // Manually update context for same-tab updates (storage events only work cross-tab)
      setActiveTicket(updatedTicket);
      console.debug('DebugTicket: Set ticket to completed');
    }
  }, [activeTicket, ticketStore, setActiveTicket]);

  // Don't render if there's no active ticket
  if (!activeTicket) {
    return null;
  }

  return (
    <div data-testid="debug-ticket" className={`unjam-w-120 unjam-bg-white unjam-rounded-lg unjam-shadow unjam-border unjam-border-gray-300 unjam-p-4 unjam-font-sans ${className}`}>
      <h3 className="unjam-font-semibold unjam-mb-3 unjam-text-gray-800">Debug Ticket Controls</h3>

      <div className="unjam-space-y-3">
        <button
          onClick={handleSetToWaiting}
          className="unjam-block unjam-w-full unjam-text-sm unjam-bg-orange-200 hover:unjam-bg-orange-300 unjam-px-3 unjam-py-2 unjam-rounded unjam-font-medium"
        >
          Set to Waiting
        </button>

        <button
          onClick={handleSetToInProgress}
          className="unjam-block unjam-w-full unjam-text-sm unjam-bg-blue-200 hover:unjam-bg-blue-300 unjam-px-3 unjam-py-2 unjam-rounded unjam-font-medium"
        >
          Set to In Progress (John)
        </button>

        <button
          onClick={handleSetToAwaitingConfirmation}
          className="unjam-block unjam-w-full unjam-text-sm unjam-bg-green-200 hover:unjam-bg-green-300 unjam-px-3 unjam-py-2 unjam-rounded unjam-font-medium"
        >
          Set to Awaiting Confirmation
        </button>

        <button
          onClick={handleSetToCompleted}
          className="unjam-block unjam-w-full unjam-text-sm unjam-bg-purple-200 hover:unjam-bg-purple-300 unjam-px-3 unjam-py-2 unjam-rounded unjam-font-medium"
        >
          Set to Completed
        </button>
      </div>
    </div>
  );
});

DebugTicket.displayName = 'DebugTicket';

export default DebugTicket;