import type { BillingCreditsService } from '@services/BillingCredits/index.ts'
import type { BillingSubscriptionService } from '@services/BillingSubscription/index.ts'
import type { BillingCustomerService } from '@services/BillingCustomer/index.ts'
import type { BillingProductService } from '@services/BillingProduct/index.ts'
import type { BillingLinksService } from '@services/BillingLinks/index.ts'
import { type BillingCustomerStore } from "@stores/BillingCustomer/index.ts";
import { type ProfileStore } from "@stores/Profile/index.ts";
import { type TicketStore, type TicketBillingInfo } from "@stores/Ticket/index.ts";
import type { CheckoutSessionRequest, CheckoutSessionResponse, CreditBalanceRequest, CreditBalanceResponse, CustomerSessionRequest, CustomerSessionResponse, ProductsRequest, ProductsResponse } from '@types';

export class BillingCreditsHandler {
  private readonly customerStore: BillingCustomerStore
  private readonly profileStore: ProfileStore
  private readonly subscriptionService: BillingSubscriptionService
  private readonly creditsService: BillingCreditsService
  private readonly customerService: BillingCustomerService
  private readonly productService: BillingProductService
  private readonly linksService: BillingLinksService
  private readonly ticketStore: TicketStore

  constructor(
    customerStore: BillingCustomerStore,
    profileStore: ProfileStore,
    subscriptionService: BillingSubscriptionService,
    creditsService: BillingCreditsService,
    customerService: BillingCustomerService,
    productService: BillingProductService,
    linksService: BillingLinksService,
    ticketStore: TicketStore
  ) {
    this.customerStore = customerStore
    this.profileStore = profileStore
    this.subscriptionService = subscriptionService
    this.creditsService = creditsService
    this.customerService = customerService
    this.productService = productService
    this.linksService = linksService
    this.ticketStore = ticketStore
  }

  async fetchCreditBalance(request: CreditBalanceRequest): Promise<CreditBalanceResponse> {
    const { profile_id } = request

    console.info(`[BillingCreditsHandler] Fetching credit balance for profile: ${profile_id}`)

    // 1. Fetch billing customer ID
    const customerId = await this.customerStore.getByProfileId(profile_id)

    if (!customerId) {
      console.info(`[BillingCreditsHandler] No billing customer found for profile: ${profile_id} - returning zero balance (user hasn't purchased credits yet)`)

      // Return zero balance for new users who haven't purchased credits yet
      return {
        creditBalance: 0,
        pendingCredits: 0
      }
    }

    // 2. Fetch credit balance from invoices (invoice credits - meter usage)
    console.info(`[BillingCreditsHandler] Fetching balance from invoices for customer: ${customerId}`)
    const creditBalanceData = await this.creditsService.fetchCreditBalanceFromInvoices(customerId)

    console.info(`✅ [BillingCreditsHandler] Credit balance fetched: ${creditBalanceData.availableCredits} available (${creditBalanceData.totalCredits} total - ${creditBalanceData.usedCredits} used)`)

    // 3. Calculate pending credits from tickets in processing states
    const pendingCredits = await this.calculatePendingCredits(profile_id)

    console.info(`✅ [BillingCreditsHandler] Pending credits calculated: ${pendingCredits}`)

    return {
      creditBalance: creditBalanceData.availableCredits,
      pendingCredits
    }
  }

  /**
   * Creates a Stripe Customer Session for use with the pricing table
   * If the profile doesn't have a Stripe customer, creates one first
   * @param request - Contains the profile_id
   * @returns CustomerSessionResponse with client_secret
   */
  async createCustomerSession(request: CustomerSessionRequest): Promise<CustomerSessionResponse> {
    const { profile_id } = request

    console.info(`[BillingCreditsHandler] Creating customer session for profile: ${profile_id}`)

    // 1. Check if Stripe Customer exists for this profile
    let customerId = await this.customerStore.getByProfileId(profile_id)

    // 2. If no customer exists, create one
    if (!customerId) {
      console.info(`[BillingCreditsHandler] No Stripe customer found, creating new customer for profile: ${profile_id}`)

      // Fetch profile email via ProfileStore
      const email = await this.profileStore.getEmailByProfileId(profile_id)

      if (!email) {
        console.error(`[BillingCreditsHandler] Profile not found or missing email for profile: ${profile_id}`)
        throw new Error('Profile not found or missing email')
      }

      // Create Stripe customer
      const customer = await this.customerService.createCustomer(profile_id, email)

      customerId = customer.id
      console.info(`[BillingCreditsHandler] Created new Stripe customer: ${customerId}`)
    }

    // 3. Create Customer Session via service
    console.info(`[BillingCreditsHandler] Creating customer session for Stripe customer: ${customerId}`)

    const clientSecret = await this.customerService.createCustomerSession(customerId)

    console.info(`[BillingCreditsHandler] Successfully created customer session`)

    return {
      client_secret: clientSecret
    }
  }

