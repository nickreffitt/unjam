import { useState, useEffect } from 'react';
import { useAuthManager } from '@dashboard/shared/contexts/AuthManagerContext';
import type { UserProfile } from '@common/types';

/**
 * Hook to get current user profile
 * Returns profile data and loading state
 */
export const useUpdateProfileState = () => {
  const { authUser } = useAuthManager();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authUser.status === 'signed-in' && authUser.profile) {
      setProfile(authUser.profile);
      setIsLoading(false);
    } else if (authUser.status === 'not-signed-in' || authUser.status === 'requires-profile') {
      setProfile(null);
      setIsLoading(false);
    }
  }, [authUser]);

  return {
    profile,
    isLoading
  };
};
