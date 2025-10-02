import type { Subscription } from '@common/types';

export interface SubscriptionStore {
  getActiveSubscriptionForProfile(profileId: string): Promise<Subscription | null>;
}
