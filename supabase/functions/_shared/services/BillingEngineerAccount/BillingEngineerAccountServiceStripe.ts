import type Stripe from 'stripe'
import type { EngineerAccount, EngineerAccountVerificationStatus } from '@types.ts'
import type { BillingEngineerAccountService } from './BillingEngineerAccountService.ts'

/**
 * Stripe implementation of BillingEngineerAccountService
 * Manages Stripe Express Connect accounts for engineers
 */
export class BillingEngineerAccountServiceStripe implements BillingEngineerAccountService {
  private stripe: Stripe

  constructor(stripe: Stripe) {
    this.stripe = stripe
  }

  /**
   * Determines verification status based on Stripe account requirements
   * Priority order (most severe first): disabled -> past_due -> currently_due -> pending_verification -> eventually_due -> active
   */
  private determineVerificationStatus(account: Stripe.Account): EngineerAccountVerificationStatus {
    const req = account.requirements

    if (account.requirements?.disabled_reason) return 'disabled'
    if (req?.past_due && req.past_due.length > 0) return 'past_due'
    if (req?.currently_due && req.currently_due.length > 0) return 'currently_due'
    if (req?.pending_verification && req.pending_verification.length > 0) return 'pending_verification'
    if (req?.eventually_due && req.eventually_due.length > 0) return 'eventually_due'

    return 'active'
  }

  /**
   * Fetches an existing Stripe Connect account
   */
  async fetch(accountId: string): Promise<EngineerAccount> {
    console.info(`[BillingEngineerAccountServiceStripe] Fetching account: ${accountId}`)
    try {
      const account = await this.stripe.accounts.retrieve(accountId)

      return {
        id: account.id,
        engineerId: account.metadata.engineerId || '',
        email: account.email || '',
        detailsSubmitted: account.details_submitted || false,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        verificationStatus: this.determineVerificationStatus(account),
        currentDeadline: account.requirements?.current_deadline
          ? new Date(account.requirements.current_deadline * 1000)
          : null,
        disabledReason: account.requirements?.disabled_reason || null,
      }
    } catch (err) {
      const error = err as Error
      console.error(`[BillingEngineerAccountServiceStripe] Failed to fetch account: ${error.message}`)
      throw new Error(`Failed to fetch engineer account: ${error.message}`)
    }
  }

  /**
   * Creates a new Stripe Express Connect account
   */
  async create(engineerId: string, email: string): Promise<EngineerAccount> {
    console.info(`[BillingEngineerAccountServiceStripe] Creating account for engineer: ${engineerId}`)
    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        email,
        metadata: {
          engineerId,
        },
        capabilities: {
          transfers: { requested: true },
        },
      })

      console.info(`[BillingEngineerAccountServiceStripe] Successfully created account: ${account.id}`)
      return {
        id: account.id,
        engineerId,
        email: account.email || email,
        detailsSubmitted: account.details_submitted || false,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        verificationStatus: this.determineVerificationStatus(account),
        currentDeadline: account.requirements?.current_deadline
          ? new Date(account.requirements.current_deadline * 1000)
          : null,
        disabledReason: account.requirements?.disabled_reason || null,
      }
    } catch (err) {
      const error = err as Error
      console.error(`[BillingEngineerAccountServiceStripe] Failed to create account: ${error.message}`)
      throw new Error(`Failed to create engineer account: ${error.message}`)
    }
  }
}
