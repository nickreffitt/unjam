import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreditSuccess: React.FC = () => {
  // Get session_id from URL if needed
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  const navigate = useNavigate();

  return (
    <div className="unjam-h-full unjam-overflow-y-auto">
      <div className="unjam-flex unjam-items-center unjam-justify-center unjam-min-h-screen unjam-px-4">
        <div className="unjam-max-w-md unjam-w-full">
          {/* Success Icon */}
          <div className="unjam-text-center unjam-mb-8">
            <div className="unjam-inline-flex unjam-items-center unjam-justify-center unjam-w-20 unjam-h-20 unjam-rounded-full unjam-bg-green-100 unjam-mb-6">
              <CheckCircle className="unjam-w-12 unjam-h-12 unjam-text-green-600" />
            </div>
            <h1 className="unjam-text-3xl unjam-font-bold unjam-text-slate-900 unjam-mb-4">
              Subscription Successful!
            </h1>
            <p className="unjam-text-lg unjam-text-slate-600 unjam-mb-2">
              Your subscription has been activated
            </p>
            <p className="unjam-text-sm unjam-text-slate-500">
              You can now start using your credits
            </p>
          </div>

          {/* Details Card */}
          <div className="unjam-bg-white unjam-rounded-lg unjam-border unjam-border-slate-200 unjam-p-6 unjam-mb-6">
            <div className="unjam-space-y-4">
              <div className="unjam-flex unjam-items-start unjam-justify-between">
                <div>
                  <p className="unjam-text-sm unjam-font-medium unjam-text-slate-900">
                    What happens next?
                  </p>
                  <ul className="unjam-mt-3 unjam-space-y-2 unjam-text-sm unjam-text-slate-600">
                    <li className="unjam-flex unjam-items-start">
                      <span className="unjam-mr-2">✓</span>
                      <span>Your credits have been added to your account</span>
                    </li>
                    <li className="unjam-flex unjam-items-start">
                      <span className="unjam-mr-2">✓</span>
                      <span>You'll receive a confirmation email shortly</span>
                    </li>
                    <li className="unjam-flex unjam-items-start">
                      <span className="unjam-mr-2">✓</span>
                      <span>You can manage your subscription anytime</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Session ID (for debugging, can be removed in production) */}
          {sessionId && (
            <div className="unjam-bg-slate-50 unjam-rounded-lg unjam-p-4 unjam-mb-6">
              <p className="unjam-text-xs unjam-font-mono unjam-text-slate-600">
                Session ID: {sessionId}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="unjam-flex unjam-flex-col unjam-gap-3">
            <button
              onClick={() => navigate('/app')}
              className="unjam-w-full unjam-px-6 unjam-py-3 unjam-bg-blue-600 unjam-text-white unjam-font-medium unjam-rounded-lg hover:unjam-bg-blue-700 unjam-transition-colors"
            >
              Go to Dashboard
            </button>
          </div>

          {/* Footer Note */}
          <div className="unjam-text-center unjam-mt-8">
            <p className="unjam-text-xs unjam-text-slate-500">
              Need help? Contact our support team at{' '}
              <a
                href="mailto:support@unj.am"
                className="unjam-text-blue-600 hover:unjam-underline"
              >
                support@unj.am
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditSuccess;