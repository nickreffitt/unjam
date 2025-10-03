import type Stripe from 'stripe'
import type { BillingCreditsService, CreateCreditGrantParams } from './BillingCreditsService.ts'
import type { CreditGrant } from '@types'

/**
 * Stripe implementation of BillingCreditsService using Stripe Credit Grants API
 */
export class BillingCreditsServiceStripe implements BillingCreditsService {
  private stripe: Stripe

  constructor(stripe: Stripe) {
    this.stripe = stripe
  }

  /**
   * Creates a new credit grant for a customer using Stripe Credit Grants API
   */
  async create(params: CreateCreditGrantParams): Promise<CreditGrant> {
    console.info(`[BillingCreditsServiceStripe] Creating credit grant for customer: ${params.customerId}`)

    try {
      const stripeCreditGrant = await this.stripe.billing.creditGrants.create({
        customer: params.customerId,
        name: params.name,
        amount: {
          type: params.amount.type,
          monetary: {
            value: params.amount.monetary.value,
            currency: params.amount.monetary.currency
          }
        },
        category: params.category,
        applicability_config: {
          scope: {
            price_type: params.applicability_config.scope.price_type
          }
        },
        effective_at: params.effective_at,
        expires_at: params.expires_at,
        metadata: params.metadata
      })

      const creditGrant = this.mapStripeCreditGrantToCreditGrant(stripeCreditGrant)
      console.info(`✅ [BillingCreditsServiceStripe] Credit grant created: ${creditGrant.id}`)
      return creditGrant
    } catch (err) {
      const error = err as Error
      console.error('[BillingCreditsServiceStripe] Failed to create credit grant:', error.message)
      throw new Error(`Failed to create credit grant: ${error.message}`)
    }
  }

  /**
   * Lists all credit grants for a customer
   */
  async listByCustomer(customerId: string): Promise<CreditGrant[]> {
    console.info(`[BillingCreditsServiceStripe] Listing credit grants for customer: ${customerId}`)

    try {
      const stripeCreditGrants = await this.stripe.billing.creditGrants.list({
        customer: customerId,
        limit: 100
      })

      const creditGrants = stripeCreditGrants.data.map(scg =>
        this.mapStripeCreditGrantToCreditGrant(scg)
      )

      console.info(`✅ [BillingCreditsServiceStripe] Found ${creditGrants.length} credit grants`)
      return creditGrants
    } catch (err) {
      const error = err as Error
      console.error('[BillingCreditsServiceStripe] Failed to list credit grants:', error.message)
      throw new Error(`Failed to list credit grants: ${error.message}`)
    }
  }

  /**
   * Voids a credit grant (cancels unused credits)
   */
  async void(creditGrantId: string): Promise<void> {
    console.info(`[BillingCreditsServiceStripe] Voiding credit grant: ${creditGrantId}`)

    try {
      await this.stripe.billing.creditGrants.voidGrant(creditGrantId)
      console.info(`✅ [BillingCreditsServiceStripe] Credit grant voided: ${creditGrantId}`)
    } catch (err) {
      const error = err as Error
      console.error('[BillingCreditsServiceStripe] Failed to void credit grant:', error.message)
      throw new Error(`Failed to void credit grant: ${error.message}`)
    }
  }

  /**
   * Maps Stripe credit grant to domain CreditGrant
   */
  private mapStripeCreditGrantToCreditGrant(stripeCreditGrant: Stripe.Billing.CreditGrant): CreditGrant {
    return {
      id: stripeCreditGrant.id,
      customerId: stripeCreditGrant.customer,
      name: stripeCreditGrant.name,
      amount: {
        type: 'monetary',
        monetary: {
          value: stripeCreditGrant.amount.monetary?.value || 0,
          currency: stripeCreditGrant.amount.monetary?.currency || 'usd'
        }
      },
      category: stripeCreditGrant.category as 'paid' | 'promotional',
      applicability_config: {
        scope: {
          price_type: 'metered'
        }
      },
      effective_at: stripeCreditGrant.effective_at || undefined,
      expires_at: stripeCreditGrant.expires_at || undefined,
      metadata: stripeCreditGrant.metadata || undefined
    }
  }
}
