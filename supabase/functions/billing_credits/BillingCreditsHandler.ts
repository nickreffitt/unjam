import type { BillingCreditsService } from '@services/BillingCredits/index.ts'
import type { BillingSubscriptionService } from '@services/BillingSubscription/index.ts'
import { type BillingCustomerStore } from "@stores/BillingCustomer/index.ts";
import type { CreditBalanceRequest, CreditBalanceResponse, CreditTransferRequest, CreditTransferResponse } from '@types';

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

  async fetchCreditBalance(request: CreditBalanceRequest): Promise<CreditBalanceResponse> {
    const { profile_id } = request

    console.info(`[BillingCreditsHandler] Fetching credit balance for profile: ${profile_id}`)

    // 1. Fetch billing customer ID
    const customerId = await this.customerStore.getByProfileId(profile_id)

    if (!customerId) {
      console.error(`[BillingCreditsHandler] No billing customer found for profile: ${profile_id}`)
      throw new Error('No billing customer found for this profile')
    }

    // 2. Fetch active subscription
    const subscription = await this.subscriptionService.fetchActiveByCustomerId(customerId)
    if (!subscription) {
      console.info(`[BillingCreditsHandler] No active subscription found for customer: ${customerId}`)
      throw new Error('No active subscription found')
    }

    // 3. Fetch credit balance from Stripe (subscription allocation - meter usage)
    const creditBalanceData = await this.creditsService.fetchCreditBalance(subscription, customerId)

    console.info(`✅ [BillingCreditsHandler] Credit balance fetched: ${creditBalanceData.availableCredits} available (${creditBalanceData.totalCredits} total - ${creditBalanceData.usedCredits} used)`)

    return {
      creditBalance: creditBalanceData.availableCredits
    }
  }
}