import Stripe from "stripe"
import type { BillingEngineerEventConverter } from './BillingEngineerEventConverter.ts'
import type { EngineerAccount, EngineerAccountEvent, BillingEngineerEvent, EngineerAccountVerificationStatus } from '@types'

/**
 * Stripe implementation of BillingEngineerEventConverter
 */
export class BillingEngineerEventConverterStripe implements BillingEngineerEventConverter {
  private stripe: Stripe
  private webhookSecret: string
  private cryptoProvider: Stripe.CryptoProvider

  constructor(
    stripe: Stripe,
    webhookSecret: string
  ) {
    this.stripe = stripe
    this.webhookSecret = webhookSecret
    this.cryptoProvider = Stripe.createSubtleCryptoProvider()
  }

  async convertEvent(body: string, signature: string): Promise<BillingEngineerEvent> {
    // Verify and construct the event
    let event: Stripe.Event

    try {
      event = await this.stripe.webhooks.constructEventAsync(
        body,
        signature,
        this.webhookSecret,
        undefined,
        this.cryptoProvider
      )
    } catch (err) {
      const error = err as Error
      console.error('[BillingEngineerEventConverterStripe] Webhook signature verification failed:', error.message)
      throw new Error(`Webhook signature verification failed: ${error.message}`)
    }

    console.info(`🔔 [BillingEngineerEventConverterStripe] Event received: ${event.id} (${event.type})`)

    // Handle different event types
    switch (event.type) {
      case 'account.updated': {
        const stripeAccount = event.data.object as Stripe.Account
        const account = this.mapStripeAccountToEngineerAccount(stripeAccount)
        const accountEvent: EngineerAccountEvent = {
          state: 'updated',
          account
        }
        console.info(`👷 [BillingEngineerEventConverterStripe] Account updated: ${account.id}`, accountEvent)
        return accountEvent
      }

      default:
        console.info(`ℹ️ [BillingEngineerEventConverterStripe] Unhandled event type: ${event.type}`)
        throw new Error(`Unhandled event type: ${event.type}`)
    }
  }

  private mapStripeAccountToEngineerAccount(stripeAccount: Stripe.Account): EngineerAccount {
    // Map Stripe account verification status to our EngineerAccountVerificationStatus
    const verificationStatus = this.mapStripeVerificationStatus(stripeAccount)

    // Get current deadline from requirements
    const currentDeadline = stripeAccount.requirements?.current_deadline
      ? new Date(stripeAccount.requirements.current_deadline * 1000)
      : null

    // Get disabled reason
    const disabledReason = stripeAccount.requirements?.disabled_reason || null

    return {
      id: stripeAccount.id,
      engineerId: stripeAccount.metadata?.profile_id || '',
      email: stripeAccount.email || '',
      detailsSubmitted: stripeAccount.details_submitted || false,
      chargesEnabled: stripeAccount.charges_enabled || false,
      payoutsEnabled: stripeAccount.payouts_enabled || false,
      verificationStatus,
      currentDeadline,
      disabledReason
    }
  }

  private mapStripeVerificationStatus(stripeAccount: Stripe.Account): EngineerAccountVerificationStatus {
    const requirements = stripeAccount.requirements

    // If account is disabled, return disabled status
    if (requirements?.disabled_reason) {
      return 'disabled'
    }

    // If there are past due requirements
    if (requirements?.past_due && requirements.past_due.length > 0) {
      return 'past_due'
    }

    // If there are currently due requirements
    if (requirements?.currently_due && requirements.currently_due.length > 0) {
      return 'currently_due'
    }

    // If there are eventually due requirements
    if (requirements?.eventually_due && requirements.eventually_due.length > 0) {
      return 'eventually_due'
    }

    // If pending verification (has pending verification fields)
    if (requirements?.pending_verification && requirements.pending_verification.length > 0) {
      return 'pending_verification'
    }

    // If everything is good, account is active
    return 'active'
  }
}
