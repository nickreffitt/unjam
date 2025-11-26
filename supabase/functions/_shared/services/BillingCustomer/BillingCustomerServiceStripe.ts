import type Stripe from 'stripe'
import type { BillingCustomerService } from './BillingCustomerService.ts'
import type { Customer } from '@types'

/**
 * Stripe implementation of BillingCustomerService
 * Manages Stripe customer creation
 */
export class BillingCustomerServiceStripe implements BillingCustomerService {
  private stripe: Stripe

  constructor(stripe: Stripe) {
    this.stripe = stripe
  }

  /**
   * Creates a new Stripe customer for a profile
   * @param profileId - The profile ID (stored in metadata for tracking)
   * @param email - The customer's email address
   * @returns The created Stripe customer object
   */
  async createCustomer(profileId: string, email: string): Promise<Customer> {
    console.info(`[BillingCustomerServiceStripe] Creating Stripe customer for profile: ${profileId}`)

    const stripeCustomer = await this.stripe.customers.create({
      email,
      metadata: {
        profile_id: profileId
      }
    })

    console.info(`[BillingCustomerServiceStripe] Successfully created Stripe customer: ${stripeCustomer.id}`)

    return {
      id: stripeCustomer.id,
      email: stripeCustomer.email,
      name: stripeCustomer.name
    }
  }

  /**
   * Creates a Stripe Customer Session for use with the pricing table
   * @param customerId - The Stripe customer ID
   * @returns The customer session client secret
   */
  async createCustomerSession(customerId: string): Promise<string> {
    console.info(`[BillingCustomerServiceStripe] Creating customer session for Stripe customer: ${customerId}`)

    const customerSession = await this.stripe.customerSessions.create({
      customer: customerId,
      components: {
        pricing_table: {
          enabled: true
        }
      }
    })

    console.info(`[BillingCustomerServiceStripe] Successfully created customer session`)

    return customerSession.client_secret
  }
}
