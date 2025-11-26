import type { ProductInfo } from '@types'

/**
 * Service for fetching Stripe product information
 */
export interface BillingProductService {
  /**
   * Fetches all active Stripe Products with their pricing information
   * Each product represents a one-time credit purchase option
   * @returns Array of ProductInfo with price IDs for creating checkout sessions
   */
  fetchActiveProducts(): Promise<ProductInfo[]>
}
