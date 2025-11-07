import React, { useState, useEffect } from 'react';
import { type CustomerProfile } from '@common/types';
import { useTicketManager } from '@extension/Ticket/contexts/TicketManagerContext';
import { useTicketState } from '@extension/Ticket/hooks/useTicketState';
import { useBillingManager } from '@extension/shared/contexts/BillingManagerContext';
import { useConsoleLogCapture } from '@extension/Ticket/hooks/useConsoleLogCapture';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerProfile: CustomerProfile;
}

const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose, customerProfile }) => {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [pendingCredits, setPendingCredits] = useState<number | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);

  // Use shared TicketManager from context
  const { ticketManager } = useTicketManager();

  // Get state setters from useTicketState
  const { setActiveTicket, setIsTicketVisible } = useTicketState();

  // Use SubscriptionManager

  // Use BillingManager
  const { billingManager } = useBillingManager();

  // Use console log capture hook
  const { captureState, startCapture, stopCapture, resetCapture } = useConsoleLogCapture();

  // Fetch credit balance when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchCreditData = async () => {
      setIsLoadingCredits(true);
      try {
        const balance = await billingManager.getCreditBalanceForProfile(customerProfile.id);
        setCreditBalance(balance.creditBalance);
        setPendingCredits(balance.pendingCredits)
      } catch (error) {
        console.error('Failed to fetch subscription data:', error);
      } finally {
        setIsLoadingCredits(false);
      }
    };

    fetchCreditData();
  }, [isOpen, customerProfile.id, billingManager]);

  // Reset capture state when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetCapture();
    }
  }, [isOpen, resetCapture]);


  if (!isOpen) return null;

  // Redirect to dashboard if no subscription
  const handleGoToDashboard = () => {
    const dashboardUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5175';
    window.open(dashboardUrl, '_blank');
  };

  // Calculate available credits (total - pending)
  const availableCredits = creditBalance !== null && pendingCredits !== null
    ? creditBalance - pendingCredits
    : creditBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      // Get captured logs if available
      const capturedLogs = captureState.status === 'completed' ? captureState.logs : [];
      console.debug('TicketModal: Creating ticket with console logs:', capturedLogs.length);

      // Use TicketManager to create the ticket with console logs
      const ticket = await ticketManager.createTicket(description.trim(), capturedLogs);

      // Handle post-creation logic internally
      console.debug('Ticket created with ID:', ticket.id);

      // Since storage events only work cross-tab, manually get the created ticket and update context
      const createdTicket = await ticketManager.getActiveTicket();
      if (createdTicket) {
        console.debug('Setting active ticket in context:', createdTicket.id);
        setActiveTicket(createdTicket);
      } else {
        console.warn('No active ticket found after creation');
      }

      // Clear form, close modal, and show the ticket
      setDescription('');
      setIsTicketVisible(true);
      onClose();
    } catch (error) {
      console.error('Failed to create ticket:', error);
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Stop propagation to prevent host page keyboard shortcuts
    e.nativeEvent.stopPropagation();
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    // Stop propagation to prevent host page keyboard shortcuts
    e.nativeEvent.stopPropagation();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Stop propagation to prevent host page keyboard shortcuts
    e.nativeEvent.stopPropagation();
  };

  return (
    <div 
      className="unjam-fixed unjam-inset-0 unjam-bg-black unjam-bg-opacity-50 unjam-flex unjam-items-center unjam-justify-center unjam-z-50 unjam-font-sans"
      onClick={handleBackdropClick}
    >
      <div className="unjam-bg-white unjam-rounded-lg unjam-shadow-xl unjam-w-full unjam-max-w-md unjam-mx-4">
        {/* Header */}
        <div className="unjam-flex unjam-items-center unjam-justify-between unjam-p-6 unjam-border-b unjam-border-gray-200">
          <h2 className="unjam-text-xl unjam-font-semibold unjam-text-gray-800">
            Create New Ticket
          </h2>
          <button
            onClick={onClose}
            className="unjam-text-gray-400 hover:unjam-text-gray-600 unjam-text-2xl unjam-font-bold unjam-w-8 unjam-h-8 unjam-flex unjam-items-center unjam-justify-center"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="unjam-p-6">
          {isLoadingCredits ? (
            <div className="unjam-text-center unjam-py-8">
              <p className="unjam-text-gray-600">Loading...</p>
            </div>
          ) : availableCredits === 0 ? (
            <div className="unjam-text-center unjam-py-8">
              <p className="unjam-text-gray-800 unjam-font-medium unjam-mb-2">No Credits Available</p>
              <p className="unjam-text-gray-600 unjam-mb-4">
                {creditBalance === 0
                  ? 'You have 0 credits remaining. Please purchase more credits to create tickets.'
                  : `All ${creditBalance} credits are currently being used by pending tickets. Please wait for them to complete or purchase more credits.`
                }
              </p>
              <button
                onClick={handleGoToDashboard}
                className="unjam-px-4 unjam-py-2 unjam-text-sm unjam-font-medium unjam-text-white unjam-bg-blue-600 unjam-rounded-md hover:unjam-bg-blue-700 unjam-transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="unjam-mb-4">
                <label
                  htmlFor="description"
                  className="unjam-block unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-mb-2"
                >
                  Describe your issue
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  onKeyPress={handleKeyPress}
                  placeholder="Please describe the problem you're experiencing..."
                  className="unjam-bg-white unjam-text-black unjam-w-full unjam-p-3 unjam-border unjam-border-gray-300 unjam-rounded-md unjam-resize-none unjam-focus:ring-2 unjam-focus:ring-blue-500 unjam-focus:border-blue-500 unjam-outline-none"
                  rows={4}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Credit Balance Display */}
              <div className="unjam-mb-4">
                <div className="unjam-text-sm unjam-text-gray-600">
                  <span className="unjam-font-medium">Credit Balance:</span> {creditBalance || 0}
                  {pendingCredits !== null && pendingCredits > 0 && (
                    <span className="unjam-text-orange-600"> ({pendingCredits} pending)</span>
                  )}
                </div>
              </div>

              {/* Console Log Capture Button */}
              <div className="unjam-mb-4">
                {captureState.status === 'idle' && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('TicketModal: Capture Logs button clicked');
                      console.log('TicketModal: captureState:', captureState);
                      console.log('TicketModal: window.location.href:', window.location.href);
                      await startCapture();
                      // Wait for 3 seconds (CAPTURE_TIMEOUT_MS) then stop
                      setTimeout(async () => {
                        await stopCapture();
                      }, 3000);
                    }}
                    className="unjam-px-4 unjam-py-2 unjam-text-sm unjam-font-medium unjam-text-white unjam-bg-purple-600 unjam-rounded-md hover:unjam-bg-purple-700 unjam-transition-colors"
                    disabled={isSubmitting}
                  >
                    Capture Logs
                  </button>
                )}
                {(captureState.status === 'fetching-url' || captureState.status === 'capturing') && (
                  <button
                    type="button"
                    disabled
                    className="unjam-px-4 unjam-py-2 unjam-text-sm unjam-font-medium unjam-text-white unjam-bg-purple-400 unjam-rounded-md unjam-cursor-not-allowed"
                  >
                    Capturing...
                  </button>
                )}
                {captureState.status === 'completed' && (
                  <div className="unjam-text-sm unjam-text-gray-700">
                    <span className="unjam-font-medium">Logs captured:</span> {captureState.totalLogs} total
                    {captureState.errorLogs > 0 && (
                      <span className="unjam-text-red-600"> ({captureState.errorLogs} errors)</span>
                    )}
                  </div>
                )}
                {captureState.status === 'error' && (
                  <div className="unjam-text-sm unjam-text-red-600">
                    <span className="unjam-font-medium">Error:</span> {captureState.message}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="unjam-flex unjam-items-center unjam-justify-end unjam-gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="unjam-px-4 unjam-py-2 unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded-md hover:unjam-bg-gray-50 unjam-transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="unjam-px-4 unjam-py-2 unjam-text-sm unjam-font-medium unjam-text-white unjam-bg-blue-600 unjam-rounded-md hover:unjam-bg-blue-700 unjam-transition-colors disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed"
                  disabled={isSubmitting || !description.trim()}
                >
                  {isSubmitting ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketModal;