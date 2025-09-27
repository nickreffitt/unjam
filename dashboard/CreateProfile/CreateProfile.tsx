import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useCreateProfileActions, type ProfileFormData } from './hooks/useCreateProfileActions';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import ProfileForm from './components/ProfileForm/ProfileForm';
import ErrorDisplay from '@dashboard/SignIn/components/ErrorDisplay/ErrorDisplay';

/**
 * CreateProfile page component for the engineer dashboard
 * Allows users to complete their profile after authentication
 */
const CreateProfile: React.FC = () => {
  const navigate = useNavigate();
  const [profileCreated, setProfileCreated] = useState(false);

  const {
    isAuthenticated,
    currentProfile,
    isLoading: authStateLoading
  } = useAuthState();

  const {
    createProfile,
    error,
    clearError,
  } = useCreateProfileActions();

  const isLoading = authStateLoading;

  console.debug('[CreateProfile] getting here');
  // Redirect to sign in if not authenticated
  if (!authStateLoading && !isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // If user already has a complete profile (name exists), redirect to dashboard
  if (!authStateLoading && currentProfile) {
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

  const handleCreateProfile = async (profileData: ProfileFormData): Promise<void> => {
    try {
      clearError();
      const newProfile = await createProfile(profileData);
      console.debug('Profile created successfully:', newProfile);
      setProfileCreated(true);

      // TODO: Update the current user's profile in the authentication system
      // This would typically involve calling an API to update the user's profile
      // and then updating the local auth state

      // Redirect to dashboard after successful profile creation
      setTimeout(() => {
        navigate('/new', { replace: true });
      }, 1500);
    } catch (error) {
      console.error('Profile creation failed:', error);
      // Error is handled by useCreateProfileActions hook
    }
  };

  // Show success state
  if (profileCreated) {
    return (
      <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-py-12 unjam-px-4 sm:unjam-px-6 lg:unjam-px-8">
        <div className="unjam-max-w-md unjam-w-full unjam-space-y-8">
          <div className="unjam-text-center">
            <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-green-100">
              <UserPlus className="unjam-h-8 unjam-w-8 unjam-text-green-600" />
            </div>
            <h2 className="unjam-mt-6 unjam-text-3xl unjam-font-extrabold unjam-text-gray-900">
              Profile Created!
            </h2>
            <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
              Your profile has been successfully created. Redirecting to the dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="unjam-min-h-screen unjam-bg-gray-50 unjam-flex unjam-items-center unjam-justify-center unjam-py-12 unjam-px-4 sm:unjam-px-6 lg:unjam-px-8">
      <div className="unjam-max-w-md unjam-w-full unjam-space-y-8">
        {/* Header */}
        <div className="unjam-text-center">
          <div className="unjam-mx-auto unjam-h-16 unjam-w-16 unjam-flex unjam-items-center unjam-justify-center unjam-rounded-full unjam-bg-blue-100">
            <UserPlus className="unjam-h-8 unjam-w-8 unjam-text-blue-600" />
          </div>
          <h2 className="unjam-mt-6 unjam-text-3xl unjam-font-extrabold unjam-text-gray-900">
            Complete Your Profile
          </h2>
          <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-600">
            Tell us a bit about yourself to get started
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
          <ProfileForm
            onSubmit={handleCreateProfile}
            isLoading={isLoading}
          />
        </div>

        {/* Footer */}
        <div className="unjam-text-center">
          <p className="unjam-text-xs unjam-text-gray-500">
            You can update your profile information later in your account settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateProfile;