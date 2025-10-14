import type { Subscription } from '@types'

/**
 * Credit balance information
 */
export interface CreditBalance {
  availableCredits: number
  usedCredits: number
  totalCredits: number
  creditPrice: number
}

/**
 * Interface for billing credits service using Stripe Meters
 * Calculates credit balance from subscription allocation minus meter usage
 */
export interface BillingCreditsService {
  /**
   * Fetches the current credit balance for a customer
   * Calculates: subscription credits - meter events in current period
   * @param subscription - The customer's subscription containing credit allocation
   * @param customerId - The Stripe customer ID
   * @returns Credit balance information including available, used, and total credits
   */
  fetchCreditBalance(subscription: Subscription, customerId: string): Promise<CreditBalance>
}
