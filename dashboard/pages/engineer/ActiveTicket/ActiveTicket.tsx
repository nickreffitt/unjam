import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTicketState } from '@dashboard/engineer/Ticket/hooks/useTicketState';
import { useTicketActions } from '@dashboard/engineer/Ticket/hooks/useTicketActions';
import { formatElapsedTime, formatLiveElapsedTime, formatCountdownTime, formatCompletionTime } from '@dashboard/shared/utils/ticketFormatters';
import TicketDetailView from '@dashboard/engineer/Ticket/components/TicketDetailView/TicketDetailView';
import { Check, AlertTriangle, Clock, TestTube, Timer, MessageSquare, Keyboard } from 'lucide-react';
import { type ChatBoxRef } from '@dashboard/engineer/ChatBox/ChatBox';
import { useChatManager } from '@dashboard/engineer/ChatBox/contexts/ChatManagerContext';
import { shouldShowCompletedState } from '@common/util/ticketStatusHelpers';

const ActiveTicket: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { ticket, elapsedTime, timeoutRemaining, isLoading, setTicket, setTimeoutRemaining } = useTicketState(ticketId);
  const { handleMarkAsFixed, handleAbandonTask, simulateCustomerConfirmation, simulateAutoCompleteTimer } = useTicketActions();
  const [, setCurrentTime] = useState(new Date());
  const chatBoxRef = useRef<ChatBoxRef>(null);
  const { createChatStore } = useChatManager();

  // Generate random customer message
  const generateRandomMessage = () => {
    const words = [
      'hello', 'there', 'how', 'are', 'you', 'doing', 'today', 'I', 'have', 'a', 'problem', 'with', 'my', 'computer',
      'the', 'screen', 'is', 'not', 'working', 'properly', 'can', 'you', 'help', 'me', 'please', 'it', 'seems', 'like',
      'something', 'went', 'wrong', 'when', 'I', 'was', 'trying', 'to', 'install', 'the', 'new', 'software', 'update',
      'also', 'my', 'keyboard', 'might', 'be', 'broken', 'some', 'keys', 'do', 'not', 'respond', 'correctly', 'thanks',
      'for', 'your', 'time', 'and', 'patience', 'this', 'has', 'been', 'very', 'frustrating', 'hope', 'we', 'can',
      'resolve', 'this', 'issue', 'soon', 'best', 'regards', 'looking', 'forward', 'to', 'hearing', 'from', 'you'
    ];

    try {
      const messageLength = Math.floor(Math.random() * 48) + 3; // 3 to 50 words
      const selectedWords = [];

      for (let i = 0; i < messageLength; i++) {
        const randomIndex = Math.floor(Math.random() * words.length);
        const selectedWord = words[randomIndex];
        if (selectedWord) {
          selectedWords.push(selectedWord);
        }
      }

      if (selectedWords.length === 0) {
        return 'Hello, I need help with my computer.';
      }

      return `${selectedWords.join(' ')}.`;
    } catch (error) {
      console.error('Error generating random message:', error);
      return 'Hello, I need help with my computer.';
    }
  };

  const handleSimulateCustomerMessage = () => {
    const randomMessage = generateRandomMessage();
    console.debug('Generated customer message:', randomMessage);

    if (randomMessage && typeof randomMessage === 'string') {
      if (chatBoxRef.current) {
        chatBoxRef.current.simulateCustomerMessage(randomMessage);
      }
    } else {
      console.error('Failed to generate valid message:', randomMessage);
    }
  };

  const handleTriggerCustomerTyping = () => {
    if (ticket && ticket.createdBy && ticketId) {
      console.debug('Debug: Triggering customer typing indicator for engineer to see');
      const chatStore = createChatStore(ticketId);
      chatStore.markIsTyping(ticket.createdBy);
      // Also trigger same-tab UI update
      if (chatBoxRef.current) {
        chatBoxRef.current.triggerTypingIndicator(ticket.createdBy);
      }
    } else {
      console.warn('Debug: No ticket or customer profile for typing simulation');
    }
  };

  // Update timer every second for live time calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusDisplay = () => {
    if (!ticket) return '';

    switch (ticket.status) {
      case 'in-progress':
        // Show live elapsed time since claimedAt
        if (ticket.claimedAt) {
          return `${formatLiveElapsedTime(ticket.claimedAt)} - Active`;
        }
        return `${formatElapsedTime(elapsedTime)} - Active`;
      case 'awaiting-confirmation':
        // Check if timer has expired
        if (shouldShowCompletedState(ticket)) {
          // Timer expired, show as pending payment
          if (ticket.claimedAt && ticket.resolvedAt) {
            return `${formatCompletionTime(ticket.claimedAt, ticket.resolvedAt)} - Pending Payment`;
          }
          return 'Pending Payment';
        }
        // Timer still active, show countdown
        if (ticket.autoCompleteTimeoutAt) {
          const timeoutDate = new Date(ticket.autoCompleteTimeoutAt);
          return `Waiting for customer confirmation - Auto-complete in ${formatCountdownTime(timeoutDate)}`;
        }
        return `Waiting for customer confirmation - Auto-complete in ${formatElapsedTime(timeoutRemaining)}`;
      case 'pending-payment':
        // Show completion time with pending payment status
        if (ticket.claimedAt && ticket.resolvedAt) {
          return `${formatCompletionTime(ticket.claimedAt, ticket.resolvedAt)} - Pending Payment`;
        }
        return 'Pending Payment';
      case 'auto-completed':
        // Show actual completion time from claimedAt to resolvedAt
        if (ticket.claimedAt && ticket.resolvedAt) {
          return `${formatCompletionTime(ticket.claimedAt, ticket.resolvedAt)} - Auto Completed`;
        }
        return '0:00 - Auto Completed';
      case 'completed':
        // Show actual completion time from claimedAt to resolvedAt
        if (ticket.claimedAt && ticket.resolvedAt) {
          return `${formatCompletionTime(ticket.claimedAt, ticket.resolvedAt)} - Completed`;
        }
        return '0:00 - Completed';
      default:
        return `${formatElapsedTime(elapsedTime)} - Active`;
    }
  };

  const getActionButtons = () => {
    if (!ticket) return null;

    if (ticket.status === 'in-progress') {
      return (
        <>
          <button
            onClick={() => handleMarkAsFixed(ticket, setTicket, setTimeoutRemaining)}
            className="unjam-bg-green-600 hover:unjam-bg-green-700 unjam-text-white unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-transition-colors unjam-flex unjam-items-center unjam-gap-2"
          >
            <Check size={16} />
            Mark as fixed
          </button>
          <button
            onClick={() => handleAbandonTask(ticket.id)}
            className="unjam-bg-red-600 hover:unjam-bg-red-700 unjam-text-white unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-transition-colors unjam-flex unjam-items-center unjam-gap-2"
          >
            <AlertTriangle size={16} />
            Abandon task
          </button>
        </>
      );
    }

    if (ticket.status === 'awaiting-confirmation') {
      // Check if timer expired
      if (shouldShowCompletedState(ticket)) {
        return (
          <div className="unjam-bg-blue-100 unjam-text-blue-800 unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-flex unjam-items-center unjam-gap-2">
            <Check size={16} />
            Payment will be processed shortly
          </div>
        );
      }
      return (
        <div className="unjam-bg-yellow-100 unjam-text-yellow-800 unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-flex unjam-items-center unjam-gap-2">
          <Clock size={16} />
          Waiting for customer confirmation
        </div>
      );
    }

    if (ticket.status === 'pending-payment') {
      return (
        <div className="unjam-bg-blue-100 unjam-text-blue-800 unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-flex unjam-items-center unjam-gap-2">
          <Check size={16} />
          Payment will be processed shortly
        </div>
      );
    }

    if (ticket.status === 'completed' || ticket.status === 'auto-completed') {
      return (
        <div className="unjam-bg-green-100 unjam-text-green-800 unjam-px-4 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-flex unjam-items-center">
          <span className="unjam-mr-2">✓</span>
          {ticket.status === 'auto-completed' ? 'Auto Completed' : 'Completed'}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="unjam-h-screen unjam-overflow-y-auto">
      {/* Debug Controls */}
      {(process.env.NODE_ENV === 'development') && ticket && (
        <div className="unjam-fixed unjam-bottom-4 unjam-right-4 unjam-z-50 unjam-bg-white unjam-rounded-lg unjam-shadow-lg unjam-p-3 unjam-border unjam-border-gray-200 unjam-space-y-2">
          {ticket.status === 'in-progress' && (
            <>
              <button
                onClick={handleSimulateCustomerMessage}
                className="unjam-flex unjam-items-center unjam-gap-2 unjam-text-sm unjam-text-gray-700 hover:unjam-text-gray-900 unjam-bg-green-100 hover:unjam-bg-green-200 unjam-px-2 unjam-py-1 unjam-rounded unjam-w-full"
                title="Send random customer message (for testing)"
              >
                <MessageSquare size={16} className="unjam-text-green-600" />
                <span className="unjam-font-medium">Random Message</span>
              </button>
              <button
                onClick={handleTriggerCustomerTyping}
                className="unjam-flex unjam-items-center unjam-gap-2 unjam-text-sm unjam-text-gray-700 hover:unjam-text-gray-900 unjam-bg-yellow-100 hover:unjam-bg-yellow-200 unjam-px-2 unjam-py-1 unjam-rounded unjam-w-full"
                title="Trigger customer typing indicator (for testing)"
              >
                <Keyboard size={16} className="unjam-text-yellow-600" />
                <span className="unjam-font-medium">Trigger Typing</span>
              </button>
            </>
          )}
          {ticket.status === 'awaiting-confirmation' && (
            <>
              <button
                onClick={() => simulateCustomerConfirmation(ticket, setTicket, setTimeoutRemaining)}
                className="unjam-flex unjam-items-center unjam-gap-2 unjam-text-sm unjam-text-gray-700 hover:unjam-text-gray-900 unjam-bg-blue-100 hover:unjam-bg-blue-200 unjam-px-2 unjam-py-1 unjam-rounded unjam-w-full"
                title="Simulate customer confirmation (for testing)"
              >
                <TestTube size={16} className="unjam-text-blue-600" />
                <span className="unjam-font-medium">Customer Confirms</span>
              </button>
              <button
                onClick={() => simulateAutoCompleteTimer(ticket, setTicket, setTimeoutRemaining)}
                className="unjam-flex unjam-items-center unjam-gap-2 unjam-text-sm unjam-text-gray-700 hover:unjam-text-gray-900 unjam-bg-purple-100 hover:unjam-bg-purple-200 unjam-px-2 unjam-py-1 unjam-rounded unjam-w-full"
                title="Simulate auto-complete timer expiring (for testing)"
              >
                <Timer size={16} className="unjam-text-purple-600" />
                <span className="unjam-font-medium">Timer Expires</span>
              </button>
            </>
          )}
        </div>
      )}

      <TicketDetailView
        ticket={ticket}
        isLoading={isLoading}
        headerConfig={{
          statusDisplay: getStatusDisplay(),
          actions: getActionButtons()
        }}
        notFoundConfig={{
          title: "Ticket Not Found",
          message: "The ticket you're looking for doesn't exist or has been removed.",
          redirectPath: "/new",
          redirectLabel: "View New Tickets"
        }}
        showAssignedTo
        showEstimatedTime
        chatActive
        chatBoxRef={chatBoxRef}
        screenShareActive
      />
    </div>
  );
};

export default ActiveTicket;