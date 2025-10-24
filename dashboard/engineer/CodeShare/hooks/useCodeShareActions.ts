import type { UserProfile } from '@common/types';
import { useCodeShareManager } from '@dashboard/engineer/CodeShare/contexts/CodeShareManagerContext';
import { useChatManager } from '@dashboard/engineer/ChatBox/contexts/ChatManagerContext';

export interface UseCodeShareActionsReturn {
  requestCodeShare: (customer: UserProfile) => Promise<void>;
}

export const useCodeShareActions = (): UseCodeShareActionsReturn => {
  const { codeShareManager } = useCodeShareManager();
  const { userProfile } = useChatManager();

  const requestCodeShare = async (customer: UserProfile) => {
    if (!userProfile || userProfile.type !== 'engineer') {
      console.error('No engineer profile available for code share request');
      return;
    }

    try {
      console.debug('Requesting code share from customer:', customer.name);
      await codeShareManager.requestCodeShare(userProfile, customer);
    } catch (error) {
      console.error('Failed to request code share:', error);
    }
  };

  return {
    requestCodeShare
  };
};
