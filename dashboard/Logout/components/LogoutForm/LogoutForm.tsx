import React from 'react';
import { Loader2, LogOut, CheckCircle } from 'lucide-react';

interface LogoutFormProps {
  isLoading: boolean;
  isSuccess: boolean;
  onSignOut: () => void;
  onCancel: () => void;
}

/**
 * Form component for logout confirmation
 * Shows loading states and success feedback
 */
const LogoutForm: React.FC<LogoutFormProps> = ({
  isLoading,
  isSuccess,
  onSignOut,
  onCancel,
}) => {
  if (isLoading) {
    return (
      <div className="unjam-text-center unjam-space-y-4">
        <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-blue-100">
          <Loader2 className="unjam-h-8 unjam-w-8 unjam-text-blue-600 unjam-animate-spin" />
        </div>
        <div>
          <h3 className="unjam-text-lg unjam-font-medium unjam-text-gray-900">
            Signing out...
          </h3>
          <p className="unjam-mt-1 unjam-text-sm unjam-text-gray-600">
            Please wait while we sign you out of your account.
          </p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="unjam-text-center unjam-space-y-4">
        <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-green-100">
          <CheckCircle className="unjam-h-8 unjam-w-8 unjam-text-green-600" />
        </div>
        <div>
          <h3 className="unjam-text-lg unjam-font-medium unjam-text-gray-900">
            Signed out successfully
          </h3>
          <p className="unjam-mt-1 unjam-text-sm unjam-text-gray-600">
            You have been signed out of your account. Redirecting to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="unjam-text-center unjam-space-y-6">
      <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-red-100">
        <LogOut className="unjam-h-8 unjam-w-8 unjam-text-red-600" />
      </div>

      <div>
        <h3 className="unjam-text-lg unjam-font-medium unjam-text-gray-900">
          Sign out of your account?
        </h3>
        <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
          You will need to sign in again to access the dashboard.
        </p>
      </div>

      <div className="unjam-flex unjam-space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="unjam-flex-1 unjam-px-4 unjam-py-2 unjam-border unjam-border-gray-300 unjam-rounded-md unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-bg-white hover:unjam-bg-gray-50 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500 unjam-transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="unjam-flex-1 unjam-px-4 unjam-py-2 unjam-border unjam-border-transparent unjam-rounded-md unjam-text-sm unjam-font-medium unjam-text-white unjam-bg-red-600 hover:unjam-bg-red-700 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-red-500 unjam-transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default LogoutForm;