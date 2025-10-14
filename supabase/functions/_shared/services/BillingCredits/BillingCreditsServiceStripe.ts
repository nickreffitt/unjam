import type Stripe from 'stripe'
import type { BillingCreditsService, CreditBalance } from './BillingCreditsService.ts'
import type { Subscription } from '@types'

/**
 * Stripe implementation of BillingCreditsService using Stripe Meters
 * Calculates credit balance from subscription allocation minus meter usage
 */
export class BillingCreditsServiceStripe implements BillingCreditsService {
  private stripe: Stripe
  private meterEventName: string

  constructor(stripe: Stripe, meterEventName: string = 'ticket_completed') {
    this.stripe = stripe
    this.meterEventName = meterEventName
  }

  /**
   * Fetches the current credit balance for a customer
   * Balance = Subscription allocated credits - Meter events in current billing period
   */
  async fetchCreditBalance(subscription: Subscription, customerId: string): Promise<CreditBalance> {
    console.info(`[BillingCreditsServiceStripe] Fetching credit balance for customer: ${customerId}`)

    try {
      // Get the meter to query usage
      const meters = await this.stripe.billing.meters.list({ limit: 100 })
      const meter = meters.data.find(m => m.event_name === this.meterEventName)

      if (!meter) {
        throw new Error(`Meter with event name "${this.meterEventName}" not found`)
      }
      if (!subscription.currentPeriod.start || 
        !subscription.currentPeriod.end
      ) {
        throw new Error('Subscription current period is not set')
      }

      // Get meter event summaries for current billing period
      const currentPeriodStart = Math.ceil(subscription.currentPeriod.start.getTime() / 1000)
      const currentPeriodEnd = Math.ceil(subscription.currentPeriod.end.getTime() / 1000)

      const eventSummaries = await this.stripe.billing.meters.listEventSummaries(
        meter.id,
        {
          customer: customerId,
          start_time: currentPeriodStart,
          end_time: currentPeriodEnd
        }
      )

      // Sum up the aggregated values from all event summaries
      const usedCredits = eventSummaries.data.reduce((sum, summary) => {
        return sum + (summary.aggregated_value || 0)
      }, 0)

      // Calculate total credits from subscription (invoice amount / credit price)
      const creditPrice = subscription.creditPrice

      // Get subscription item to find the recurring price amount
      const recurringAmount = subscription.planAmount

      const totalCredits = creditPrice > 0 ? Math.floor(recurringAmount / creditPrice) : 0
      const availableCredits = Math.max(0, totalCredits - usedCredits)

      console.info(`✅ [BillingCreditsServiceStripe] Credit balance: ${availableCredits} available (${totalCredits} total - ${usedCredits} used)`)

      return {
        availableCredits,
        usedCredits,
        totalCredits,
        creditPrice
      }
    } catch (err) {
      const error = err as Error
      console.error('[BillingCreditsServiceStripe] Failed to fetch credit balance:', error.message)
      throw new Error(`Failed to fetch credit balance: ${error.message}`)
    }
  }
}
