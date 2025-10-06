import type { CreditGrant, CreditGrantAmount, CreditGrantCategory, CreditGrantApplicabilityConfig, Subscription } from '@types'

/**
 * Parameters for creating a credit grant
 */
export interface CreateCreditGrantParams {
  customerId: string
  name: string
  amount: CreditGrantAmount
  category: CreditGrantCategory
  applicability_config: CreditGrantApplicabilityConfig
  effective_at?: number
  expires_at?: number
  metadata?: Record<string, string>
}

/**
 * Credit balance information
 */
export interface CreditBalance {
  availableBalanceCents: number
  creditCount: number
  creditPrice: number
}

/**
 * Interface for billing credits service using Stripe Credit Grants API
 * Manages prepaid credits for customers
 */
export interface BillingCreditsService {
  /**
   * Creates a new credit grant for a customer
   * @param params - The credit grant parameters
   * @returns The created credit grant
   */
  create(params: CreateCreditGrantParams): Promise<CreditGrant>

  /**
   * Lists all credit grants for a customer
   * @param customerId - The customer's ID
   * @returns Array of credit grants
   */
  listByCustomer(customerId: string): Promise<CreditGrant[]>

  /**
   * Voids a credit grant (cancels unused credits)
   * @param creditGrantId - The credit grant ID to void
   */
  void(creditGrantId: string): Promise<void>

  /**
   * Fetches the current credit balance for a customer
   * @param subscription - The customer's subscription containing creditPrice
   * @returns Credit balance information including available balance and credit count
   */
  fetchCreditBalance(subscription: Subscription): Promise<CreditBalance>
}
