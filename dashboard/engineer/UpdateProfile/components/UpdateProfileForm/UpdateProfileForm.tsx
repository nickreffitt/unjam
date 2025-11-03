import React, { useState } from 'react';
import { useUpdateProfileState } from '../../hooks/useUpdateProfileState';
import { useUpdateProfileActions } from '../../hooks/useUpdateProfileActions';

const UpdateProfileForm: React.FC = () => {
  const { profile, isLoading: isLoadingProfile } = useUpdateProfileState();
  const { updateProfile, isUpdating, updateError } = useUpdateProfileActions();

  const [name, setName] = useState(profile?.name || '');
  const [githubUsername, setGithubUsername] = useState(
    profile?.type === 'engineer' ? profile.githubUsername || '' : ''
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Update form when profile loads
  React.useEffect(() => {
    if (profile) {
      setName(profile.name);
      if (profile.type === 'engineer') {
        setGithubUsername(profile.githubUsername || '');
      }
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);

    if (!profile) {
      return;
    }

    const updatedProfile = {
      ...profile,
      name,
      ...(profile.type === 'engineer' && { githubUsername }),
    };

    const success = await updateProfile(updatedProfile);
    if (success) {
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const hasChanges = () => {
    if (!profile) return false;
    if (name !== profile.name) return true;
    if (profile.type === 'engineer' && githubUsername !== (profile.githubUsername || '')) {
      return true;
    }
    return false;
  };

  if (isLoadingProfile) {
    return (
      <div className="unjam-flex unjam-items-center unjam-justify-center unjam-py-12">
        <div className="unjam-w-8 unjam-h-8 unjam-border-4 unjam-border-gray-300 unjam-border-t-gray-600 unjam-rounded-full unjam-animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="unjam-text-center unjam-py-12 unjam-text-gray-500">
        No profile found
      </div>
    );
  }

  return (
    <div className="unjam-bg-white unjam-rounded-lg unjam-shadow unjam-p-6">
      <h2 className="unjam-text-2xl unjam-font-bold unjam-mb-4">Profile Information</h2>

      <form onSubmit={handleSubmit} className="unjam-space-y-4">
        {/* Name Field */}
        <div>
          <label
            htmlFor="name"
            className="unjam-block unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-mb-1"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="unjam-w-full unjam-px-3 unjam-py-2 unjam-border unjam-border-gray-300 unjam-rounded focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-blue-500"
            placeholder="Enter your name"
          />
        </div>

        {/* GitHub Username Field - Only for Engineers */}
        {profile.type === 'engineer' && (
          <div>
            <label
              htmlFor="githubUsername"
              className="unjam-block unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-mb-1"
            >
              GitHub Username
            </label>
            <input
              type="text"
              id="githubUsername"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              required
              className="unjam-w-full unjam-px-3 unjam-py-2 unjam-border unjam-border-gray-300 unjam-rounded focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-blue-500"
              placeholder="Enter your GitHub username"
            />
          </div>
        )}

        {/* Error Message */}
        {updateError && (
          <div className="unjam-p-3 unjam-bg-red-50 unjam-border unjam-border-red-200 unjam-rounded">
            <p className="unjam-text-red-600">{updateError}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="unjam-p-3 unjam-bg-green-50 unjam-border unjam-border-green-200 unjam-rounded">
            <p className="unjam-text-green-600">{successMessage}</p>
          </div>
        )}

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isUpdating || !hasChanges()}
            className="unjam-inline-flex unjam-items-center unjam-gap-2 unjam-bg-blue-600 unjam-text-white unjam-px-6 unjam-py-2 unjam-rounded-lg hover:unjam-bg-blue-700 unjam-transition-colors disabled:unjam-bg-blue-400 disabled:unjam-cursor-not-allowed"
          >
            {isUpdating ? (
              <>
                <div className="unjam-w-4 unjam-h-4 unjam-border-2 unjam-border-white unjam-border-t-transparent unjam-rounded-full unjam-animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UpdateProfileForm;
