import type { BillingEventHandler } from './BillingEventHandler.ts'
import type { Customer, CustomerEvent, Subscription, SubscriptionEvent, Invoice, InvoiceEvent, BillingEvent } from './types.ts'

/**
 * Local implementation of BillingEventHandler for testing
 * Parses the body as JSON and returns the appropriate BillingEvent
 */
export class BillingEventHandlerLocal implements BillingEventHandler {
  async handleEvent(body: string, _signature: string): Promise<BillingEvent> {
    let event: any

    try {
      event = JSON.parse(body)
    } catch (err) {
      const error = err as Error
      console.error('[BillingEventHandlerLocal] Failed to parse body:', error.message)
      throw new Error(`Failed to parse body: ${error.message}`)
    }

    console.info(`🔔 [BillingEventHandlerLocal] Event received: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'customer.created': {
        const customer: Customer = {
          id: event.data.id,
          email: event.data.email,
          name: event.data.name
        }
        const customerEvent: CustomerEvent = {
          state: 'created',
          customer
        }
        console.info(`👤 [BillingEventHandlerLocal] Customer created: ${customer.id}`, customerEvent)
        return customerEvent
      }

      case 'customer.updated': {
        const customer: Customer = {
          id: event.data.id,
          email: event.data.email,
          name: event.data.name
        }
        const customerEvent: CustomerEvent = {
          state: 'updated',
          customer
        }
        console.info(`👤 [BillingEventHandlerLocal] Customer updated: ${customer.id}`, customerEvent)
        return customerEvent
      }

      case 'customer.deleted': {
        const customer: Customer = {
          id: event.data.id,
          email: event.data.email,
          name: event.data.name
        }
        const customerEvent: CustomerEvent = {
          state: 'deleted',
          customer
        }
        console.info(`👤 [BillingEventHandlerLocal] Customer deleted: ${customer.id}`, customerEvent)
        return customerEvent
      }

      case 'subscription.created': {
        const subscription: Subscription = {
          id: event.data.id,
          customerId: event.data.customerId,
          status: event.data.status,
          planName: event.data.planName,
          creditPrice: event.data.creditPrice
        }
        const subscriptionEvent: SubscriptionEvent = {
          state: 'created',
          subscription
        }
        console.info(`📅 [BillingEventHandlerLocal] Subscription created: ${subscription.id}`, subscriptionEvent)
        return subscriptionEvent
      }

      case 'subscription.updated': {
        const subscription: Subscription = {
          id: event.data.id,
          customerId: event.data.customerId,
          status: event.data.status,
          planName: event.data.planName,
          creditPrice: event.data.creditPrice
        }
        const subscriptionEvent: SubscriptionEvent = {
          state: 'updated',
          subscription
        }
        console.info(`📅 [BillingEventHandlerLocal] Subscription updated: ${subscription.id}`, subscriptionEvent)
        return subscriptionEvent
      }

      case 'subscription.deleted': {
        const subscription: Subscription = {
          id: event.data.id,
          customerId: event.data.customerId,
          status: event.data.status,
          planName: event.data.planName,
          creditPrice: event.data.creditPrice
        }
        const subscriptionEvent: SubscriptionEvent = {
          state: 'deleted',
          subscription
        }
        console.info(`📅 [BillingEventHandlerLocal] Subscription deleted: ${subscription.id}`, subscriptionEvent)
        return subscriptionEvent
      }

      case 'invoice.paid': {
        const invoice: Invoice = {
          id: event.data.id,
          customerId: event.data.customerId,
          subscriptionId: event.data.subscriptionId,
          status: event.data.status,
          amount: event.data.amount
        }
        const invoiceEvent: InvoiceEvent = {
          state: 'paid',
          invoice
        }
        console.info(`✅ [BillingEventHandlerLocal] Invoice paid: ${invoice.id}`, invoiceEvent)
        return invoiceEvent
      }

      case 'invoice.failed': {
        const invoice: Invoice = {
          id: event.data.id,
          customerId: event.data.customerId,
          subscriptionId: event.data.subscriptionId,
          status: event.data.status,
          amount: event.data.amount
        }
        const invoiceEvent: InvoiceEvent = {
          state: 'failed',
          invoice
        }
        console.info(`❌ [BillingEventHandlerLocal] Invoice failed: ${invoice.id}`, invoiceEvent)
        return invoiceEvent
      }

      default:
        console.info(`ℹ️ [BillingEventHandlerLocal] Unhandled event type: ${event.type}`)
        throw new Error(`Unhandled event type: ${event.type}`)
    }
  }
}