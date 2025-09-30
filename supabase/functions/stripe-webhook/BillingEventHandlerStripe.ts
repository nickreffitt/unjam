import Stripe from "stripe"
import type { BillingEventHandler } from './BillingEventHandler.ts'
import type { Customer, CustomerEvent, Subscription, SubscriptionEvent, Invoice, InvoiceEvent, BillingEvent } from './types.ts'

/**
 * Stripe implementation of BillingEventHandler
 */
export class BillingEventHandlerStripe implements BillingEventHandler {
  private stripe: Stripe
  private webhookSecret: string
  private cryptoProvider: Stripe.CryptoProvider

  constructor(
    apiKey: string,
    webhookSecret: string
  ) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-08-27.basil'
    })
    this.webhookSecret = webhookSecret
    this.cryptoProvider = Stripe.createSubtleCryptoProvider()
  }

  async handleEvent(body: string, signature: string): Promise<BillingEvent> {
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
      console.error('[BillingEventHandlerStripe] Webhook signature verification failed:', error.message)
      throw new Error(`Webhook signature verification failed: ${error.message}`)
    }

    console.info(`🔔 [BillingEventHandlerStripe] Event received: ${event.id} (${event.type})`)

    // Handle different event types
    switch (event.type) {
      case 'customer.created': {
        const stripeCustomer = event.data.object as Stripe.Customer
        const customer = this.mapStripeCustomerToCustomer(stripeCustomer)
        const customerEvent: CustomerEvent = {
          state: 'created',
          customer
        }
        console.info(`👤 [BillingEventHandlerStripe] Customer created: ${customer.id}`, customerEvent)
        return customerEvent
      }

      case 'customer.updated': {
        const stripeCustomer = event.data.object as Stripe.Customer
        const customer = this.mapStripeCustomerToCustomer(stripeCustomer)
        const customerEvent: CustomerEvent = {
          state: 'updated',
          customer
        }
        console.info(`👤 [BillingEventHandlerStripe] Customer updated: ${customer.id}`, customerEvent)
        return customerEvent
      }

      case 'customer.deleted': {
        const stripeCustomer = event.data.object as Stripe.Customer
        const customer = this.mapStripeCustomerToCustomer(stripeCustomer)
        const customerEvent: CustomerEvent = {
          state: 'deleted',
          customer
        }
        console.info(`👤 [BillingEventHandlerStripe] Customer deleted: ${customer.id}`, customerEvent)
        return customerEvent
      }

      case 'customer.subscription.created': {
        const stripeSubscription = event.data.object as Stripe.Subscription
        const subscription = await this.mapStripeSubscriptionToSubscription(stripeSubscription)
        const subscriptionEvent: SubscriptionEvent = {
          state: 'created',
          subscription
        }
        console.info(`📅 [BillingEventHandlerStripe] Subscription created: ${subscription.id}`, subscriptionEvent)
        return subscriptionEvent
      }

      case 'customer.subscription.updated': {
        const stripeSubscription = event.data.object as Stripe.Subscription
        const subscription = await this.mapStripeSubscriptionToSubscription(stripeSubscription)
        const subscriptionEvent: SubscriptionEvent = {
          state: 'updated',
          subscription
        }
        console.info(`📅 [BillingEventHandlerStripe] Subscription updated: ${subscription.id}`, subscriptionEvent)
        return subscriptionEvent
      }

      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object as Stripe.Subscription
        const subscription = await this.mapStripeSubscriptionToSubscription(stripeSubscription)
        const subscriptionEvent: SubscriptionEvent = {
          state: 'deleted',
          subscription
        }
        console.info(`📅 [BillingEventHandlerStripe] Subscription deleted: ${subscription.id}`, subscriptionEvent)
        return subscriptionEvent
      }

      case 'invoice.payment_succeeded': {
        const stripeInvoice = event.data.object as Stripe.Invoice
        const invoice = this.mapStripeInvoiceToInvoice(stripeInvoice)
        const invoiceEvent: InvoiceEvent = {
          state: 'paid',
          invoice
        }
        console.info(`✅ [BillingEventHandlerStripe] Payment succeeded: ${invoice.id}`, invoiceEvent)
        return invoiceEvent
      }

      case 'invoice.payment_failed': {
        const stripeInvoice = event.data.object as Stripe.Invoice
        const invoice = this.mapStripeInvoiceToInvoice(stripeInvoice)
        const invoiceEvent: InvoiceEvent = {
          state: 'failed',
          invoice
        }
        console.info(`❌ [BillingEventHandlerStripe] Payment failed: ${invoice.id}`, invoiceEvent)
        return invoiceEvent
      }

      default:
        console.info(`ℹ️ [BillingEventHandlerStripe] Unhandled event type: ${event.type}`)
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
    const creditPrice = parseInt(product.metadata.credit_price || '0', 10)

    return {
      id: stripeSubscription.id,
      customerId: typeof stripeSubscription.customer === 'string'
        ? stripeSubscription.customer
        : stripeSubscription.customer.id,
      status: stripeSubscription.status,
      planName,
      creditPrice
    }
  }

  private mapStripeInvoiceToInvoice(stripeInvoice: Stripe.Invoice): Invoice {
    return {
      id: stripeInvoice.id,
      customerId: typeof stripeInvoice.customer === 'string'
        ? stripeInvoice.customer
        : stripeInvoice.customer?.id || '',
      subscriptionId: typeof stripeInvoice.subscription === 'string'
        ? stripeInvoice.subscription
        : stripeInvoice.subscription?.id || '',
      status: stripeInvoice.status || 'draft',
      amount: stripeInvoice.amount_due
    }
  }
}