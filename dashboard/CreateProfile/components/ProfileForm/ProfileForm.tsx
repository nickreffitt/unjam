import React, { useState, useMemo } from 'react';
import { User, Code, Users } from 'lucide-react';
import { type UserType } from '@common/types';
import { type ProfileFormData } from '../../hooks/useCreateProfileActions';
import CountryDropdown from '@dashboard/shared/components/CountryDropdown/CountryDropdown';
import { STRIPE_CONNECT_COUNTRIES, BANK_TRANSFER_COUNTRIES } from '@common/utils/payoutProviders';

interface ProfileFormProps {
  onSubmit: (profileData: ProfileFormData) => void;
  isLoading: boolean;
}

/**
 * Form component for creating user profiles
 * Handles user type selection, name input, and GitHub username for engineers
 */
const ProfileForm: React.FC<ProfileFormProps> = ({
  onSubmit,
  isLoading,
}) => {
  const [name, setName] = useState('');
  const [userType, setUserType] = useState<UserType>('customer');
  const [githubUsername, setGithubUsername] = useState('');
  const [country, setCountry] = useState('');

  // Determine allowed countries based on user type
  const allowedCountries = useMemo(() => {
    return userType === 'customer' ? STRIPE_CONNECT_COUNTRIES : BANK_TRANSFER_COUNTRIES;
  }, [userType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const profileData: ProfileFormData = {
      name,
      userType,
      country,
      ...(userType === 'engineer' && { githubUsername }),
    };

    onSubmit(profileData);
  };

  return (
    <form onSubmit={handleSubmit} className="unjam-space-y-6">
      {/* User Type Selection */}
      <div>
        <label className="unjam-block unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-mb-3">
          I am a...
        </label>
        <div className="unjam-space-y-3">
          {/* Customer Option */}
          <label className="unjam-flex unjam-items-center unjam-space-x-3 unjam-p-4 unjam-border unjam-border-gray-300 unjam-rounded-lg unjam-cursor-pointer unjam-transition-colors hover:unjam-border-blue-500 hover:unjam-bg-blue-50">
            <input
              type="radio"
              name="userType"
              value="customer"
              checked={userType === 'customer'}
              onChange={(e) => setUserType(e.target.value as UserType)}
              className="unjam-text-blue-600 focus:unjam-ring-blue-500"
            />
            <Users className="unjam-h-5 unjam-w-5 unjam-text-gray-400" />
            <div>
              <div className="unjam-font-medium unjam-text-gray-900">Customer</div>
              <div className="unjam-text-sm unjam-text-gray-600">I need help with technical issues</div>
            </div>
          </label>

          {/* Engineer Option */}
          <label className="unjam-flex unjam-items-center unjam-space-x-3 unjam-p-4 unjam-border unjam-border-gray-300 unjam-rounded-lg unjam-cursor-pointer unjam-transition-colors hover:unjam-border-blue-500 hover:unjam-bg-blue-50">
            <input
              type="radio"
              name="userType"
              value="engineer"
              checked={userType === 'engineer'}
              onChange={(e) => setUserType(e.target.value as UserType)}
              className="unjam-text-blue-600 focus:unjam-ring-blue-500"
            />
            <Code className="unjam-h-5 unjam-w-5 unjam-text-gray-400" />
            <div>
              <div className="unjam-font-medium unjam-text-gray-900">Engineer</div>
              <div className="unjam-text-sm unjam-text-gray-600">I provide technical support and solutions</div>
            </div>
          </label>
        </div>
      </div>

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

      {/* Country Selection */}
      <div>
        <label htmlFor="country" className="unjam-block unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-mb-1">
          Country
        </label>
        <CountryDropdown
          value={country}
          onChange={(countryCode) => setCountry(countryCode)}
          placeholder="Select your country"
          required
          allowedCountries={allowedCountries}
        />
        <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-500">
          {userType === 'engineer'
            ? 'Your country determines which payout options are available to you'
            : 'We currently support customers in these countries'}
        </p>
      </div>

      {/* GitHub Username (only for engineers) */}
      {userType === 'engineer' && (
        <div>
          <label htmlFor="githubUsername" className="unjam-block unjam-text-sm unjam-font-medium unjam-text-gray-700">
            GitHub Username
          </label>
          <div className="unjam-mt-1 unjam-relative unjam-rounded-md unjam-shadow-sm">
            <div className="unjam-absolute unjam-inset-y-0 unjam-left-0 unjam-pl-3 unjam-flex unjam-items-center unjam-pointer-events-none">
              <span className="unjam-text-gray-500 unjam-text-sm">@</span>
            </div>
            <input
              type="text"
              name="githubUsername"
              id="githubUsername"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              required={userType === 'engineer'}
              className="unjam-block unjam-w-full unjam-pl-8 unjam-pr-3 unjam-py-3 unjam-border unjam-border-gray-300 unjam-rounded-md unjam-placeholder-gray-400 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-blue-500 focus:unjam-border-blue-500 sm:unjam-text-sm"
              placeholder="your-github-username"
            />
          </div>
          <p className="unjam-mt-2 unjam-text-sm unjam-text-gray-500">
            Your GitHub username helps identify your technical expertise
          </p>
        </div>
      )}

      {/* Submit Button */}
      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="unjam-w-full unjam-flex unjam-justify-center unjam-py-3 unjam-px-4 unjam-border unjam-border-transparent unjam-rounded-md unjam-shadow-sm unjam-text-sm unjam-font-medium unjam-text-white unjam-bg-blue-600 hover:unjam-bg-blue-700 focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-offset-2 focus:unjam-ring-blue-500 disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed unjam-transition-colors"
        >
          {isLoading ? 'Creating Profile...' : 'Complete Profile'}
        </button>
      </div>
    </form>
  );
};

export default ProfileForm;