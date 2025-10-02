import type Stripe from 'stripe'
import type { BillingLinksService } from './BillingLinksService.ts'

/**
 * Stripe implementation of BillingLinksService
 * Creates billing portal sessions for customer self-service
 */
export class BillingLinksServiceStripe implements BillingLinksService {
  private stripe: Stripe

  constructor(stripe: Stripe) {
    this.stripe = stripe
  }

  /**
   * Creates a billing portal session for the customer
   * The portal allows customers to manage their subscriptions, payment methods, and billing history
   */
  async createBillingPortalSession(stripeCustomerId: string): Promise<string> {
    console.info(`[BillingLinksServiceStripe] Creating billing portal session for customer: ${stripeCustomerId}`)

    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${Deno.env.get('APP_URL')}/app/buy`
      })

      console.info(`[BillingLinksServiceStripe] Successfully created portal session: ${session.id}`)
      return session.url
    } catch (err) {
      const error = err as Error
      console.error(`[BillingLinksServiceStripe] Failed to create portal session: ${error.message}`)
      throw new Error(`Failed to create billing portal session: ${error.message}`)
    }
  }
}
