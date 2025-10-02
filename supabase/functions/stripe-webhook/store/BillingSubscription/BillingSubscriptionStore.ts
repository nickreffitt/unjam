import type { Subscription } from '@types'

/**
 * Interface for billing subscription persistence
 */
export interface BillingSubscriptionStore {
  /**
   * Creates a new billing subscription record
   * @param subscription - The subscription data from the billing provider
   */
  create(subscription: Subscription): Promise<void>

  /**
   * Updates an existing billing subscription record
   * @param subscription - The updated subscription data
   */
  update(subscription: Subscription): Promise<void>

  /**
   * Deletes a billing subscription record
   * @param subscriptionId - The billing provider's subscription ID
   */
  delete(subscriptionId: string): Promise<void>

  /**
   * Fetches a billing subscription by its billing provider ID
   * @param subscriptionId - The billing provider's subscription ID
   * @returns The subscription if found, undefined otherwise
   */
  fetch(subscriptionId: string): Promise<Subscription | undefined>
}
