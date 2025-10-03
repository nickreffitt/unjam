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
   * Creates a credit grant for a paid invoice
   * Calculates credits based on invoice amount and subscription credit price
   *
   * Key behaviors:
   * - Voids all existing credit grants for the customer (no rollover)
   * - Sets expiration to subscription's current_period_end (credits expire at cycle end)
   * - No overage charges - credits are replenished each billing cycle
   *
   * @param invoice - The paid invoice to create credits for
   */
  createCreditGrantForInvoice(invoice: Invoice): Promise<void>

  /**
   * Determines if a subscription change is an upgrade
   * Upgrade = immediate plan change with higher credit price
   *
   * @param oldSubscription - The previous subscription
   * @param newSubscription - The new subscription
   * @returns True if this is an upgrade, false otherwise
   */
  isUpgrade(oldSubscription: Subscription, newSubscription: Subscription): boolean

  /**
   * Voids all existing credit grants for a customer
   * Used during upgrades to clear old plan credits
   *
   * @param customerId - The customer ID
   */
  voidExistingCreditGrants(customerId: string): Promise<void>
}
