import React, { useState } from 'react';
import { X } from 'lucide-react';
import EditProfileForm from '../EditProfileForm/EditProfileForm';
import { useEditProfileActions } from '../../hooks/useEditProfileActions';
import { type CustomerProfile } from '@common/types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CustomerProfile;
}

/**
 * Modal for editing customer profile
 * Provides a simple interface for customers to update their name
 */
const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  const { updateProfile, isLoading, error, clearError } = useEditProfileActions();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (profileData: { name: string }) => {
    try {
      await updateProfile(profileData);
      setSuccessMessage('Profile updated successfully');
      // Close modal after 1 second
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1000);
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to update profile:', err);
    }
  };

  const handleCancel = () => {
    clearError();
    setSuccessMessage(null);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="unjam-fixed unjam-inset-0 unjam-bg-black unjam-bg-opacity-50 unjam-z-[10000]"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="unjam-fixed unjam-inset-0 unjam-flex unjam-items-center unjam-justify-center unjam-z-[10001] unjam-p-4">
        <div className="unjam-bg-white unjam-rounded-lg unjam-shadow-xl unjam-max-w-md unjam-w-full unjam-max-h-[90vh] unjam-overflow-y-auto">
          {/* Header */}
          <div className="unjam-flex unjam-justify-between unjam-items-center unjam-p-6 unjam-border-b unjam-border-gray-200">
            <h2 className="unjam-text-xl unjam-font-bold unjam-text-gray-900">Edit Profile</h2>
            <button
              onClick={handleCancel}
              className="unjam-text-gray-400 hover:unjam-text-gray-600 unjam-transition-colors"
              disabled={isLoading}
            >
              <X className="unjam-w-6 unjam-h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="unjam-p-6">
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
              profile={profile}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default EditProfileModal;
