import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TicketX } from 'lucide-react';

interface TicketNotFoundProps {
  title?: string;
  message?: string;
  redirectPath: string;
  redirectLabel: string;
}

const TicketNotFound: React.FC<TicketNotFoundProps> = ({
  title = "Ticket Not Found",
  message = "The ticket you're looking for doesn't exist or may have been removed.",
  redirectPath,
  redirectLabel
}) => {
  const navigate = useNavigate();

  return (
    <div className="unjam-p-8 unjam-max-w-4xl unjam-mx-auto">
      <div className="unjam-bg-white unjam-rounded-lg unjam-shadow-sm unjam-border unjam-border-gray-200 unjam-p-12">
        <div className="unjam-text-center">
          <div className="unjam-flex unjam-justify-center unjam-mb-4">
            <TicketX size={64} className="unjam-text-gray-400" />
          </div>
          <h2 className="unjam-text-2xl unjam-font-bold unjam-text-gray-900 unjam-mb-2">{title}</h2>
          <p className="unjam-text-gray-500 unjam-mb-6">{message}</p>
          <button
            onClick={() => navigate(redirectPath)}
            className="unjam-bg-blue-600 hover:unjam-bg-blue-700 unjam-text-white unjam-px-6 unjam-py-2 unjam-rounded-md unjam-font-medium unjam-transition-colors"
          >
            {redirectLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketNotFound;