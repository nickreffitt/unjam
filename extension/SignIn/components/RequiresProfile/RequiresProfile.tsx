import React from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';

const RequiresProfile: React.FC = () => {
  const handleOpenDashboard = () => {
    // Open dashboard to complete profile setup
    const dashboardUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
    window.open(dashboardUrl, '_blank');
  };

  return (
    <div className="unjam-w-full unjam-space-y-4 unjam-text-center">
      <div className="unjam-flex unjam-justify-center unjam-mb-4">
        <AlertCircle className="unjam-h-16 unjam-w-16 unjam-text-yellow-500" />
      </div>

      <h3 className="unjam-text-xl unjam-font-semibold unjam-text-gray-900">
        Profile Setup Required
      </h3>

      <p className="unjam-text-sm unjam-text-gray-600">
        Please complete your profile setup in the dashboard before using the extension.
      </p>

      <button
        onClick={handleOpenDashboard}
        className="unjam-w-full unjam-flex unjam-justify-center unjam-items-center unjam-py-2.5 unjam-px-4 unjam-border unjam-border-transparent unjam-text-sm unjam-font-medium unjam-rounded-md unjam-text-white unjam-bg-blue-600 hover:unjam-bg-blue-700 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500 unjam-transition-colors"
      >
        <span>Open Dashboard</span>
        <ExternalLink className="unjam-ml-2 unjam-h-4 unjam-w-4" />
      </button>
    </div>
  );
};

export default RequiresProfile;
