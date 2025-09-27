import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthActions } from './hooks/useAuthActions';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import SignInForm from './components/SignInForm/SignInForm';
import EmailSent from './components/EmailSent/EmailSent';
import ErrorDisplay from './components/ErrorDisplay/ErrorDisplay';

/**
 * SignIn page component for the engineer dashboard
 * Handles magic link and Google OAuth authentication
 */
const SignIn: React.FC = () => {
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    isAuthenticated,
    isLoading: authStateLoading,
    error: authStateError,
  } = useAuthState();
  const {
    signInWithMagicLink,
    signInWithGoogleWeb,
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
    return <Navigate to="/new" replace />;
  }

  // Show loading while checking auth state
  if (authStateLoading) {
    return (
      <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center">
        <div className="unjam-text-gray-600">Loading...</div>
      </div>
    );
  }

  const handleMagicLinkSubmit = async (email: string): Promise<void> => {
    try {
      await signInWithMagicLink(email);
      setSentEmail(email);
      setIsEmailSent(true);
    } catch (error) {
      // Error is handled by useAuthActions hook
      console.error('Magic link submission failed:', error);
    }
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      await signInWithGoogleWeb();
    } catch (error) {
      // Error is handled by useAuthActions hook
      console.error('Google sign in failed:', error);
    }
  };

  const handleReset = () => {
    setIsEmailSent(false);
    setSentEmail('');
    clearError();
  };

  if (isEmailSent) {
    return (
      <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-py-12 unjam-px-4 sm:unjam-px-6 lg:unjam-px-8">
        <div className="unjam-max-w-md unjam-w-full unjam-space-y-8">
          <EmailSent email={sentEmail} onReset={handleReset} />
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
          onMagicLinkSubmit={handleMagicLinkSubmit}
          onGoogleSignIn={handleGoogleSignIn}
          isLoading={authActionLoading}
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