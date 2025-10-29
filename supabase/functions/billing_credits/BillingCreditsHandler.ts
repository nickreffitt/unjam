import type { BillingCreditsService } from '@services/BillingCredits/index.ts'
import type { BillingSubscriptionService } from '@services/BillingSubscription/index.ts'
import { type BillingCustomerStore } from "@stores/BillingCustomer/index.ts";
import { type TicketStore, type TicketBillingInfo } from "@stores/Ticket/index.ts";
import type { CreditBalanceRequest, CreditBalanceResponse, CreditTransferRequest, CreditTransferResponse } from '@types';

export class BillingCreditsHandler {
  private readonly customerStore: BillingCustomerStore
  private readonly subscriptionService: BillingSubscriptionService
  private readonly creditsService: BillingCreditsService
  private readonly ticketStore: TicketStore

  constructor(
    customerStore: BillingCustomerStore,
    subscriptionService: BillingSubscriptionService,
    creditsService: BillingCreditsService,
    ticketStore: TicketStore,
  ) {
    this.customerStore = customerStore
    this.subscriptionService = subscriptionService
    this.creditsService = creditsService
    this.ticketStore = ticketStore
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

    // 4. Calculate pending credits from tickets in processing states
    const pendingCredits = await this.calculatePendingCredits(profile_id)

    console.info(`✅ [BillingCreditsHandler] Pending credits calculated: ${pendingCredits}`)

    return {
      creditBalance: creditBalanceData.availableCredits,
      pendingCredits
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