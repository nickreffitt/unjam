import type { CreditBalanceResponse, ProductsResponse, CheckoutSessionResponse } from '@common/types';
import { type ApiManager } from '@common/features/ApiManager';

/**
 * BillingManager handles one-time credit purchases and credit balance management
 * Coordinates between ApiManager for backend calls
 */
export class BillingManager {
  private readonly apiManager: ApiManager;

  constructor(apiManager: ApiManager) {
    this.apiManager = apiManager;
  }

  /**
   * Fetches all active credit purchase products
   * @returns Array of available products with pricing information
   * @throws Error if the request fails
   */
  async fetchProducts(): Promise<ProductsResponse> {
    return await this.apiManager.fetchProducts();
  }

  /**
   * Creates a checkout session for a one-time credit purchase
   * Redirects user to Stripe Checkout to complete the purchase
   * @param profileId - The user profile ID
   * @param priceId - The Stripe price ID of the product to purchase
   * @returns The checkout session URL to redirect the user to
   * @throws Error if the request fails
   */
  async createProductCheckoutSession(profileId: string, priceId: string): Promise<CheckoutSessionResponse> {
    return await this.apiManager.createProductCheckoutSession(profileId, priceId);
  }

  /**
   * Fetches the credit balance for a given profile ID
   * @param profileId - The profile ID to fetch the credit balance for
   * @returns The credit balance amount and pending credits
   * @throws Error if the request fails
   */
  async getCreditBalanceForProfile(profileId: string): Promise<CreditBalanceResponse> {
    return await this.apiManager.fetchCreditBalance(profileId);
  }
}
