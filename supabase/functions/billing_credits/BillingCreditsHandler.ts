import type { BillingCreditsService, CreditBalance } from '@services/BillingCredits/index.ts'
import type { BillingSubscriptionService } from '@services/BillingSubscription/index.ts'
import { type BillingCustomerStore } from "@stores/BillingCustomer/index.ts";

export class BillingCreditsHandler {
  private readonly customerStore: BillingCustomerStore
  private readonly subscriptionService: BillingSubscriptionService
  private readonly creditsService: BillingCreditsService
  
  constructor(
    customerStore: BillingCustomerStore,
    subscriptionService: BillingSubscriptionService,
    creditsService: BillingCreditsService,
  ) {
    this.customerStore = customerStore
    this.subscriptionService = subscriptionService
    this.creditsService = creditsService
  }

  async fetchCreditBalance(profileId: string): Promise<CreditBalance | null> {

    console.info(`[BillingCreditsHandler] Fetching credit balance for profile: ${profileId}`)

    // 1. Fetch billing customer ID
    const customerId = await this.customerStore.getByProfileId(profileId)

    if (!customerId) {
      console.error(`[BillingCreditsHandler] No billing customer found for profile: ${profileId}`)
      throw new Error('No billing customer found for this profile')
    }

    // 2. Fetch active subscription
    const subscription = await this.subscriptionService.fetchActiveByCustomerId(customerId)
    if (!subscription) {
      console.info(`[BillingCreditsHandler] No active subscription found for customer: ${customerId}`)
      return null
    }

    // 3. Fetch credit balance from Stripe
    const creditBalance = await this.creditsService.fetchCreditBalance(subscription)

    console.info(`✅ [BillingCreditsHandler] Credit balance fetched: ${creditBalance.creditCount} credits`)

    return creditBalance
  }

  async processCreditTransfer(payload: { profile_id: string, ticket_id: string }): Promise<void> {
    const { profile_id, ticket_id } = payload

    console.info(`[BillingCreditsHandler] Processing credit transfer for ticket: ${ticket_id}, profile: ${profile_id}`)

    // TODO: Implement credit transfer logic
    // 1. Fetch ticket details
    // 2. Record meter event to Stripe
    // 3. Transfer funds to engineer via Stripe Connect

    throw new Error('Not implemented')
  }

}
