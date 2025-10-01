import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useLogoutActions } from './hooks/useLogoutActions';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import LogoutForm from './components/LogoutForm/LogoutForm';
import ErrorDisplay from '@dashboard/SignIn/components/ErrorDisplay/ErrorDisplay';

/**
 * Logout page component for the engineer dashboard
 * Handles user sign out with confirmation
 */
const Logout: React.FC = () => {
  const navigate = useNavigate();
  const [logoutSuccess, setLogoutSuccess] = useState(false);

  const {
    isAuthenticated,
    isLoading: authStateLoading
  } = useAuthState();

  const {
    signOut,
    isLoading: logoutLoading,
    error,
    clearError,
  } = useLogoutActions();

  const isLoading = authStateLoading || logoutLoading;

  // Redirect to sign in if not authenticated
  if (!authStateLoading && !isAuthenticated) {
    return <Navigate to="auth" replace />;
  }

  // Show loading while checking auth state
  if (authStateLoading) {
    return (
      <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center">
        <div className="unjam-text-gray-600">Loading...</div>
      </div>
    );
  }

  const handleSignOut = async (): Promise<void> => {
    try {
      clearError();
      await signOut();
      setLogoutSuccess(true);
      // Redirect after a brief delay
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 1500);
    } catch (error) {
      console.error('Logout failed:', error);
      // Error is handled by useLogoutActions hook
    }
  };

  const handleCancel = (): void => {
    navigate(-1); // Go back to previous page
  };

  return (
    <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-py-12 unjam-px-4 sm:unjam-px-6 lg:unjam-px-8">
      <div className="unjam-max-w-md unjam-w-full unjam-space-y-8">
        {/* Header */}
        <div className="unjam-text-center">
          <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-red-100">
            <Shield className="unjam-h-8 unjam-w-8 unjam-text-red-600" />
          </div>
          <h2 className="unjam-mt-6 unjam-text-3xl unjam-font-extrabold unjam-text-gray-900">
            Sign Out
          </h2>
          <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
            Securely sign out of your dashboard account
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
          <LogoutForm
            isLoading={isLoading}
            isSuccess={logoutSuccess}
            onSignOut={handleSignOut}
            onCancel={handleCancel}
          />
        </div>

        {/* Footer */}
        <div className="unjam-text-center">
          <p className="unjam-text-xs unjam-text-gray-500">
            You can always sign back in to access your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Logout;