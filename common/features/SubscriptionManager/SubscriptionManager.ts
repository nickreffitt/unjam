import type { Subscription } from '@common/types';
import { type SubscriptionStore } from '@common/features/SubscriptionManager/store';
import { type ApiManager } from '@common/features/ApiManager';

export class SubscriptionManager {
  private readonly subscriptionStore: SubscriptionStore;
  private readonly apiManager: ApiManager;

  constructor(subscriptionStore: SubscriptionStore, apiManager: ApiManager) {
    this.subscriptionStore = subscriptionStore;
    this.apiManager = apiManager;
  }

  /**
   * Gets the active subscription for a given profile ID
   * @param profileId - The profile ID to fetch the subscription for
   * @returns The active subscription if found, null otherwise
   */
  async getActiveSubscriptionForProfile(profileId: string): Promise<Subscription | null> {
    return await this.subscriptionStore.getActiveSubscriptionForProfile(profileId);
  }

  /**
   * Fetches the credit balance for a given profile ID
   * @param profileId - The profile ID to fetch the credit balance for
   * @returns The credit balance amount
   * @throws Error if the request fails
   */
  async getCreditBalanceForProfile(profileId: string): Promise<number> {
    return await this.apiManager.fetchCreditBalance(profileId);
  }

  /**
   * Creates a billing portal link for the given profile ID
   * @param profileId - The profile ID to create the billing portal link for
   * @returns The billing portal URL where the user can manage their subscription
   * @throws Error if the request fails or no billing customer exists
   */
  async createBillingPortalLink(profileId: string): Promise<string> {
    return await this.apiManager.createBillingPortalLink(profileId);
  }
}
