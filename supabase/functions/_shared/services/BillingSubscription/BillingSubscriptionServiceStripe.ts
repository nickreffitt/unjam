import type Stripe from 'stripe'
import type { BillingSubscriptionService } from './BillingSubscriptionService.ts'
import type { Subscription } from '@types'
import { subscribe } from "node:diagnostics_channel";

/**
 * Stripe implementation of BillingSubscriptionService
 * Fetches subscription data directly from Stripe API
 */
export class BillingSubscriptionServiceStripe implements BillingSubscriptionService {
  private stripe: Stripe

  constructor(stripe: Stripe) {
    this.stripe = stripe
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
      const product = firstItem.price.product as Stripe.Product

      const subscription = await this.mapStripeSubscription(stripeSubscription, product)

      console.info(`[BillingSubscriptionServiceStripe] Successfully fetched subscription: ${subscriptionId}`)
      return subscription
    } catch (err) {
      const error = err as Error
      console.error(`[BillingSubscriptionServiceStripe] Failed to fetch subscription ${subscriptionId}: ${error.message}`)
      return undefined
    }
  }

  /**
   * Fetches an active subscription by customer ID from Stripe
   * Returns the first active subscription found for the customer
   */
  async fetchActiveByCustomerId(customerId: string): Promise<Subscription | null> {
    console.info(`[BillingSubscriptionServiceStripe] Fetching active subscription for customer: ${customerId}`)

    try {
      // List subscriptions for customer
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
      })

      if (subscriptions.data.length === 0) {
        console.info(`[BillingSubscriptionServiceStripe] No active subscription found for customer: ${customerId}`)
        return null
      }

      const stripeSubscription = subscriptions.data[0]

      // Get the first subscription item
      const firstItem = stripeSubscription.items.data[0]
      if (!firstItem) {
        console.error(`[BillingSubscriptionServiceStripe] Subscription ${stripeSubscription.id} has no items`)
        return null
      }

      // Fetch the product separately to avoid nested expansion limits
      const price = firstItem.price
      const productId = typeof price.product === 'string' ? price.product : price.product.id
      const product = await this.stripe.products.retrieve(productId)

      const subscription = await this.mapStripeSubscription(stripeSubscription, product)

      console.info(`[BillingSubscriptionServiceStripe] Successfully fetched active subscription: ${stripeSubscription.id}`)
      return subscription
    } catch (err) {
      const error = err as Error
      console.error(`[BillingSubscriptionServiceStripe] Failed to fetch active subscription for customer ${customerId}: ${error.message}`)
      return null
    }
  }

  /**
   * Determines if a subscription change is an upgrade
   * Upgrade = immediate plan change with higher credit price
   */
  isUpgrade(oldSubscription: Subscription, newSubscription: Subscription): boolean {
    // Plan changed AND credit price increased
    return oldSubscription.planName !== newSubscription.planName &&
           newSubscription.creditPrice > oldSubscription.creditPrice
  }


  /**
   * Maps Stripe subscription data to our Subscription type
   */
  private async mapStripeSubscription(
    stripeSubscription: Stripe.Subscription,
    product: Stripe.Product
  ): Promise<Subscription> {
    const firstItem = stripeSubscription.items.data[0]
    const currentPeriodEnd = firstItem.current_period_end
    const currentPeriodStart = firstItem.current_period_start

    if (!firstItem.price.unit_amount) {
      throw new Error("No unit_amount set on subscription item")
    }
    if (!product.metadata.credit_price) {
      throw new Error("No credit_price set on subscription product")
    }

    const creditPrice = parseInt(product.metadata.credit_price)

    return {
      id: stripeSubscription.id,
      customerId: typeof stripeSubscription.customer === 'string'
        ? stripeSubscription.customer
        : stripeSubscription.customer.id,
      status: stripeSubscription.status,
      planName: product.name,
      planAmount: firstItem.price.unit_amount,
      creditPrice,
      currentPeriod: {
        start: new Date(currentPeriodStart * 1000),
        end: new Date(currentPeriodEnd * 1000)
      },
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
    }
  }
}
