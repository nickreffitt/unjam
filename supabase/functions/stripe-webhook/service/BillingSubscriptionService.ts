import type { Subscription } from '@types'

/**
 * Service for fetching subscription data directly from the billing provider
 * Avoids race conditions by fetching directly from Stripe instead of the local store
 */
export interface BillingSubscriptionService {
  /**
   * Fetches a subscription directly from the billing provider
   * @param subscriptionId - The billing provider's subscription ID
   * @returns The subscription if found, undefined otherwise
   */
  fetch(subscriptionId: string): Promise<Subscription | undefined>
}
