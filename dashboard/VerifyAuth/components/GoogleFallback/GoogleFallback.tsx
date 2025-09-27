import React from 'react';
import { Chrome } from 'lucide-react';

interface GoogleFallbackProps {
  onGoogleSignIn: () => void;
  isLoading: boolean;
}

/**
 * Component that provides Google OAuth as a fallback option
 * when magic link verification fails
 */
const GoogleFallback: React.FC<GoogleFallbackProps> = ({
  onGoogleSignIn,
  isLoading,
}) => {
  return (
    <div className="unjam-mt-8">
      <div className="unjam-relative">
        <div className="unjam-absolute unjam-inset-0 unjam-flex unjam-items-center">
          <div className="unjam-w-full unjam-border-t unjam-border-gray-300" />
        </div>
        <div className="unjam-relative unjam-flex unjam-justify-center unjam-text-sm">
          <span className="unjam-px-2 unjam-bg-gray-50 unjam-text-gray-500">
            Or continue with
          </span>
        </div>
      </div>

      <div className="unjam-mt-6">
        <button
          type="button"
          onClick={onGoogleSignIn}
          disabled={isLoading}
          className="unjam-w-full unjam-flex unjam-justify-center unjam-py-3 unjam-px-4 unjam-border unjam-border-gray-300 unjam-rounded-md unjam-shadow-sm unjam-bg-white unjam-text-sm unjam-font-medium unjam-text-gray-700 hover:unjam-bg-gray-50 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500 disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed unjam-transition-colors"
        >
          <Chrome className="unjam-w-5 unjam-h-5 unjam-mr-3 unjam-text-gray-400" />
          Continue with Google
        </button>
      </div>

      <div className="unjam-mt-4 unjam-text-center">
        <p className="unjam-text-xs unjam-text-gray-500">
          Having trouble with the magic link? Google sign-in provides an alternative way to access your account.
        </p>
      </div>
    </div>
  );
};

export default GoogleFallback;