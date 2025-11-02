import React, { useState } from 'react';
import { User, Edit2 } from 'lucide-react';
import BillingAccount from '@dashboard/engineer/BillingAccount';
import EditProfileForm from '@dashboard/EditProfile/components/EditProfileForm/EditProfileForm';
import { useEditProfileActions } from '@dashboard/EditProfile/hooks/useEditProfileActions';
import { useAuthState } from '@dashboard/shared/contexts/AuthManagerContext';
import { isEngineerProfile } from '@common/util/userTypeGuards';

const Settings: React.FC = () => {
  const authUser = useAuthState();
  const { updateProfile, isLoading, error, clearError } = useEditProfileActions();
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const profile = authUser.status === 'signed-in' ? authUser.profile : null;
  const engineerProfile = profile && isEngineerProfile(profile) ? profile : null;

  const handleSubmit = async (profileData: { name: string; githubUsername?: string }) => {
    try {
      await updateProfile(profileData);
      setSuccessMessage('Profile updated successfully');
      setIsEditing(false);
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to update profile:', err);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    clearError();
  };

  return (
    <div className="unjam-h-full unjam-flex unjam-flex-col">
      <div className="unjam-bg-white unjam-shadow-sm unjam-border-b unjam-border-gray-200 unjam-p-6">
        <h1 className="unjam-text-2xl unjam-font-bold unjam-text-gray-900">Settings</h1>
      </div>
      <div className="unjam-flex-1 unjam-overflow-y-auto unjam-p-4">
        <div className="unjam-max-w-6xl unjam-mx-auto unjam-space-y-6">
          {/* Profile Section */}
          {engineerProfile && (
            <div className="unjam-bg-white unjam-rounded-lg unjam-shadow unjam-p-6">
              <div className="unjam-flex unjam-justify-between unjam-items-center unjam-mb-4">
                <h2 className="unjam-text-2xl unjam-font-bold">Profile</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="unjam-inline-flex unjam-items-center unjam-gap-2 unjam-text-blue-600 hover:unjam-text-blue-700 unjam-transition-colors"
                  >
                    <Edit2 className="unjam-w-4 unjam-h-4" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>

              {successMessage && (
                <div className="unjam-mb-4 unjam-p-3 unjam-bg-green-50 unjam-border unjam-border-green-200 unjam-rounded">
                  <p className="unjam-text-green-600">{successMessage}</p>
                </div>
              )}

              {error && (
                <div className="unjam-mb-4 unjam-p-3 unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded">
                  <p className="unjam-text-red-600">{error.message}</p>
                </div>
              )}

              {isEditing ? (
                <EditProfileForm
                  profile={engineerProfile}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  isLoading={isLoading}
                />
              ) : (
                <div className="unjam-space-y-4">
                  <div className="unjam-flex unjam-items-start unjam-gap-3">
                    <User className="unjam-w-5 unjam-h-5 unjam-text-gray-400 unjam-mt-0.5" />
                    <div>
                      <p className="unjam-text-sm unjam-text-gray-600">Full Name</p>
                      <p className="unjam-text-base unjam-font-medium unjam-text-gray-900">{engineerProfile.name}</p>
                    </div>
                  </div>
                  <div className="unjam-flex unjam-items-start unjam-gap-3">
                    <span className="unjam-text-gray-400 unjam-text-sm unjam-mt-0.5">@</span>
                    <div>
                      <p className="unjam-text-sm unjam-text-gray-600">GitHub Username</p>
                      <p className="unjam-text-base unjam-font-medium unjam-text-gray-900">
                        {engineerProfile.githubUsername || 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Billing Account Section */}
          <BillingAccount />
        </div>
      </div>
    </div>
  );
};

export default Settings;
