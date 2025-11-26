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
        totalCredits
      }
    } catch (err) {
      const error = err as Error
      console.error('[BillingCreditsServiceStripe] Failed to fetch credit balance:', error.message)
      throw new Error(`Failed to fetch credit balance: ${error.message}`)
    }
  }

  /**
   * Fetches the current credit balance for a customer from paid invoices
   * Balance = Credits from paid invoices (last 365 days) - Meter events (last 365 days)
   */
  async fetchCreditBalanceFromInvoices(customerId: string): Promise<CreditBalance> {
    console.info(`[BillingCreditsServiceStripe] Fetching credit balance from invoices for customer: ${customerId}`)

    try {
      // Calculate 365 days ago
      const now = new Date()
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      const oneYearAgoTimestamp = Math.floor(oneYearAgo.getTime() / 1000)
      const nowTimestamp = Math.floor(now.getTime() / 1000)

      // Step 1: Fetch all paid invoices from the last 365 days
      console.info(`[BillingCreditsServiceStripe] Fetching paid invoices from last 365 days`)
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        status: 'paid',
        created: {
          gte: oneYearAgoTimestamp
        },
        limit: 100
      })

      console.info(`[BillingCreditsServiceStripe] Found ${invoices.data.length} paid invoices`)

      // Step 2: Calculate total credits from all invoices
      let totalCredits = 0

      for (const invoice of invoices.data) {
        for (const lineItem of invoice.lines.data) {
          // Skip line items without pricing details
          if (!lineItem.pricing || lineItem.pricing.type !== 'price_details' || !lineItem.pricing.price_details) {
            console.warn(`[BillingCreditsServiceStripe] Line item ${lineItem.id} has no pricing.price_details, skipping`)
            continue
          }

          // Get product ID from pricing.price_details.product
          const productId = lineItem.pricing.price_details.product

          if (!productId || typeof productId !== 'string') {
            console.warn(`[BillingCreditsServiceStripe] Line item ${lineItem.id} has no product ID, skipping`)
            continue
          }

          // Fetch product to get credit_price from metadata
          const product = await this.stripe.products.retrieve(productId)

          const creditPriceMetadata = product.metadata?.credit_price

          if (!creditPriceMetadata) {
            console.warn(`[BillingCreditsServiceStripe] Product ${productId} has no credit_price metadata, skipping`)
            continue
          }

          const creditPrice = parseInt(creditPriceMetadata, 10)
          if (creditPrice <= 0) {
            console.warn(`[BillingCreditsServiceStripe] Invalid credit_price ${creditPrice} for product ${productId}, skipping`)
            continue
          }

          // Calculate credits: amount_paid / credit_price
          const amountPaid = lineItem.amount || 0
          const creditsFromLineItem = Math.floor(amountPaid / creditPrice)

          console.info(`[BillingCreditsServiceStripe] Invoice ${invoice.id}, line item ${lineItem.id}: ${amountPaid} cents / ${creditPrice} = ${creditsFromLineItem} credits`)

          totalCredits += creditsFromLineItem
        }
      }

      console.info(`[BillingCreditsServiceStripe] Total credits from invoices: ${totalCredits}`)

      // Step 3: Get meter usage for the last 365 days
      const meters = await this.stripe.billing.meters.list({ limit: 100 })
      const meter = meters.data.find(m => m.event_name === this.meterEventName)

      if (!meter) {
        throw new Error(`Meter with event name "${this.meterEventName}" not found`)
      }

      const eventSummaries = await this.stripe.billing.meters.listEventSummaries(
        meter.id,
        {
          customer: customerId,
          start_time: oneYearAgoTimestamp,
          end_time: nowTimestamp
        }
      )

      // Sum up the aggregated values from all event summaries
      const usedCredits = eventSummaries.data.reduce((sum, summary) => {
        return sum + (summary.aggregated_value || 0)
      }, 0)

      console.info(`[BillingCreditsServiceStripe] Used credits from meter events: ${usedCredits}`)

      // Step 4: Calculate available balance
      const availableCredits = Math.max(0, totalCredits - usedCredits)

      console.info(`✅ [BillingCreditsServiceStripe] Credit balance from invoices: ${availableCredits} available (${totalCredits} total - ${usedCredits} used)`)

      return {
        availableCredits,
        usedCredits,
        totalCredits
      }
    } catch (err) {
      const error = err as Error
      console.error('[BillingCreditsServiceStripe] Failed to fetch credit balance from invoices:', error.message)
      throw new Error(`Failed to fetch credit balance from invoices: ${error.message}`)
    }
  }
}
