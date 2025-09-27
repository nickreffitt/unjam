import React from 'react';
import { CheckCircle, ArrowLeft } from 'lucide-react';

interface EmailSentProps {
  email: string;
  onReset: () => void;
}

const EmailSent: React.FC<EmailSentProps> = ({ email, onReset }) => {
  return (
    <div className="unjam-w-full unjam-max-w-md unjam-text-center unjam-space-y-6">
      {/* Success Icon */}
      <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-green-100">
        <CheckCircle className="unjam-h-8 unjam-w-8 unjam-text-green-600" />
      </div>

      {/* Success Message */}
      <div>
        <h3 className="unjam-text-lg unjam-font-semibold unjam-text-gray-900 unjam-mb-2">
          Check your email
        </h3>
        <p className="unjam-text-sm unjam-text-gray-600 unjam-mb-2">
          We've sent a magic link to
        </p>
        <p className="unjam-font-medium unjam-text-gray-900 unjam-mb-4">
          {email}
        </p>
        <p className="unjam-text-sm unjam-text-gray-600">
          Click the link in your email to sign in to your dashboard.
        </p>
      </div>

      {/* Instructions */}
      <div className="unjam-bg-blue-50 unjam-border unjam-border-blue-200 unjam-rounded-md unjam-p-4">
        <p className="unjam-text-sm unjam-text-blue-800">
          <strong>Next steps:</strong>
        </p>
        <ul className="unjam-mt-2 unjam-text-sm unjam-text-blue-700 unjam-space-y-1">
          <li>• Check your email inbox</li>
          <li>• Look for an email from our system</li>
          <li>• Click the "Sign In" link in the email</li>
          <li>• You'll be redirected back to the dashboard</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="unjam-space-y-3">
        <button
          onClick={onReset}
          className="unjam-w-full unjam-flex unjam-justify-center unjam-items-center unjam-py-2.5 unjam-px-4 unjam-border unjam-border-gray-300 unjam-rounded-md unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-bg-white hover:unjam-bg-gray-50 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500 unjam-transition-colors"
        >
          <ArrowLeft className="unjam-h-4 unjam-w-4 unjam-mr-2" />
          Try a different email
        </button>

        <p className="unjam-text-xs unjam-text-gray-500">
          Didn't receive an email? Check your spam folder or try again in a few minutes.
        </p>
      </div>
    </div>
  );
};

export default EmailSent;