  /**
   * Fetches all active Stripe Products with their pricing information
   * Each product represents a one-time credit purchase option
   * @param request - ProductsRequest (reserved for future filtering)
   * @returns ProductsResponse with array of products including price IDs
   */
  async fetchProducts(request: ProductsRequest): Promise<ProductsResponse> {
    console.info('[BillingCreditsHandler] Fetching products')

    const products = await this.productService.fetchActiveProducts()

    console.info(`[BillingCreditsHandler] Successfully fetched ${products.length} products`)

    return {
      products
    }
  }

  /**
   * Creates a Stripe Checkout Session for purchasing credits
   * Attaches the session to the existing customer to prevent duplicates
   * @param request - Contains profile_id and price_id
   * @returns CheckoutSessionResponse with checkout_url
   */
  async createCheckoutSession(request: CheckoutSessionRequest, host: string | null): Promise<CheckoutSessionResponse> {
    const { profile_id, price_id } = request

    console.info(`[BillingCreditsHandler] Creating checkout session for profile: ${profile_id}, price: ${price_id}`)

    // 1. Check if Stripe Customer exists for this profile
    let customerId = await this.customerStore.getByProfileId(profile_id)

    // 2. If no customer exists, create one
    if (!customerId) {
      console.info(`[BillingCreditsHandler] No Stripe customer found, creating new customer for profile: ${profile_id}`)

      // Fetch profile email via ProfileStore
      const email = await this.profileStore.getEmailByProfileId(profile_id)

      if (!email) {
        console.error(`[BillingCreditsHandler] Profile not found or missing email for profile: ${profile_id}`)
        throw new Error('Profile not found or missing email')
      }

      // Create Stripe customer
      const customer = await this.customerService.createCustomer(profile_id, email)

      customerId = customer.id
      console.info(`[BillingCreditsHandler] Created new Stripe customer: ${customerId}`)
    }

    // 3. Create Checkout Session via links service
    console.info(`[BillingCreditsHandler] Creating checkout session for customer: ${customerId}`)

    const checkoutUrl = await this.linksService.createCheckoutSession(customerId, price_id, host)

    console.info(`[BillingCreditsHandler] Successfully created checkout session`)

    return {
      checkout_url: checkoutUrl
    }
  }

  /**
   * Calculates pending credits from tickets that are in processing states
   * @private
   */
  private async calculatePendingCredits(customerId: string): Promise<number> {
    console.info(`[BillingCreditsHandler] Calculating pending credits for customer: ${customerId}`)

    // Fetch tickets in relevant statuses
    const tickets = await this.ticketStore.fetchByCustomerAndStatuses(
      customerId,
      ['in-progress', 'awaiting-confirmation', 'pending-payment', 'payment-failed']
    )

    if (tickets.length === 0) {
      console.info(`[BillingCreditsHandler] No tickets found in processing states`)
      return 0
    }

    let totalPendingCredits = 0

    for (const ticket of tickets) {
      const credits = this.calculateTicketPendingCredits(ticket)
      console.info(`[BillingCreditsHandler] Ticket ${ticket.id} (${ticket.status}): ${credits} pending credits`)
      totalPendingCredits += credits
    }

    return totalPendingCredits
  }

  /**
   * Calculates pending credits for a single ticket based on its status
   * @private
   */
  private calculateTicketPendingCredits(ticket: TicketBillingInfo): number {
    let startTime: Date
    let endTime: Date

    switch (ticket.status) {
      case 'in-progress':
        // Calculate from claimed_at to now
        startTime = ticket.claimedAt || ticket.createdAt
        endTime = new Date()
        break

      case 'awaiting-confirmation':
        // Calculate from claimed_at to marked_as_fixed_at
        startTime = ticket.claimedAt || ticket.createdAt
        endTime = ticket.markAsFixedAt || new Date()
        break

      case 'pending-payment':
      case 'payment-failed':
        // Calculate from claimed_at to resolved_at
        startTime = ticket.claimedAt || ticket.createdAt
        endTime = ticket.resolvedAt || new Date()
        break

      default:
        return 0
    }

    // Calculate elapsed time in hours
    const elapsedMilliseconds = endTime.getTime() - startTime.getTime()
    const elapsedHours = elapsedMilliseconds / (1000 * 60 * 60)

    // Round up to nearest hour, max 2 credits per ticket
    const credits = Math.min(Math.ceil(elapsedHours), 2)

    return credits
  }

}