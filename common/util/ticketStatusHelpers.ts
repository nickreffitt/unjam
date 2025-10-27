import { type Ticket } from '@common/types';

/**
 * Checks if a ticket in 'awaiting-confirmation' status has expired
 * based on its autoCompleteTimeoutAt timestamp
 */
export const isAwaitingConfirmationExpired = (ticket: Ticket): boolean => {
  return ticket.status === 'awaiting-confirmation' &&
         !!ticket.autoCompleteTimeoutAt &&
         new Date() > ticket.autoCompleteTimeoutAt;
};

/**
 * Determines if a ticket should be displayed in a completed state
 * This includes:
 * - Tickets with 'completed' status
 * - Tickets with 'auto-completed' status
 * - Tickets with 'pending-payment' status
 * - Tickets in 'awaiting-confirmation' that have expired
 */
export const shouldShowCompletedState = (ticket: Ticket): boolean => {
  return ticket.status === 'completed' ||
         ticket.status === 'auto-completed' ||
         ticket.status === 'pending-payment' ||
         isAwaitingConfirmationExpired(ticket);
};

/**
 * Determines if a customer can create a new ticket
 * Customers can create tickets when:
 * - They have no active ticket, OR
 * - Their current ticket is in a completed state (including pending-payment or expired awaiting-confirmation)
 */
export const canCreateNewTicket = (ticket: Ticket | null): boolean => {
  if (!ticket) return true;
  return shouldShowCompletedState(ticket);
};
