import type Stripe from 'stripe'
import type { BillingProductService } from './BillingProductService.ts'
import type { ProductInfo } from '@types'

/**
 * Stripe implementation of BillingProductService
 * Fetches active Stripe products with pricing information
 */
export class BillingProductServiceStripe implements BillingProductService {
  private stripe: Stripe

  constructor(stripe: Stripe) {
    this.stripe = stripe
  }

  /**
   * Fetches all active Stripe Products with their pricing information
   * Each product represents a one-time credit purchase option
   */
  async fetchActiveProducts(): Promise<ProductInfo[]> {
    console.info('[BillingProductServiceStripe] Fetching active Stripe products')

    try {
      // 1. Fetch all active products
      const products = await this.stripe.products.list({
        active: true,
        expand: ['data.default_price']
      })

      console.info(`[BillingProductServiceStripe] Found ${products.data.length} active products`)

      // 2. Process each product
      const productInfos: ProductInfo[] = []

      for (const product of products.data) {
        try {
          // Skip products without prices
          if (!product.default_price) {
            console.warn(`[BillingProductServiceStripe] Skipping product ${product.id} - no default price`)
            continue
          }

          // Fetch prices for this product (filter for one-time payments)
          const prices = await this.stripe.prices.list({
            product: product.id,
            active: true,
            type: 'one_time'
          })

          if (prices.data.length === 0) {
            console.warn(`[BillingProductServiceStripe] Skipping product ${product.id} - no one-time prices found`)
            continue
          }

          const price = prices.data[0] // Use first active one-time price

          // Extract credit_price from metadata
          const creditPrice = product.metadata?.credit_price
          if (!creditPrice) {
            console.warn(`[BillingProductServiceStripe] Skipping product ${product.id} - no credit_price in metadata`)
            continue
          }

          // Extract marketing features
          const marketingFeatures = product.marketing_features?.map(feature => feature.name || '') || []

          // Extract most_popular flag from metadata
          const isMostPopular = product.metadata?.most_popular === 'true'

          // Build product info
          const productInfo: ProductInfo = {
            id: product.id,
            name: product.name,
            description: product.description || '',
            priceId: price.id,
            price: typeof price.unit_amount === 'number' ? price.unit_amount : 0,
            currency: price.currency,
            creditPrice: parseInt(creditPrice, 10),
            marketingFeatures,
            isMostPopular
          }

          productInfos.push(productInfo)
          console.info(`[BillingProductServiceStripe] Processed product: ${product.name} (${product.id})`)
        } catch (error) {
          console.error(`[BillingProductServiceStripe] Error processing product ${product.id}:`, error)
          // Continue processing other products
        }
      }

      // Sort products by price (ascending order - cheapest first)
      productInfos.sort((a, b) => a.price - b.price)

      console.info(`[BillingProductServiceStripe] Successfully processed ${productInfos.length} products (sorted by price)`)

      return productInfos
    } catch (error) {
      console.error('[BillingProductServiceStripe] Error fetching products:', error)
      throw new Error(`Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
