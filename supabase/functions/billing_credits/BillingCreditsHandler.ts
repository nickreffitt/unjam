import type { BillingCreditsService } from '@services/BillingCredits/index.ts'
import type { BillingSubscriptionService } from '@services/BillingSubscription/index.ts'
import type { BillingMeterService } from '@services/BillingMeter/index.ts'
import type { BillingEngineerPayoutService } from '@services/BillingEngineerPayout/index.ts'
import { type BillingCustomerStore } from "@stores/BillingCustomer/index.ts";
import { type BillingEngineerStore } from "@stores/BillingEngineer/index.ts";
import { type BillingEngineerTransferStore } from "@stores/BillingEngineerTransfer/index.ts";
import { type TicketStore } from "@stores/Ticket/index.ts";
import type { CreditBalanceRequest, CreditBalanceResponse, CreditTransferRequest, CreditTransferResponse } from '@types';

export class BillingCreditsHandler {
  private readonly customerStore: BillingCustomerStore
  private readonly engineerStore: BillingEngineerStore
  private readonly transferStore: BillingEngineerTransferStore
  private readonly ticketStore: TicketStore
  private readonly subscriptionService: BillingSubscriptionService
  private readonly creditsService: BillingCreditsService
  private readonly meterService: BillingMeterService
  private readonly payoutService: BillingEngineerPayoutService

