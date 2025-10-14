import Stripe from "stripe"
import type { BillingEventConverter } from './BillingEventConverter.ts'
import type { Customer, CustomerEvent, Subscription, SubscriptionEvent, Invoice, InvoiceEvent, CheckoutSession, CheckoutSessionEvent, BillingEvent } from '@types'

/**
 * Stripe implementation of BillingEventConverter
 */
export class BillingEventConverterStripe implements BillingEventConverter {
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

  async convertEvent(body: string, signature: string): Promise<BillingEvent> {
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
      console.error('[BillingEventConverterStripe] Webhook signature verification failed:', error.message)
      throw new Error(`Webhook signature verification failed: ${error.message}`)
    }

    console.info(`🔔 [BillingEventConverterStripe] Event received: ${event.id} (${event.type})`)

    // Handle different event types
    switch (event.type) {
      case 'customer.created': {
        const stripeCustomer = event.data.object as Stripe.Customer
        const customer = this.mapStripeCustomerToCustomer(stripeCustomer)
        const customerEvent: CustomerEvent = {
          state: 'created',
          customer
        }
        console.info(`👤 [BillingEventConverterStripe] Customer created: ${customer.id}`, customerEvent)
        return customerEvent
      }

      case 'customer.updated': {
        const stripeCustomer = event.data.object as Stripe.Customer
        const customer = this.mapStripeCustomerToCustomer(stripeCustomer)
        const customerEvent: CustomerEvent = {
          state: 'updated',
          customer
        }
        console.info(`👤 [BillingEventConverterStripe] Customer updated: ${customer.id}`, customerEvent)
        return customerEvent
      }

      case 'customer.deleted': {
        const stripeCustomer = event.data.object as Stripe.Customer
        const customer = this.mapStripeCustomerToCustomer(stripeCustomer)
        const customerEvent: CustomerEvent = {
          state: 'deleted',
          customer
        }
        console.info(`👤 [BillingEventConverterStripe] Customer deleted: ${customer.id}`, customerEvent)
        return customerEvent
      }

      case 'customer.subscription.created': {
        const stripeSubscription = event.data.object as Stripe.Subscription
        const subscription = await this.mapStripeSubscriptionToSubscription(stripeSubscription)
        const subscriptionEvent: SubscriptionEvent = {
          state: 'created',
          subscription
        }
        console.info(`📅 [BillingEventConverterStripe] Subscription created: ${subscription.id}`, subscriptionEvent)
        return subscriptionEvent
      }

      case 'customer.subscription.updated': {
        const stripeSubscription = event.data.object as Stripe.Subscription
        const subscription = await this.mapStripeSubscriptionToSubscription(stripeSubscription)
        const subscriptionEvent: SubscriptionEvent = {
          state: 'updated',
          subscription
        }
        console.info(`📅 [BillingEventConverterStripe] Subscription updated: ${subscription.id}`, subscriptionEvent)
        return subscriptionEvent
      }

      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object as Stripe.Subscription
        const subscription = await this.mapStripeSubscriptionToSubscription(stripeSubscription)
        const subscriptionEvent: SubscriptionEvent = {
          state: 'deleted',
          subscription
        }
        console.info(`📅 [BillingEventConverterStripe] Subscription deleted: ${subscription.id}`, subscriptionEvent)
        return subscriptionEvent
      }

      case 'invoice.payment_succeeded': {
        const stripeInvoice = event.data.object as Stripe.Invoice
        const invoice = this.mapStripeInvoiceToInvoice(stripeInvoice)
        const invoiceEvent: InvoiceEvent = {
          state: 'paid',
          invoice
        }
        console.info(`✅ [BillingEventConverterStripe] Payment succeeded: ${invoice.id}`, invoiceEvent)
        return invoiceEvent
      }

