import type { EngineerAccount } from '@types.ts'

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
}
