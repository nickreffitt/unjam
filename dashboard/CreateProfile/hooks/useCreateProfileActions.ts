import { useState, useCallback } from 'react';
import { type ErrorDisplay, type UserProfile, type UserType } from '@common/types';
import { useAuthManager } from '@dashboard/shared/contexts/AuthManagerContext';

export interface ProfileFormData {
  name: string;
  userType: UserType;
  githubUsername?: string;
}

export interface UseCreateProfileActionsReturn {
  createProfile: (profileData: ProfileFormData) => Promise<UserProfile>;
  isLoading: boolean;
  error: ErrorDisplay | null;
  clearError: () => void;
}

/**
 * Hook for create profile actions
 * Handles profile creation with validation
 */
export const useCreateProfileActions = (): UseCreateProfileActionsReturn => {
  const { authManager } = useAuthManager();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorDisplay | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const createProfile = useCallback(async (profileData: ProfileFormData): Promise<UserProfile> => {
    if (!authManager) {
      throw new Error('AuthManager not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.debug('useCreateProfileActions: Creating profile:', profileData);

      // Validate required fields
      if (!profileData.name.trim()) {
        throw new Error('Name is required');
      }

      if (profileData.userType === 'engineer' && !profileData.githubUsername?.trim()) {
        throw new Error('GitHub username is required for engineers');
      }

      // Use AuthManager to create the profile in the database
      const newProfile = await authManager.createProfile({
        name: profileData.name.trim(),
        type: profileData.userType,
        githubUsername: profileData.githubUsername?.trim(),
        specialties: profileData.userType === 'engineer' ? [] : undefined,
      });

      console.debug('useCreateProfileActions: Profile created successfully:', newProfile);
      return newProfile;
    } catch (error) {
      console.error('useCreateProfileActions: Profile creation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create profile';
      setError({
        title: 'Profile Creation Failed',
        message: errorMessage,
      });
      throw error; // Re-throw so UI can handle it
    } finally {
      setIsLoading(false);
    }
  }, [authManager]);

  return {
    createProfile,
    isLoading,
    error,
    clearError,
  };
};