      case 'invoice.payment_failed': {
        const stripeInvoice = event.data.object as Stripe.Invoice
        const invoice = this.mapStripeInvoiceToInvoice(stripeInvoice)
        const invoiceEvent: InvoiceEvent = {
          state: 'failed',
          invoice
        }
        console.info(`❌ [BillingEventConverterStripe] Payment failed: ${invoice.id}`, invoiceEvent)
        return invoiceEvent
      }
      case 'checkout.session.completed': {
        const stripeCheckoutSession = event.data.object as Stripe.Checkout.Session
        const checkoutSession = this.mapStripeCheckoutSessionToCheckoutSession(stripeCheckoutSession)
        const checkoutSessionEvent: CheckoutSessionEvent = {
          checkoutSession
        }
        console.info(`🛒 [BillingEventConverterStripe] Checkout session completed: ${checkoutSession.id}`, checkoutSessionEvent)
        return checkoutSessionEvent
      }

      default:
        console.info(`ℹ️ [BillingEventConverterStripe] Unhandled event type: ${event.type}`)
        throw new Error(`Unhandled event type: ${event.type}`)
    }
  }

  private mapStripeCustomerToCustomer(stripeCustomer: Stripe.Customer): Customer {
    return {
      id: stripeCustomer.id,
      email: stripeCustomer.email,
      name: stripeCustomer.name,
    }
  }

  private async mapStripeSubscriptionToSubscription(stripeSubscription: Stripe.Subscription): Promise<Subscription> {
    // Get the first price from the subscription items
    const firstItem = stripeSubscription.items.data[0]
    if (!firstItem) {
      throw new Error(`Subscription ${stripeSubscription.id} has no items`)
    }

    const priceId = typeof firstItem.price === 'string' ? firstItem.price : firstItem.price.id

    // Fetch the price with its product expanded
    const price = await this.stripe.prices.retrieve(priceId, {
      expand: ['product']
    })

    const product = price.product as Stripe.Product
    const planName = product.name
    const planAmount = price.unit_amount || 0
    const creditPrice = parseInt(product.metadata.credit_price || '0', 10)

    // Get current_period_start and current_period_end from subscription
    const currentPeriodStart = firstItem.current_period_start
    const currentPeriodEnd = firstItem.current_period_end

    if (!currentPeriodEnd) {
      throw new Error(`Subscription ${stripeSubscription.id} has no current_period_end`)
    }

    return {
      id: stripeSubscription.id,
      customerId: typeof stripeSubscription.customer === 'string'
        ? stripeSubscription.customer
        : stripeSubscription.customer.id,
      status: stripeSubscription.status,
      planName,
      planAmount,
      creditPrice,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end || false,
      currentPeriod: {
        start: currentPeriodStart ? new Date(currentPeriodStart * 1000) : null,
        end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
      }
    }
  }

  private mapStripeInvoiceToInvoice(stripeInvoice: Stripe.Invoice): Invoice {
    // Extract subscription ID from the correct location
    let subscriptionId = ''

    if (!subscriptionId && stripeInvoice.parent) {
      const parent = stripeInvoice.parent as any
      if (parent.type === 'subscription_details' && parent.subscription_details?.subscription) {
        subscriptionId = parent.subscription_details.subscription
      }
    }

    // Get period from first line item
    const firstLineItem = stripeInvoice.lines?.data[0]
    if (!firstLineItem?.period) {
      throw new Error(`Invoice ${stripeInvoice.id} has no line items with period`)
    }

    return {
      id: stripeInvoice.id,
      customerId: typeof stripeInvoice.customer === 'string'
        ? stripeInvoice.customer
        : stripeInvoice.customer?.id || '',
      subscriptionId,
      status: stripeInvoice.status || 'draft',
      amount: stripeInvoice.amount_due,
      periodStart: new Date(firstLineItem.period.start * 1000),
      periodEnd: new Date(firstLineItem.period.end * 1000)
    }
  }

  private mapStripeCheckoutSessionToCheckoutSession(stripeCheckoutSession: Stripe.Checkout.Session): CheckoutSession {
    return {
      id: stripeCheckoutSession.id,
      customerId: typeof stripeCheckoutSession.customer === 'string'
        ? stripeCheckoutSession.customer
        : stripeCheckoutSession.customer || ''
    }
  }
}