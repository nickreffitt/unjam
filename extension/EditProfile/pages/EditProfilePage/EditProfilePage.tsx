import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import EditProfileForm from '../../components/EditProfileForm/EditProfileForm';
import { useEditProfileActions } from '../../hooks/useEditProfileActions';
import { useUserProfile } from '@extension/shared/UserProfileContext';
import { isCustomerProfile } from '@common/util/userTypeGuards';

const EditProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const profile = useUserProfile();
  const { updateProfile, isLoading, error, clearError } = useEditProfileActions();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const customerProfile = profile && isCustomerProfile(profile) ? profile : null;

  const handleSubmit = async (profileData: { name: string }) => {
    try {
      await updateProfile(profileData);
      setSuccessMessage('Profile updated successfully');
      // Navigate back after 1 second
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to update profile:', err);
    }
  };

  const handleCancel = () => {
    clearError();
    navigate('/');
  };

  if (!customerProfile) {
    return (
      <div className="unjam-h-full unjam-flex unjam-items-center unjam-justify-center unjam-p-4">
        <div className="unjam-text-gray-600">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="unjam-h-full unjam-flex unjam-flex-col">
      {/* Header */}
      <div className="unjam-bg-white unjam-shadow-sm unjam-border-b unjam-border-gray-200 unjam-p-4">
        <div className="unjam-flex unjam-items-center unjam-gap-3">
          <button
            onClick={handleCancel}
            className="unjam-p-2 unjam-text-gray-600 hover:unjam-text-gray-900 unjam-transition-colors"
          >
            <ArrowLeft className="unjam-w-5 unjam-h-5" />
          </button>
          <h1 className="unjam-text-xl unjam-font-bold unjam-text-gray-900">Edit Profile</h1>
        </div>
      </div>

      {/* Content */}
      <div className="unjam-flex-1 unjam-overflow-y-auto unjam-p-4">
        <div className="unjam-max-w-2xl unjam-mx-auto">
          <div className="unjam-bg-white unjam-rounded-lg unjam-shadow unjam-p-6">
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

            <EditProfileForm
              profile={customerProfile}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfilePage;
