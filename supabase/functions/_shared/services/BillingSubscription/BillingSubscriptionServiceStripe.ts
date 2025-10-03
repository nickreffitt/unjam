import type Stripe from 'stripe'
import type { BillingSubscriptionService } from './BillingSubscriptionService.ts'
import type { BillingCreditsService } from '@services/BillingCredits/index.ts'
import type { Subscription, Invoice } from '@types'

/**
 * Stripe implementation of BillingSubscriptionService
 * Fetches subscription data directly from Stripe API
 */
export class BillingSubscriptionServiceStripe implements BillingSubscriptionService {
  private stripe: Stripe
  private creditsService: BillingCreditsService

  constructor(stripe: Stripe, creditsService: BillingCreditsService) {
    this.stripe = stripe
    this.creditsService = creditsService
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

  /**
   * Creates a credit grant for a paid invoice
   * Calculates credits based on invoice amount and subscription credit price
   *
   * Key behaviors:
   * - Voids all existing credit grants for the customer (no rollover)
   * - Sets expiration to subscription's current_period_end (credits expire at cycle end)
   * - No overage charges - credits are replenished each billing cycle
   */
  async createCreditGrantForInvoice(invoice: Invoice): Promise<void> {
    console.info(`[BillingSubscriptionServiceStripe] Creating credit grant for invoice: ${invoice.id}`)

    // Fetch subscription directly from Stripe to avoid race conditions
    const subscription = await this.fetch(invoice.subscriptionId)
    if (!subscription) {
      console.warn(`[BillingSubscriptionServiceStripe] Subscription ${invoice.subscriptionId} not found in Stripe, skipping credit grant creation`)
      return
    }

    // Calculate number of credits based on invoice amount and credit price
    // invoice.amount is in cents, creditPrice is in cents per credit
    const numberOfCredits = subscription.creditPrice > 0
      ? Math.floor(invoice.amount / subscription.creditPrice)
      : 0

    if (numberOfCredits <= 0) {
      console.warn(`[BillingSubscriptionServiceStripe] No credits to grant for invoice ${invoice.id} (amount: ${invoice.amount}, creditPrice: ${subscription.creditPrice})`)
      return
    }

    // Void all existing credit grants for this customer (no rollover policy)
    await this.voidExistingCreditGrants(invoice.customerId)

    // Use subscription's current_period_end for credit expiration
    const expiresAt = Math.floor(invoice.periodEnd.getTime() / 1000)
    console.info(`[BillingSubscriptionServiceStripe] Credit grant will expire at: ${new Date(expiresAt * 1000).toISOString()}`)

    // Create credit grant with expiration set to end of billing period
    await this.creditsService.create({
      customerId: invoice.customerId,
      name: `Credits for ${subscription.planName} - Invoice ${invoice.id}`,
      amount: {
        type: 'monetary',
        monetary: {
          value: invoice.amount,
          currency: 'usd'
        }
      },
      category: 'paid',
      applicability_config: {
        scope: {
          price_type: 'metered'
        }
      },
      expires_at: expiresAt, // Credits expire at end of billing period (no rollover)
      metadata: {
        invoice_id: invoice.id,
        subscription_id: invoice.subscriptionId,
        credits_count: numberOfCredits.toString()
      }
    })

    console.info(`[BillingSubscriptionServiceStripe] Created credit grant for ${numberOfCredits} credits (${invoice.amount} cents at ${subscription.creditPrice} cents per credit)`)
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
   * Voids all existing credit grants for a customer
   * This implements the no-rollover policy where credits don't carry over between billing cycles
   */
  async voidExistingCreditGrants(customerId: string): Promise<void> {
    console.info(`[BillingSubscriptionServiceStripe] Voiding existing credit grants for customer: ${customerId}`)

    try {
      const existingGrants = await this.creditsService.listByCustomer(customerId)

      for (const grant of existingGrants) {
        try {
          await this.creditsService.void(grant.id)
          console.info(`[BillingSubscriptionServiceStripe] Voided credit grant: ${grant.id}`)
        } catch (err) {
          const error = err as Error
          console.warn(`[BillingSubscriptionServiceStripe] Failed to void credit grant ${grant.id}: ${error.message}`)
        }
      }

      console.info(`[BillingSubscriptionServiceStripe] Voided ${existingGrants.length} existing credit grants`)
    } catch (err) {
      const error = err as Error
      console.error(`[BillingSubscriptionServiceStripe] Failed to list/void existing credit grants: ${error.message}`)
      // Don't throw - we still want to create the new grant even if voiding old ones fails
    }
  }
}
