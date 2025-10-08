import React from 'react';
import { CheckCircle, ExternalLink } from 'lucide-react';

const SignInSuccess: React.FC = () => {
  const handleOpenDashboard = () => {
    const dashboardUrl = window.location.origin.replace('chrome-extension://', 'http://localhost:5173');
    window.open(dashboardUrl, '_blank');
  };

  return (
    <div className="unjam-w-full unjam-space-y-4 unjam-text-center">
      <div className="unjam-flex unjam-justify-center unjam-mb-4">
        <CheckCircle className="unjam-h-16 unjam-w-16 unjam-text-green-500" />
      </div>

      <h3 className="unjam-text-xl unjam-font-semibold unjam-text-gray-900">
        Successfully Signed In!
      </h3>

      <p className="unjam-text-sm unjam-text-gray-600">
        You're now authenticated and can use the extension.
      </p>

      <button
        onClick={() => window.close()}
        className="unjam-w-full unjam-flex unjam-justify-center unjam-py-2.5 unjam-px-4 unjam-border unjam-border-transparent unjam-text-sm unjam-font-medium unjam-rounded-md unjam-text-white unjam-bg-blue-600 hover:unjam-bg-blue-700 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500 unjam-transition-colors"
      >
        Close
      </button>
    </div>
  );
};

export default SignInSuccess;