  constructor(
    customerStore: BillingCustomerStore,
    engineerStore: BillingEngineerStore,
    transferStore: BillingEngineerTransferStore,
    ticketStore: TicketStore,
    subscriptionService: BillingSubscriptionService,
    creditsService: BillingCreditsService,
    meterService: BillingMeterService,
    payoutService: BillingEngineerPayoutService,
  ) {
    this.customerStore = customerStore
    this.engineerStore = engineerStore
    this.transferStore = transferStore
    this.ticketStore = ticketStore
    this.subscriptionService = subscriptionService
    this.creditsService = creditsService
    this.meterService = meterService
    this.payoutService = payoutService
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

  async processCreditTransfer(request: CreditTransferRequest): Promise<CreditTransferResponse> {
    const { profile_id, ticket_id } = request

    console.info(`[BillingCreditsHandler] Processing credit transfer for ticket: ${ticket_id}, profile: ${profile_id}`)

    // STEP 1: Validate prerequisites and check idempotency
    console.info(`[BillingCreditsHandler] Step 1: Validating prerequisites`)

    // Check if transfer already exists (idempotency)
    const existingTransfer = await this.transferStore.fetchByTicketId(ticket_id)
    if (existingTransfer) {
      console.info(`[BillingCreditsHandler] Transfer already exists for ticket ${ticket_id}, status: ${existingTransfer.status}`)

      if (existingTransfer.status === 'completed') {
        return { success: true }
      }

      if (existingTransfer.status === 'failed') {
        throw new Error(`Transfer previously failed: ${existingTransfer.errorMessage}`)
      }

      // Status is 'pending' - this shouldn't happen but treat as in-progress
      throw new Error('Transfer is already in progress')
    }

    // Validate prerequisites
    const { ticket, stripeCustomerId, engineerAccount, creditsUsed, creditValue } = await this.validateTransferPrerequisites(ticket_id)

    console.info(`✅ [BillingCreditsHandler] Prerequisites validated. Credit value: ${creditValue} cents`)

    // STEP 2: Create audit record FIRST (status: 'pending')
    console.info(`[BillingCreditsHandler] Step 2: Creating audit record`)

    const transferRecord = await this.transferStore.create({
      ticketId: ticket_id,
      engineerId: ticket.engineerId!, // Non-null assertion: validated in validateTransferPrerequisites
      customerId: ticket.customerId,
      stripeTransferId: null,
      amount: 0, // Will be updated after payout
      creditsUsed,
      creditValue,
      platformProfit: 0, // Will be calculated after payout
      status: 'pending',
      errorMessage: null
    })

    console.info(`✅ [BillingCreditsHandler] Audit record created: ${transferRecord.id}`)

    try {
      // STEP 3 & 4: Execute transfer operations
      const transferResult = await this.executeTransferOperations({
        ticketId: ticket_id,
        stripeCustomerId,
        creditsUsed,
        engineerId: ticket.engineerId!,
        engineerAccountId: engineerAccount.id,
        customerId: ticket.customerId,
        creditValue
      })

      // STEP 5: Update audit record (status: 'completed')
      console.info(`[BillingCreditsHandler] Step 5: Updating audit record to completed`)

      await this.transferStore.update(transferRecord.id, {
        stripeTransferId: transferResult.transferId,
        amount: transferResult.amount,
        platformProfit: transferResult.platformProfit,
        status: 'completed'
      })

      console.info(`✅ [BillingCreditsHandler] Credit transfer completed successfully for ticket ${ticket_id}`)

      return { success: true }

    } catch (error) {
      // Update audit record with failure status
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ [BillingCreditsHandler] Credit transfer failed: ${errorMessage}`)

      await this.transferStore.update(transferRecord.id, {
        status: 'failed',
        errorMessage
      })

      throw new Error(`Credit transfer failed: ${errorMessage}`)
    }
  }

  /**
   * Retries all failed credit transfers
   * Useful for automated recovery via cron jobs
   *
   * @returns Summary of retry results
   */
  async retryAllFailedTransfers(): Promise<{
    totalFailed: number;
    retrySucceeded: number;
    retryFailed: number;
    results: Array<{ ticketId: string; success: boolean; error?: string }>
  }> {
    console.info(`[BillingCreditsHandler] Starting batch retry of failed transfers`)

    // Fetch all failed transfers (we'll need to add this method to the store)
    const failedTransfers = await this.transferStore.fetchByStatus('failed')

    console.info(`[BillingCreditsHandler] Found ${failedTransfers.length} failed transfers to retry`)

    const results = []
    let retrySucceeded = 0
    let retryFailed = 0

    for (const transfer of failedTransfers) {
      try {
        console.info(`[BillingCreditsHandler] Retrying transfer for ticket: ${transfer.ticketId}`)
        await this.retryCreditTransfer(transfer.ticketId)
        retrySucceeded++
        results.push({ ticketId: transfer.ticketId, success: true })
        console.info(`✅ [BillingCreditsHandler] Successfully retried transfer for ticket: ${transfer.ticketId}`)
      } catch (error) {
        retryFailed++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({ ticketId: transfer.ticketId, success: false, error: errorMessage })
        console.error(`❌ [BillingCreditsHandler] Failed to retry transfer for ticket ${transfer.ticketId}: ${errorMessage}`)
      }
    }

    console.info(`✅ [BillingCreditsHandler] Batch retry completed. Succeeded: ${retrySucceeded}, Failed: ${retryFailed}`)

    return {
      totalFailed: failedTransfers.length,
      retrySucceeded,
      retryFailed,
      results
    }
  }

  /**
   * Retries a failed credit transfer
   * This is useful for recovering from transient failures (e.g., Stripe API timeouts)
   *
   * @param ticket_id - The ticket ID to retry
   * @returns True if retry was successful
   * @throws Error if no failed transfer exists or retry fails
   */
  async retryCreditTransfer(ticket_id: string): Promise<CreditTransferResponse> {
    console.info(`[BillingCreditsHandler] Retrying credit transfer for ticket: ${ticket_id}`)

    // Fetch the existing transfer record
    const existingTransfer = await this.transferStore.fetchByTicketId(ticket_id)
    if (!existingTransfer) {
      throw new Error(`No transfer record found for ticket: ${ticket_id}`)
    }

    if (existingTransfer.status === 'completed') {
      console.info(`[BillingCreditsHandler] Transfer already completed for ticket ${ticket_id}`)
      return { success: true }
    }

    if (existingTransfer.status === 'pending') {
      throw new Error(`Transfer is still in progress for ticket ${ticket_id}. Cannot retry.`)
    }

    // Status must be 'failed' at this point
    console.info(`[BillingCreditsHandler] Found failed transfer ${existingTransfer.id}, attempting retry`)

    // Validate prerequisites (reuse helper method)
    const { ticket, stripeCustomerId, engineerAccount } = await this.validateTransferPrerequisites(ticket_id)

    // Determine what needs to be retried based on existing transfer state
    const needsMeterEvent = !existingTransfer.stripeTransferId // If no transfer ID, meter event may have failed
    const needsTransfer = !existingTransfer.stripeTransferId // If no transfer ID, transfer definitely failed

    // Update transfer to pending
    await this.transferStore.update(existingTransfer.id, {
      status: 'pending',
      errorMessage: null
    })

    try {
      let transferResult

      // If both operations need retry, use the helper method
      if (needsMeterEvent && needsTransfer) {
        console.info(`[BillingCreditsHandler] Retrying both meter event and transfer`)
        transferResult = await this.executeTransferOperations({
          ticketId: ticket_id,
          stripeCustomerId,
          creditsUsed: existingTransfer.creditsUsed,
          engineerId: ticket.engineerId!,
          engineerAccountId: engineerAccount.id,
          customerId: ticket.customerId,
          creditValue: existingTransfer.creditValue
        })
      }
      // If only meter event needs retry
      else if (needsMeterEvent) {
        console.info(`[BillingCreditsHandler] Retrying meter event only`)
        await this.meterService.recordTicketCompletion({
          customerId: stripeCustomerId,
          ticketId: ticket_id,
          value: existingTransfer.creditsUsed
        })
        console.info(`✅ [BillingCreditsHandler] Meter event recorded: ${existingTransfer.creditsUsed} credits`)
      }
      // If only transfer needs retry
      else if (needsTransfer) {
        console.info(`[BillingCreditsHandler] Retrying engineer transfer only`)
        transferResult = await this.payoutService.createTransfer({
          ticketId: ticket_id,
          engineerId: ticket.engineerId!,
          engineerConnectAccountId: engineerAccount.id,
          customerId: ticket.customerId,
          creditValue: existingTransfer.creditValue
        })
        console.info(`✅ [BillingCreditsHandler] Transfer created: ${transferResult.transferId}`)
      } else {
        console.info(`[BillingCreditsHandler] Nothing to retry, marking as completed`)
      }

      // Update audit record with success
      if (transferResult) {
        await this.transferStore.update(existingTransfer.id, {
          stripeTransferId: transferResult.transferId,
          amount: transferResult.amount,
          platformProfit: transferResult.platformProfit,
          status: 'completed'
        })
      } else {
        await this.transferStore.update(existingTransfer.id, {
          status: 'completed'
        })
      }

      console.info(`✅ [BillingCreditsHandler] Credit transfer retry completed successfully for ticket ${ticket_id}`)
      return { success: true }

    } catch (error) {
      // Update audit record with failure status
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ [BillingCreditsHandler] Credit transfer retry failed: ${errorMessage}`)

      await this.transferStore.update(existingTransfer.id, {
        status: 'failed',
        errorMessage
      })

      throw new Error(`Credit transfer retry failed: ${errorMessage}`)
    }
  }

