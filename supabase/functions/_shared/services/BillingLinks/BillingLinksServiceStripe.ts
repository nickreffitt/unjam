import type Stripe from 'stripe'
import type { EngineerAccount } from '@types.ts'
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
  async createBillingPortalSession(stripeCustomerId: string, host: string | null): Promise<string> {
    console.info(`[BillingLinksServiceStripe] Creating billing portal session for customer: ${stripeCustomerId}`)
    try {
      const appUrl = (host) ? host : Deno.env.get('APP_URL')
      const session = await this.stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${appUrl}/app/buy`
      })

      console.info(`[BillingLinksServiceStripe] Successfully created portal session: ${session.id}`)
      return session.url
    } catch (err) {
      const error = err as Error
      console.error(`[BillingLinksServiceStripe] Failed to create portal session: ${error.message}`)
      throw new Error(`Failed to create billing portal session: ${error.message}`)
    }
  }

  /**
   * Creates an account link for engineer onboarding and verification
   * The link allows engineers to complete their Stripe Connect account setup
   */
  async createEngineerAccountLink(engineerAccount: EngineerAccount, host: string | null): Promise<string> {
    console.info(`[BillingLinksServiceStripe] Creating account link for engineer: ${engineerAccount.engineerId}`)
    try {
      const appUrl = (host) ? host : Deno.env.get('APP_URL')
      const accountLink = await this.stripe.accountLinks.create({
        account: engineerAccount.id,
        refresh_url: `${appUrl}/app/engineer/onboarding`,
        return_url: `${appUrl}/app/engineer/dashboard`,
        type: 'account_onboarding',
      })

      console.info(`[BillingLinksServiceStripe] Successfully created account link for account: ${engineerAccount.id}`)
      return accountLink.url
    } catch (err) {
      const error = err as Error
      console.error(`[BillingLinksServiceStripe] Failed to create account link: ${error.message}`)
      throw new Error(`Failed to create engineer account link: ${error.message}`)
    }
  }
}
