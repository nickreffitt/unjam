import React from 'react';
import SignInForm from './components/SignInForm/SignInForm';
import OtpVerificationForm from './components/OtpVerificationForm/OtpVerificationForm';
import ErrorDisplay from './components/ErrorDisplay/ErrorDisplay';
import { useExtensionAuthManager } from '@extension/shared/contexts/ExtensionAuthManagerContext';

/**
 * SignIn page component for the customer extension
 * Handles OTP-based authentication
 */
const SignIn: React.FC = () => {
  const {
    signInWithOtp,
    verifyOtp,
    isLoading,
    otpSent,
    email,
    resetOtpSent,
    error
  } = useExtensionAuthManager();

  const handleSignInSubmit = async (emailValue: string): Promise<void> => {
    console.debug('SignIn: Submitting sign-in form with email:', emailValue);
    await signInWithOtp(emailValue);
    console.debug('SignIn: OTP request sent, waiting for success event');
  };

  const handleOtpSubmit = async (token: string): Promise<void> => {
    console.debug('SignIn: Submitting OTP verification');
    await verifyOtp(token);
    console.debug('SignIn: OTP verification request sent');
  };

  const handleReset = () => {
    console.debug('SignIn: Going back to email entry form');
    resetOtpSent();
  };

  if (otpSent) {
    return (
      <div className="unjam-min-h-screen unjam-w-[350px] unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-py-12 unjam-px-4">
        <div className="unjam-w-full unjam-space-y-8">
          <OtpVerificationForm
            email={email}
            onSubmit={handleOtpSubmit}
            onReset={handleReset}
            disabled={isLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="unjam-w-[350px] unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-pt-4 unjam-pb-4 unjam-px-4">
      <div className="unjam-w-full unjam-space-y-8">
        {/* Header */}
        <div className="unjam-text-center">
          <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center">
            <img src="/img/logo.png" alt="Unjam Logo" className="unjam-h-10 unjam-w-10" />
          </div>
          <h2 className="unjam-mt-2 unjam-text-3xl unjam-font-extrabold unjam-text-gray-900">
            Sign in to Unjam
          </h2>
          <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
            Connect with engineers instantly to fix what's broken
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <ErrorDisplay
            error={error}
            onDismiss={resetOtpSent}
            className="unjam-mb-6"
          />
        )}

        {/* Sign In Form */}
        <SignInForm onSubmit={handleSignInSubmit} disabled={isLoading} />

        {/* Footer */}
        <div className="unjam-text-center">
          <p className="unjam-text-xs unjam-text-gray-500">
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
