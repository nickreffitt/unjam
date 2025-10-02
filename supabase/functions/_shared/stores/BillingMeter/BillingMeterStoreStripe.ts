import Stripe from 'stripe'
import type { BillingMeterStore, RecordTicketCompletionParams } from './BillingMeterStore.ts'

/**
 * Stripe implementation of BillingMeterStore using Stripe Meter Events API
 * Records usage events that will be aggregated and billed against credit grants
 */
export class BillingMeterStoreStripe implements BillingMeterStore {
  private stripe: Stripe
  private meterEventName: string

  /**
   * @param apiKey - Stripe API key
   * @param meterEventName - The event name configured in your Stripe Meter (e.g., 'ticket_completed')
   */
  constructor(apiKey: string, meterEventName: string = 'ticket_completed') {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-08-27.basil'
    })
    this.meterEventName = meterEventName
  }

  /**
   * Records a ticket completion event that consumes customer credits
   * Sends a meter event to Stripe which will be aggregated at the end of the billing period
   * Credit grants will automatically apply to reduce the invoice amount
   */
  async recordTicketCompletion(params: RecordTicketCompletionParams): Promise<void> {
    const value = params.value || 1

    console.info(`[BillingMeterStoreStripe] Recording ticket completion for customer: ${params.customerId}, ticket: ${params.ticketId}, value: ${value}`)

    try {
      // Create a meter event in Stripe
      const meterEvent = await this.stripe.billing.meterEvents.create({
        event_name: this.meterEventName,
        payload: {
          stripe_customer_id: params.customerId,
          value: value.toString() // Stripe requires string value
        },
        // Optional: include timestamp if provided (must be within past 35 days, not more than 5 min future)
        ...(params.timestamp && {
          timestamp: Math.floor(params.timestamp.getTime() / 1000)
        })
      })

      console.info(`✅ [BillingMeterStoreStripe] Meter event created: ${meterEvent.identifier}, customer: ${params.customerId}`)
    } catch (err) {
      const error = err as Error
      console.error('[BillingMeterStoreStripe] Failed to record meter event:', error.message)
      throw new Error(`Failed to record ticket completion: ${error.message}`)
    }
  }
}
