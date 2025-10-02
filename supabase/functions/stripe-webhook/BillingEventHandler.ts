import type { BillingEventConverter } from './BillingEventConverter.ts'
import type { BillingCustomerStore } from './store/BillingCustomer/BillingCustomerStore.ts'
import type { BillingSubscriptionStore } from './store//BillingSubscription/BillingSubscriptionStore.ts'
import type { BillingSubscriptionService } from './service/BillingSubscriptionService.ts'
import type { BillingInvoiceStore } from './store/BillingInvoice/BillingInvoiceStore.ts'
import type { BillingCreditsStore } from './store/BillingCredits/BillingCreditsStore.ts'
import type { CustomerEvent, SubscriptionEvent, InvoiceEvent, CheckoutSessionEvent, Invoice, Subscription } from '@types'

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
  private readonly creditsStore: BillingCreditsStore

  constructor(
    converter: BillingEventConverter,
    customerStore: BillingCustomerStore,
    subscriptionStore: BillingSubscriptionStore,
    subscriptionService: BillingSubscriptionService,
    invoiceStore: BillingInvoiceStore,
    creditsStore: BillingCreditsStore
  ) {
    this.converter = converter
    this.customerStore = customerStore
    this.subscriptionStore = subscriptionStore
    this.subscriptionService = subscriptionService
    this.invoiceStore = invoiceStore
    this.creditsStore = creditsStore
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
      case 'created':
        await this.subscriptionStore.create(event.subscription)
        // No credit handling - credits granted when invoice paid
        break
      case 'updated':
        // Fetch the old subscription to detect plan changes
        const oldSubscription = await this.subscriptionStore.fetch(event.subscription.id)

        // Update database with new subscription data
        await this.subscriptionStore.update(event.subscription)

        // Detect upgrade: plan changed AND credit price increased
        if (oldSubscription && this.isUpgrade(oldSubscription, event.subscription)) {
          await this.handleUpgrade(event.subscription.customerId)
        }
        // Downgrades and cancellations don't require immediate action
        // Credits will naturally expire at period end
        break
      case 'deleted':
        await this.subscriptionStore.delete(event.subscription.id)
        // Subscription ended - credits should already be expired or voided
        break
      default:
        throw new Error(`Unknown subscription event state: ${event.state}`)
    }
  }

  /**
   * Determines if a subscription change is an upgrade
   * Upgrade = immediate plan change with higher credit price
   */
  private isUpgrade(oldSub: Subscription, newSub: Subscription): boolean {
    // Plan changed AND credit price increased
    return oldSub.planName !== newSub.planName &&
           newSub.creditPrice > oldSub.creditPrice
  }

  /**
   * Handles immediate upgrade:
   * 1. Void existing credits from old plan
   * 2. Wait for prorated invoice to grant new credits
   */
  private async handleUpgrade(customerId: string): Promise<void> {
    console.info(`[BillingEventHandler] Processing upgrade for customer: ${customerId}`)

    // Void all existing credits from the old plan
    // New credits will be granted when the prorated invoice is paid
    await this.voidExistingCreditGrants(customerId)

    console.info(`[BillingEventHandler] Voided credits for upgrade. New credits will be granted when prorated invoice is paid.`)
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
        await this.createCreditGrantForInvoice(event.invoice)
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
   * Creates a credit grant for a paid invoice
   * Calculates credits based on invoice amount and subscription credit price
   *
   * Key behaviors:
   * - Voids all existing credit grants for the customer (no rollover)
   * - Sets expiration to subscription's current_period_end (credits expire at cycle end)
   * - No overage charges - credits are replenished each billing cycle
   */
  private async createCreditGrantForInvoice(invoice: Invoice): Promise<void> {
    console.info(`[BillingEventHandler] Creating credit grant for invoice: ${invoice.id}`)

    // Fetch subscription directly from Stripe to avoid race conditions
    const subscription = await this.subscriptionService.fetch(invoice.subscriptionId)
    if (!subscription) {
      console.warn(`[BillingEventHandler] Subscription ${invoice.subscriptionId} not found in Stripe, skipping credit grant creation`)
      return
    }

    // Calculate number of credits based on invoice amount and credit price
    // invoice.amount is in cents, creditPrice is in cents per credit
    const numberOfCredits = subscription.creditPrice > 0
      ? Math.floor(invoice.amount / subscription.creditPrice)
      : 0

    if (numberOfCredits <= 0) {
      console.warn(`[BillingEventHandler] No credits to grant for invoice ${invoice.id} (amount: ${invoice.amount}, creditPrice: ${subscription.creditPrice})`)
      return
    }

    // Void all existing credit grants for this customer (no rollover policy)
    await this.voidExistingCreditGrants(invoice.customerId)

    // Use subscription's current_period_end for credit expiration
    const expiresAt = Math.floor(invoice.periodEnd.getTime() / 1000)
    console.info(`[BillingEventHandler] Credit grant will expire at: ${new Date(expiresAt * 1000).toISOString()}`)

    // Create credit grant with expiration set to end of billing period
    await this.creditsStore.create({
      customerId: invoice.customerId,
      name: `Credits for ${subscription.planName} - Invoice ${invoice.id}`,
      amount: {
        type: 'monetary',
        monetary: {
          value: invoice.amount,
          currency: 'usd'
        }
      },
      category: 'paid',
      applicability_config: {
        scope: {
          price_type: 'metered'
        }
      },
      expires_at: expiresAt, // Credits expire at end of billing period (no rollover)
      metadata: {
        invoice_id: invoice.id,
        subscription_id: invoice.subscriptionId,
        credits_count: numberOfCredits.toString()
      }
    })

    console.info(`[BillingEventHandler] Created credit grant for ${numberOfCredits} credits (${invoice.amount} cents at ${subscription.creditPrice} cents per credit)`)
  }

  /**
   * Voids all existing credit grants for a customer
   * This implements the no-rollover policy where credits don't carry over between billing cycles
   */
  private async voidExistingCreditGrants(customerId: string): Promise<void> {
    console.info(`[BillingEventHandler] Voiding existing credit grants for customer: ${customerId}`)

    try {
      const existingGrants = await this.creditsStore.listByCustomer(customerId)

      for (const grant of existingGrants) {
        try {
          await this.creditsStore.void(grant.id)
          console.info(`[BillingEventHandler] Voided credit grant: ${grant.id}`)
        } catch (err) {
          const error = err as Error
          console.warn(`[BillingEventHandler] Failed to void credit grant ${grant.id}: ${error.message}`)
        }
      }

      console.info(`[BillingEventHandler] Voided ${existingGrants.length} existing credit grants`)
    } catch (err) {
      const error = err as Error
      console.error(`[BillingEventHandler] Failed to list/void existing credit grants: ${error.message}`)
      // Don't throw - we still want to create the new grant even if voiding old ones fails
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
