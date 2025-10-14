import type { Subscription, Invoice } from '@types'

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

  /**
   * Fetches an active subscription by customer ID
   * @param customerId - The billing provider's customer ID
   * @returns The active subscription if found, null otherwise
   */
  fetchActiveByCustomerId(customerId: string): Promise<Subscription | null>

  /**
   * Determines if a subscription change is an upgrade
   * Upgrade = immediate plan change with higher credit price
   *
   * @param oldSubscription - The previous subscription
   * @param newSubscription - The new subscription
   * @returns True if this is an upgrade, false otherwise
   */
  isUpgrade(oldSubscription: Subscription, newSubscription: Subscription): boolean
}
