import React from 'react';
import { CheckCircle } from 'lucide-react';

interface RatingSuccessProps {
  onClose?: () => void;
}

/**
 * Success message component shown after rating submission
 * Displays a thank you message to the user
 */
export const RatingSuccess: React.FC<RatingSuccessProps> = ({ onClose }) => {
  return (
    <div data-testid="rating-success" className="unjam-text-center">
      <div className="unjam-flex unjam-justify-center unjam-mb-4">
        <CheckCircle size={48} className="unjam-text-green-500" />
      </div>

      <h3 className="unjam-text-lg unjam-font-semibold unjam-text-gray-800 unjam-mb-2">
        Thank you for your feedback!
      </h3>

      <p className="unjam-text-sm unjam-text-gray-600 unjam-mb-4">
        Your rating helps us improve our service.
      </p>

      {onClose && (
        <button
          onClick={onClose}
          className="unjam-w-full unjam-bg-gray-600 unjam-text-white unjam-rounded unjam-py-2 unjam-px-4 unjam-text-sm hover:unjam-bg-gray-700"
          data-testid="rating-success-close-button"
        >
          Close
        </button>
      )}
    </div>
  );
};
