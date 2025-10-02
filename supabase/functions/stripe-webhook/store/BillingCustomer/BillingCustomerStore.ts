import type { Customer } from '@types'

/**
 * Interface for billing customer persistence
 */
export interface BillingCustomerStore {
  /**
   * Creates a new billing customer record
   * @param customer - The customer data from the billing provider
   * @returns The profile ID associated with this customer
   */
  create(customer: Customer): Promise<string>

  /**
   * Updates an existing billing customer record
   * @param customer - The updated customer data
   */
  update(customer: Customer): Promise<void>

  /**
   * Deletes a billing customer record
   * @param customerId - The billing provider's customer ID
   */
  delete(customerId: string): Promise<void>

  /**
   * Fetches a billing customer by their billing provider ID
   * @param customerId - The billing provider's customer ID
   * @returns The profile ID if found, undefined otherwise
   */
  fetch(customerId: string): Promise<string | undefined>
}
