import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthActions } from './hooks/useAuthActions';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import SignInForm from './components/SignInForm/SignInForm';
import OtpVerificationForm from './components/OtpVerificationForm/OtpVerificationForm';
import ErrorDisplay from './components/ErrorDisplay/ErrorDisplay';

/**
 * SignIn page component for the engineer dashboard
 * Handles OTP-based authentication
 */
const SignIn: React.FC = () => {
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');

  const {
    isAuthenticated,
    isLoading: authStateLoading,
    error: authStateError,
  } = useAuthState();
  const {
    signInWithOtp,
    verifyOtp,
    isLoading: authActionLoading,
    error: authActionError,
    clearError: clearAuthActionError,
  } = useAuthActions();

  // Combine errors and loading states from both hooks
  const error = authStateError || authActionError;
  const clearError = () => {
    clearAuthActionError();
  };

  // Redirect authenticated users to dashboard
  if (isAuthenticated) {
    return <Navigate to="new" replace />;
  }

  // Show loading while checking auth state
  if (authStateLoading) {
    return (
      <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center">
        <div className="unjam-text-gray-600">Loading...</div>
      </div>
    );
  }

  const handleSignInSubmit = async (emailValue: string): Promise<void> => {
    console.debug('SignIn: Submitting sign-in form with email:', emailValue);
    await signInWithOtp(emailValue);
    setEmail(emailValue);
    setOtpSent(true);
    console.debug('SignIn: OTP request sent');
  };

  const handleOtpSubmit = async (token: string): Promise<void> => {
    console.debug('SignIn: Submitting OTP verification for email:', email);
    await verifyOtp(email, token);
    console.debug('SignIn: OTP verification request sent');
  };

  const handleReset = () => {
    console.debug('SignIn: Going back to email entry form');
    setOtpSent(false);
    setEmail('');
    clearError();
  };

  if (otpSent) {
    return (
      <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-py-12 unjam-px-4 sm:unjam-px-6 lg:unjam-px-8">
        <div className="unjam-max-w-md unjam-w-full unjam-space-y-8">
          <OtpVerificationForm
            email={email}
            onSubmit={handleOtpSubmit}
            onReset={handleReset}
            disabled={authActionLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-py-12 unjam-px-4 sm:unjam-px-6 lg:unjam-px-8">
      <div className="unjam-max-w-md unjam-w-full unjam-space-y-8">
        {/* Header */}
        <div className="unjam-text-center">
          <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center">
            <img src="/img/logo.png" alt="Unjam Logo" className="unjam-h-16 unjam-w-16" />
          </div>
          <h2 className="unjam-mt-6 unjam-text-3xl unjam-font-extrabold unjam-text-gray-900">
            Sign in to Unjam
          </h2>
          <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
            Access your dashboard
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <ErrorDisplay
            error={error}
            onDismiss={clearError}
            className="unjam-mb-6"
          />
        )}

        {/* Sign In Form */}
        <SignInForm
          onSubmit={handleSignInSubmit}
          disabled={authActionLoading}
        />

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