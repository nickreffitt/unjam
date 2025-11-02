import { useState, useCallback } from 'react';
import { type ErrorDisplay, type UserProfile } from '@common/types';
import { useAuthManager } from '@dashboard/shared/contexts/AuthManagerContext';

export interface EditProfileFormData {
  name: string;
  githubUsername?: string;
}

export interface UseEditProfileActionsReturn {
  updateProfile: (profileData: EditProfileFormData) => Promise<UserProfile>;
  isLoading: boolean;
  error: ErrorDisplay | null;
  clearError: () => void;
}

/**
 * Hook for edit profile actions
 * Handles profile updates with validation
 */
export const useEditProfileActions = (): UseEditProfileActionsReturn => {
  const { authManager } = useAuthManager();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorDisplay | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const updateProfile = useCallback(async (profileData: EditProfileFormData): Promise<UserProfile> => {
    if (!authManager) {
      throw new Error('AuthManager not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.debug('useEditProfileActions: Updating profile:', profileData);

      // Validate required fields
      if (!profileData.name.trim()) {
        throw new Error('Name is required');
      }

      // Use AuthManager to update the profile in the database
      const updatedProfile = await authManager.updateProfile({
        name: profileData.name.trim(),
        githubUsername: profileData.githubUsername?.trim(),
      });

      console.debug('useEditProfileActions: Profile updated successfully:', updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error('useEditProfileActions: Profile update failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setError({
        title: 'Profile Update Failed',
        message: errorMessage,
      });
      throw error; // Re-throw so UI can handle it
    } finally {
      setIsLoading(false);
    }
  }, [authManager]);

  return {
    updateProfile,
    isLoading,
    error,
    clearError,
  };
};
