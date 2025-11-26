import type { Subscription } from '@types'

/**
 * Credit balance information
 */
export interface CreditBalance {
  availableCredits: number
  usedCredits: number
  totalCredits: number
}

/**
 * Interface for billing credits service using Stripe Meters
 * Calculates credit balance from subscription allocation minus meter usage
 */
export interface BillingCreditsService {
  /**
   * Fetches the current credit balance for a customer from paid invoices
   * Calculates: credits from paid invoices (last 365 days) - meter events (last 365 days)
   * @param customerId - The Stripe customer ID
   * @returns Credit balance information including available, used, and total credits
   */
  fetchCreditBalanceFromInvoices(customerId: string): Promise<CreditBalance>
}
