import Stripe from 'stripe'
import type { BillingSubscriptionService } from '../service/BillingSubscriptionService.ts'
import type { Subscription } from '@types'

/**
 * Stripe implementation of BillingSubscriptionService
 * Fetches subscription data directly from Stripe API
 */
export class BillingSubscriptionServiceStripe implements BillingSubscriptionService {
  private stripe: Stripe

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-08-27.basil'
    })
  }

  /**
   * Fetches a subscription directly from Stripe
   * Avoids race conditions by not relying on webhook-populated store
   */
  async fetch(subscriptionId: string): Promise<Subscription | undefined> {
    console.info(`[BillingSubscriptionServiceStripe] Fetching subscription from Stripe: ${subscriptionId}`)

    try {
      // Fetch subscription with product expanded
      const stripeSubscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price.product']
      })

      // Get the first subscription item
      const firstItem = stripeSubscription.items.data[0]
      if (!firstItem) {
        console.error(`[BillingSubscriptionServiceStripe] Subscription ${subscriptionId} has no items`)
        return undefined
      }

      // Extract product info
      const price = firstItem.price
      const product = price.product as Stripe.Product
      const planName = product.name
      const creditPrice = parseInt(product.metadata.credit_price || '0', 10)

      // Get current_period_end from subscription item
      const currentPeriodEnd = firstItem.current_period_end

      const subscription: Subscription = {
        id: stripeSubscription.id,
        customerId: typeof stripeSubscription.customer === 'string'
          ? stripeSubscription.customer
          : stripeSubscription.customer.id,
        status: stripeSubscription.status,
        planName,
        creditPrice,
        currentPeriodEnd
      }

      console.info(`[BillingSubscriptionServiceStripe] Successfully fetched subscription: ${subscriptionId}`)
      return subscription
    } catch (err) {
      const error = err as Error
      console.error(`[BillingSubscriptionServiceStripe] Failed to fetch subscription ${subscriptionId}: ${error.message}`)
      return undefined
    }
  }
}
