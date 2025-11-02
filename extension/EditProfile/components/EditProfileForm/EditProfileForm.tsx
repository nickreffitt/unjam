import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { type CustomerProfile } from '@common/types';
import { type EditProfileFormData } from '../../hooks/useEditProfileActions';

interface EditProfileFormProps {
  profile: CustomerProfile;
  onSubmit: (profileData: EditProfileFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}

/**
 * Form component for editing customer profiles
 * Handles name updates only
 */
const EditProfileForm: React.FC<EditProfileFormProps> = ({
  profile,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const [name, setName] = useState(profile.name);

  // Update form when profile changes
  useEffect(() => {
    setName(profile.name);
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const profileData: EditProfileFormData = {
      name,
    };

    onSubmit(profileData);
  };

  return (
    <form onSubmit={handleSubmit} className="unjam-space-y-6">
      {/* Full Name */}
      <div>
        <label htmlFor="name" className="unjam-block unjam-text-sm unjam-font-medium unjam-text-gray-700">
          Full Name
        </label>
        <div className="unjam-mt-1 unjam-relative unjam-rounded-md unjam-shadow-sm">
          <div className="unjam-absolute unjam-inset-y-0 unjam-left-0 unjam-pl-3 unjam-flex unjam-items-center unjam-pointer-events-none">
            <User className="unjam-h-5 unjam-w-5 unjam-text-gray-400" />
          </div>
          <input
            type="text"
            name="name"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="unjam-block unjam-w-full unjam-pl-10 unjam-pr-3 unjam-py-3 unjam-border unjam-border-gray-300 unjam-rounded-md unjam-placeholder-gray-400 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-blue-500 focus:unjam-border-blue-500 sm:unjam-text-sm"
            placeholder="Enter your full name"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="unjam-flex unjam-space-x-3">
        <button
          type="submit"
          disabled={isLoading}
          className="unjam-flex-1 unjam-flex unjam-justify-center unjam-py-3 unjam-px-4 unjam-border unjam-border-transparent unjam-rounded-md unjam-shadow-sm unjam-text-sm unjam-font-medium unjam-text-white unjam-bg-blue-600 hover:unjam-bg-blue-700 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500 disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed unjam-transition-colors"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="unjam-flex-1 unjam-flex unjam-justify-center unjam-py-3 unjam-px-4 unjam-border unjam-border-gray-300 unjam-rounded-md unjam-shadow-sm unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-bg-white hover:unjam-bg-gray-50 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500 disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed unjam-transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default EditProfileForm;
