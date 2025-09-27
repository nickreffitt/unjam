import React, { useEffect } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface VerificationFormProps {
  isVerifying: boolean;
  isSuccess: boolean;
  isError: boolean;
  onRetry: () => void;
}

/**
 * Form component that shows the magic link verification progress
 * Displays loading, success, or error states
 */
const VerificationForm: React.FC<VerificationFormProps> = ({
  isVerifying,
  isSuccess,
  isError,
  onRetry,
}) => {
  if (isVerifying) {
    return (
      <div className="unjam-text-center unjam-space-y-4">
        <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-blue-100">
          <Loader2 className="unjam-h-8 unjam-w-8 unjam-text-blue-600 unjam-animate-spin" />
        </div>
        <div>
          <h3 className="unjam-text-lg unjam-font-medium unjam-text-gray-900">
            Verifying your account
          </h3>
          <p className="unjam-mt-1 unjam-text-sm unjam-text-gray-600">
            Please wait while we verify your magic link...
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
            Verification successful!
          </h3>
          <p className="unjam-mt-1 unjam-text-sm unjam-text-gray-600">
            Redirecting you to the dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="unjam-text-center unjam-space-y-4">
        <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-red-100">
          <XCircle className="unjam-h-8 unjam-w-8 unjam-text-red-600" />
        </div>
        <div>
          <h3 className="unjam-text-lg unjam-font-medium unjam-text-gray-900">
            Verification failed
          </h3>
          <p className="unjam-mt-1 unjam-text-sm unjam-text-gray-600">
            The magic link verification was unsuccessful. Please try again or use an alternative method.
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="unjam-inline-flex unjam-items-center unjam-px-4 unjam-py-2 unjam-border unjam-border-transparent unjam-text-sm unjam-font-medium unjam-rounded-md unjam-shadow-sm unjam-text-white unjam-bg-blue-600 hover:unjam-bg-blue-700 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Default state - should not normally be reached
  return (
    <div className="unjam-text-center unjam-space-y-4">
      <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-gray-100">
        <CheckCircle className="unjam-h-8 unjam-w-8 unjam-text-gray-400" />
      </div>
      <div>
        <h3 className="unjam-text-lg unjam-font-medium unjam-text-gray-900">
          Ready to verify
        </h3>
        <p className="unjam-mt-1 unjam-text-sm unjam-text-gray-600">
          Click the button below to verify your account.
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="unjam-inline-flex unjam-items-center unjam-px-4 unjam-py-2 unjam-border unjam-border-transparent unjam-text-sm unjam-font-medium unjam-rounded-md unjam-shadow-sm unjam-text-white unjam-bg-blue-600 hover:unjam-bg-blue-700 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500"
      >
        Verify Account
      </button>
    </div>
  );
};

export default VerificationForm;