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
  private readonly engineerProfile: EngineerProfile;

  constructor(billingAccountStore: BillingAccountStore, 
    apiManager: ApiManager,
    engineerProfile: EngineerProfile) {

    if (!billingAccountStore) {
      throw new Error('BillingAccountManager: billingAccountStore is required');
    }
    if (!apiManager) {
      throw new Error('BillingAccountManager: apiManager is required');
    }
    if (!engineerProfile) {
      throw new Error('BillingAccountManager: engineerProfile is required');
    }

    this.billingAccountStore = billingAccountStore;
    this.apiManager = apiManager;
    this.engineerProfile = engineerProfile
  }

  /**
   * Gets an engineer's billing account
   * @returns The engineer's billing account if found, null otherwise
   */
  async getAccount(): Promise<EngineerAccount | null> {
    return await this.billingAccountStore.getByProfileId(this.engineerProfile.id);
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

  /**
   * Creates a Stripe Express Dashboard login link for an engineer
   * @returns The login URL where the engineer can access their Stripe dashboard
   * @throws Error if the request fails or no engineer account exists
   */
  async createLoginLink(): Promise<string> {
    return await this.apiManager.createEngineerLoginLink(this.engineerProfile.id);
  }
}
