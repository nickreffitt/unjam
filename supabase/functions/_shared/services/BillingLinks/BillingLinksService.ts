import type { EngineerAccount } from '@types'

/**
 * Service for generating billing portal links
 */
export interface BillingLinksService {
  /**
   * Creates a billing portal session and returns the URL
   * @param stripeCustomerId - The Stripe customer ID
   * @param host - The origin host to use in the redirect URL
   * @returns The portal session URL
   */
  createBillingPortalSession(stripeCustomerId: string, host: string | null): Promise<string>

  /**
   * Creates an account link for engineer onboarding/verification
   * @param engineerAccount - The engineer account to create link for
   * @param host - The origin host to use in the redirect URLs
   * @returns The account link URL
   */
  createEngineerAccountLink(engineerAccount: EngineerAccount, host: string | null): Promise<string>

  /**
   * Creates a login link for an engineer to access the Express Dashboard
   * @param engineerAccount - The engineer account to create login link for
   * @returns The login link URL
   */
  createEngineerLoginLink(engineerAccount: EngineerAccount): Promise<string>

  /**
   * Creates a Stripe Checkout Session for one-time credit purchases
   * Sessions are attached to existing customers to prevent duplicates
   * @param customerId - The Stripe customer ID to attach the session to
   * @param priceId - The Stripe price ID for the product being purchased
   * @param host - The origin host to use in redirect URLs
   * @returns The checkout session URL (expires in 24 hours)
   */
  createCheckoutSession(customerId: string, priceId: string, host: string | null): Promise<string>
}
