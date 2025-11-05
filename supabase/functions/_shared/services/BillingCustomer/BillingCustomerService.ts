import type { Customer } from '@types'

/**
 * Interface for billing customer management service
 * Handles creating Stripe customers and customer sessions
 */
export interface BillingCustomerService {
  /**
   * Creates a new Stripe customer for a profile
   * @param profileId - The profile ID (used as metadata)
   * @param email - The customer's email address
   * @returns The created Stripe customer object
   */
  createCustomer(profileId: string, email: string): Promise<Customer>

  /**
   * Creates a Stripe Customer Session for use with the pricing table
   * @param customerId - The Stripe customer ID
   * @returns The customer session client secret
   */
  createCustomerSession(customerId: string): Promise<string>
}
