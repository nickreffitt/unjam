/**
 * Service for generating billing portal links
 */
export interface BillingLinksService {
  /**
   * Creates a billing portal session and returns the URL
   * @param stripeCustomerId - The Stripe customer ID
   * @returns The portal session URL
   */
  createBillingPortalSession(stripeCustomerId: string): Promise<string>
}
