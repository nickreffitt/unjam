import React, { useState, useEffect, useCallback } from 'react';
import { Shield } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useVerifyAuthState } from './hooks/useVerifyAuthState';
import { useVerifyAuthActions } from './hooks/useVerifyAuthActions';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import VerificationForm from './components/VerificationForm/VerificationForm';
import GoogleFallback from './components/GoogleFallback/GoogleFallback';
import ErrorDisplay from '@dashboard/SignIn/components/ErrorDisplay/ErrorDisplay';

/**
 * VerifyAuth page component for the engineer dashboard
 * Handles magic link verification with Google OAuth fallback
 */
const VerifyAuth: React.FC = () => {
  console.debug('[VerifyAuth] Component mounted');
  console.debug('[VerifyAuth] Current URL:', window.location.href);
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  const {
    isAuthenticated,
    isLoading: authStateLoading
  } = useAuthState();

  const {
    tokenHash,
    isValidToken,
    error: stateError,
    clearError: clearStateError
  } = useVerifyAuthState();

  console.debug('[VerifyAuth] State from useVerifyAuthState:', { tokenHash, isValidToken, stateError });

  const {
    verifyMagicLink,
    signInWithGoogleWeb,
    isLoading: actionsLoading,
    error: actionsError,
    clearError: clearActionsError,
  } = useVerifyAuthActions();

  // Combine errors from both hooks
  const error = stateError || actionsError;
  const isLoading = authStateLoading || actionsLoading;
  const clearError = () => {
    clearStateError();
    clearActionsError();
  };

  const handleVerification = useCallback(async (): Promise<void> => {
    if (!tokenHash) return;

    try {
      clearError();
      await verifyMagicLink(tokenHash);
      setVerificationSuccess(true);
      // Successful verification will trigger redirect via useAuthState
    } catch (error) {
      console.error('Verification failed:', error);
      // Error is handled by useVerifyAuthActions hook
    }
  }, [tokenHash, clearError, verifyMagicLink]);

  // Automatically attempt verification when we have a valid token
  useEffect(() => {
    if (isValidToken && tokenHash && !verificationAttempted && !isAuthenticated) {
      setVerificationAttempted(true);
      handleVerification();
    }
  }, [isValidToken, tokenHash, verificationAttempted, isAuthenticated, handleVerification]);

  // Redirect authenticated users to dashboard
  if (isAuthenticated) {
    console.debug('[VerifyAuth] User is authenticated, redirecting to /new');
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

  const _handleRetry = () => {
    setVerificationAttempted(false);
    setVerificationSuccess(false);
    clearError();
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      await signInWithGoogleWeb();
    } catch (error) {
      console.error('Google sign in failed:', error);
      // Error is handled by useVerifyAuthActions hook
    }
  };

  return (
    <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-py-12 unjam-px-4 sm:unjam-px-6 lg:unjam-px-8">
      <div className="unjam-max-w-md unjam-w-full unjam-space-y-8">
        {/* Header */}
        <div className="unjam-text-center">
          <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-blue-100">
            <Shield className="unjam-h-8 unjam-w-8 unjam-text-blue-600" />
          </div>
          <h2 className="unjam-mt-6 unjam-text-3xl unjam-font-extrabold unjam-text-gray-900">
            Verify Your Account
          </h2>
          <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
            Complete your authentication to access the dashboard
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

        {/* Main Content */}
        <div className="unjam-bg-white unjam-py-8 unjam-px-6 unjam-shadow unjam-rounded-lg">
          {/* Show invalid token message if token is missing or invalid */}
          {!isValidToken ? (
            <div className="unjam-text-center unjam-space-y-6">
              <div>
                <h3 className="unjam-text-lg unjam-font-medium unjam-text-gray-900">
                  Invalid Verification Link
                </h3>
                <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
                  This link appears to be invalid or incomplete. Please request a new magic link or sign in with Google.
                </p>
              </div>
              <GoogleFallback
                onGoogleSignIn={handleGoogleSignIn}
                isLoading={isLoading}
              />
            </div>
          ) : (
            <>
              {/* Verification Form */}
              <VerificationForm
                isVerifying={isLoading && verificationAttempted}
                isSuccess={verificationSuccess}
                isError={!!error && verificationAttempted}
                onRetry={handleVerification}
              />

              {/* Google Fallback - only show if verification failed */}
              {error && verificationAttempted && (
                <GoogleFallback
                  onGoogleSignIn={handleGoogleSignIn}
                  isLoading={isLoading}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="unjam-text-center">
          <p className="unjam-text-xs unjam-text-gray-500">
            Need help? Contact support if you continue to experience issues.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyAuth;