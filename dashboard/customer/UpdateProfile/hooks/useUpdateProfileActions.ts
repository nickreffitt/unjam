import { useState } from 'react';
import { useAuthManager } from '@dashboard/shared/contexts/AuthManagerContext';
import type { UserProfile } from '@common/types';

/**
 * Hook to handle profile update actions
 * Provides function to update profile with loading states
 */
export const useUpdateProfileActions = () => {
  const { authManager } = useAuthManager();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const updateProfile = async (updatedProfile: UserProfile): Promise<boolean> => {
    if (!authManager) {
      setUpdateError('Auth manager not available');
      return false;
    }

    try {
      setIsUpdating(true);
      setUpdateError(null);

      console.info('[useUpdateProfileActions] Updating profile:', updatedProfile.id);
      await authManager.updateProfile(updatedProfile);
      console.info('[useUpdateProfileActions] Successfully updated profile');

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      console.error('[useUpdateProfileActions] Error updating profile:', errorMessage);
      setUpdateError(errorMessage);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateProfile,
    isUpdating,
    updateError
  };
};
