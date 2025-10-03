import type { EngineerAccount, EngineerProfile } from '@common/types';
import type { BillingAccountStore } from './store/BillingAccountStore';
import type { ApiManager } from '@common/features/ApiManager';

/**
 * BillingAccountManager handles engineer billing account operations
 * Manages retrieval and updates of engineer Stripe Connect accounts
 */
export class BillingAccountManager {
  private readonly billingAccountStore: BillingAccountStore;
  private readonly apiManager: ApiManager;

  constructor(billingAccountStore: BillingAccountStore, apiManager: ApiManager) {
    if (!billingAccountStore) {
      throw new Error('BillingAccountManager: billingAccountStore is required');
    }
    if (!apiManager) {
      throw new Error('BillingAccountManager: apiManager is required');
    }
    this.billingAccountStore = billingAccountStore;
    this.apiManager = apiManager;
  }

  /**
   * Gets an engineer's billing account by their profile ID
   * @param profileId - The engineer's profile ID
   * @returns The engineer's billing account if found, null otherwise
   */
  async getAccountByProfileId(profileId: string): Promise<EngineerAccount | null> {
    return await this.billingAccountStore.getByProfileId(profileId);
  }

  /**
   * Creates a Stripe Connect account link for engineer onboarding
   * @param engineerProfile - The engineer profile
   * @returns The account link URL where the engineer can complete onboarding
   * @throws Error if the request fails or engineer email is missing
   */
  async createAccountLink(engineerProfile: EngineerProfile): Promise<string> {
    return await this.apiManager.createEngineerAccountLink(engineerProfile);
  }
}
