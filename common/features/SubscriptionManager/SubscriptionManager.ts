import type { Subscription } from '@common/types';
import { type SubscriptionStore } from '@common/features/SubscriptionManager/store';

export class SubscriptionManager {
  private readonly subscriptionStore: SubscriptionStore;

  constructor(subscriptionStore: SubscriptionStore) {
    this.subscriptionStore = subscriptionStore;
  }

  /**
   * Gets the active subscription for a given profile ID
   * @param profileId - The profile ID to fetch the subscription for
   * @returns The active subscription if found, null otherwise
   */
  async getActiveSubscriptionForProfile(profileId: string): Promise<Subscription | null> {
    return await this.subscriptionStore.getActiveSubscriptionForProfile(profileId);
  }
}
