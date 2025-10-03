import type { BillingEventConverter } from '@events/BillingEventConverter.ts'
import type { BillingCustomerStore } from '@stores/BillingCustomer/index.ts'
import type { BillingSubscriptionStore } from '@stores/BillingSubscription/index.ts'
import type { BillingSubscriptionService } from '@services/BillingSubscription/index.ts'
import type { BillingInvoiceStore } from '@stores/BillingInvoice/index.ts'
import type { CustomerEvent, SubscriptionEvent, InvoiceEvent, CheckoutSessionEvent } from '@types'

/**
 * BillingEventHandler orchestrates the conversion and persistence of billing events
 * Uses dependency injection for converter and stores
 */
export class BillingEventHandler {
  private readonly converter: BillingEventConverter
  private readonly customerStore: BillingCustomerStore
  private readonly subscriptionStore: BillingSubscriptionStore
  private readonly subscriptionService: BillingSubscriptionService
  private readonly invoiceStore: BillingInvoiceStore

  constructor(
    converter: BillingEventConverter,
    customerStore: BillingCustomerStore,
    subscriptionStore: BillingSubscriptionStore,
    subscriptionService: BillingSubscriptionService,
    invoiceStore: BillingInvoiceStore
  ) {
    this.converter = converter
    this.customerStore = customerStore
    this.subscriptionStore = subscriptionStore
    this.subscriptionService = subscriptionService
    this.invoiceStore = invoiceStore
  }

  /**
   * Handles a billing event by converting and persisting it
   * @param body - The raw request body as a string
   * @param signature - The signature header for verification
   * @returns Promise that resolves on success or rejects with error
   */
  async handleEvent(body: string, signature: string): Promise<void> {
    console.info('[BillingEventHandler] Handling billing event')

    // Convert the event using the converter
    const billingEvent = await this.converter.convertEvent(body, signature)

    // Persist the event to the appropriate store based on event type
    if ('customer' in billingEvent) {
      await this.handleCustomerEvent(billingEvent as CustomerEvent)
    } else if ('subscription' in billingEvent) {
      await this.handleSubscriptionEvent(billingEvent as SubscriptionEvent)
    } else if ('invoice' in billingEvent) {
      await this.handleInvoiceEvent(billingEvent as InvoiceEvent)
    } else if ('checkoutSession' in billingEvent) {
      await this.handleCheckoutSessionEvent(billingEvent as CheckoutSessionEvent)
    } else {
      throw new Error('Unknown billing event type')
    }

    console.info('[BillingEventHandler] Successfully handled billing event')
  }

  /**
   * Handles customer events (created, updated, deleted)
   */
  private async handleCustomerEvent(event: CustomerEvent): Promise<void> {
    console.info(`[BillingEventHandler] Handling customer event: ${event.state}`)

    switch (event.state) {
      case 'created':
        await this.customerStore.create(event.customer)
        break
      case 'updated':
        await this.customerStore.update(event.customer)
        break
      case 'deleted':
        await this.customerStore.delete(event.customer.id)
        break
      default:
        throw new Error(`Unknown customer event state: ${event.state}`)
    }
  }

  /**
   * Handles subscription events (created, updated, deleted)
   */
  private async handleSubscriptionEvent(event: SubscriptionEvent): Promise<void> {
    console.info(`[BillingEventHandler] Handling subscription event: ${event.state}`)

    switch (event.state) {
      case 'created': {
        await this.subscriptionStore.create(event.subscription)
        // No credit handling - credits granted when invoice paid
        break
      }
      case 'updated': {
        // Fetch the old subscription to detect plan changes
        const oldSubscription = await this.subscriptionStore.fetch(event.subscription.id)

        // Update database with new subscription data
        await this.subscriptionStore.update(event.subscription)

        // Detect upgrade: plan changed AND credit price increased
        if (oldSubscription && this.subscriptionService.isUpgrade(oldSubscription, event.subscription)) {
          await this.subscriptionService.voidExistingCreditGrants(event.subscription.customerId)
        }
        // Downgrades and cancellations don't require immediate action
        // Credits will naturally expire at period end
        break
      }
      case 'deleted': {
        await this.subscriptionStore.delete(event.subscription.id)
        // Subscription ended - credits should already be expired or voided
        break
      }
      default:
        throw new Error(`Unknown subscription event state: ${event.state}`)
    }
  }


  /**
   * Handles invoice events (paid, failed)
   */
  private async handleInvoiceEvent(event: InvoiceEvent): Promise<void> {
    console.info(`[BillingEventHandler] Handling invoice event: ${event.state}`)

    // Check if invoice already exists
    const existingInvoice = await this.invoiceStore.fetch(event.invoice.id)

    switch (event.state) {
      case 'paid':
        // Save/update the invoice
        if (existingInvoice) {
          await this.invoiceStore.update(event.invoice)
        } else {
          await this.invoiceStore.create(event.invoice)
        }

        // Create credit grant for paid invoice
        await this.subscriptionService.createCreditGrantForInvoice(event.invoice)
        break
      case 'failed':
        if (existingInvoice) {
          await this.invoiceStore.update(event.invoice)
        } else {
          await this.invoiceStore.create(event.invoice)
        }
        break
      default:
        throw new Error(`Unknown invoice event state: ${event.state}`)
    }
  }


  /**
   * Handles checkout session events
   */
  private async handleCheckoutSessionEvent(event: CheckoutSessionEvent): Promise<void> {
    console.info(`[BillingEventHandler] Handling checkout session event for session: ${event.checkoutSession.id}`)
    // Checkout sessions don't require persistence - they trigger subscription creation
    // We can add logging or additional handling here if needed
    console.info(`[BillingEventHandler] Checkout session completed for customer: ${event.checkoutSession.customerId}`)
  }
}
