import React, { useState } from 'react';
import { type CustomerProfile } from '@common/types';
import { useTicketManager } from '@extension/Ticket/contexts/TicketManagerContext';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerProfile: CustomerProfile;
  onTicketCreated?: (ticketId: string) => void;
}

const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose, onTicketCreated }) => {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use shared TicketManager from context
  const { ticketManager } = useTicketManager();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      // Use TicketManager to create the ticket
      const ticket = await ticketManager.createTicket(description.trim());

      // Clear form and close modal
      setDescription('');
      onClose();

      // Notify parent component of the new ticket
      onTicketCreated?.(ticket.id);
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
        <form onSubmit={handleSubmit} className="unjam-p-6">
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
              placeholder="Please describe the problem you're experiencing..."
              className="unjam-w-full unjam-p-3 unjam-border unjam-border-gray-300 unjam-rounded-md unjam-resize-none unjam-focus:ring-2 unjam-focus:ring-blue-500 unjam-focus:border-blue-500 unjam-outline-none"
              rows={4}
              required
              disabled={isSubmitting}
            />
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
      </div>
    </div>
  );
};

export default TicketModal;