  /**
   * Validates all prerequisites for a credit transfer
   * @private
   */
  private async validateTransferPrerequisites(ticketId: string) {
    // Fetch ticket details
    const ticket = await this.ticketStore.fetchBillingInfo(ticketId)
    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`)
    }

    if (!ticket.engineerId) {
      throw new Error(`Ticket ${ticketId} has no assigned engineer`)
    }

    // Fetch customer Stripe ID
    const stripeCustomerId = await this.customerStore.getByProfileId(ticket.customerId)
    if (!stripeCustomerId) {
      throw new Error(`No billing customer found for profile: ${ticket.customerId}`)
    }

    // Fetch active subscription to get credit price
    const subscription = await this.subscriptionService.fetchActiveByCustomerId(stripeCustomerId)
    if (!subscription) {
      throw new Error(`No active subscription found for customer: ${stripeCustomerId}`)
    }

    // Calculate elapsed time in hours
    const startTime = ticket.claimedAt || ticket.createdAt
    const endTime = ticket.resolvedAt || new Date()
    const elapsedMilliseconds = endTime.getTime() - startTime.getTime()
    const elapsedHours = elapsedMilliseconds / (1000 * 60 * 60)

    // Calculate number of credits (rounded up to nearest hour, max 2)
    const creditsUsed = Math.min(Math.ceil(elapsedHours), 2)

    // Calculate credit value (credit price × number of credits)
    const creditValue = subscription.creditPrice * creditsUsed

    console.info(`[BillingCreditsHandler] Elapsed time: ${elapsedHours.toFixed(2)} hours, Credits used: ${creditsUsed}, Credit value: ${creditValue} cents`)

    // Fetch engineer Connect account
    const engineerAccount = await this.engineerStore.getByProfileId(ticket.engineerId)
    if (!engineerAccount) {
      throw new Error(`No billing engineer account found for profile: ${ticket.engineerId}`)
    }

    if (!engineerAccount.chargesEnabled || !engineerAccount.payoutsEnabled) {
      throw new Error(`Engineer Connect account not fully enabled. Charges: ${engineerAccount.chargesEnabled}, Payouts: ${engineerAccount.payoutsEnabled}`)
    }

    return {
      ticket,
      stripeCustomerId,
      engineerAccount,
      creditsUsed,
      creditValue
    }
  }

  /**
   * Executes the transfer operations (meter event + Stripe transfer)
   * @private
   */
  private async executeTransferOperations(params: {
    ticketId: string
    stripeCustomerId: string
    creditsUsed: number
    engineerId: string
    engineerAccountId: string
    customerId: string
    creditValue: number
  }): Promise<{ transferId: string; amount: number; platformProfit: number }> {
    // STEP 3: Record meter event to Stripe (deduct customer credit)
    console.info(`[BillingCreditsHandler] Recording meter event to Stripe`)

    await this.meterService.recordTicketCompletion({
      customerId: params.stripeCustomerId,
      ticketId: params.ticketId,
      value: params.creditsUsed
    })

    console.info(`✅ [BillingCreditsHandler] Meter event recorded: ${params.creditsUsed} credits`)

    // STEP 4: Transfer funds to engineer via Stripe Connect
    console.info(`[BillingCreditsHandler] Creating transfer to engineer`)

    const transferResult = await this.payoutService.createTransfer({
      ticketId: params.ticketId,
      engineerId: params.engineerId,
      engineerConnectAccountId: params.engineerAccountId,
      customerId: params.customerId,
      creditValue: params.creditValue
    })

    console.info(`✅ [BillingCreditsHandler] Transfer created: ${transferResult.transferId}, amount: ${transferResult.amount}, profit: ${transferResult.platformProfit}`)

    return transferResult
  }

}
