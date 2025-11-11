import type { BillingCreditsService } from '@services/BillingCredits/index.ts'
import type { BillingSubscriptionService } from '@services/BillingSubscription/index.ts'
import type { BillingMeterService } from '@services/BillingMeter/index.ts'
import type { BillingEngineerPayoutService } from '@services/BillingEngineerPayout/index.ts'
import type { BillingBalanceService } from '@services/BillingBalance/index.ts'
import { type BillingCustomerStore } from "@stores/BillingCustomer/index.ts";
import { type BillingEngineerStore } from "@stores/BillingEngineer/index.ts";
import { type BillingEngineerTransferStore } from "@stores/BillingEngineerTransfer/index.ts";
import { type TicketStore } from "@stores/Ticket/index.ts";
import type { CreditTransferResponse } from '@types';

/**
 * Result when transfer is completed successfully
 */
interface TransferCompletedResult {
  status: 'completed';
  transferId: string;
  amount: number;
  platformProfit: number;
}

/**
 * Result when transfer is pending due to insufficient funds
 */
interface TransferPendingResult {
  status: 'pending_funds';
}

/**
 * Result when there are insufficient funds (both available and pending)
 */
interface TransferInsufficientFundsResult {
  status: 'insufficient_funds';
}

/**
 * Union type for transfer operation results
 */
type TransferOperationResult = TransferCompletedResult | TransferPendingResult | TransferInsufficientFundsResult;

export class PaymentHandler {
  private readonly customerStore: BillingCustomerStore
  private readonly engineerStore: BillingEngineerStore
  private readonly transferStore: BillingEngineerTransferStore
  private readonly ticketStore: TicketStore
  private readonly subscriptionService: BillingSubscriptionService
  private readonly creditsService: BillingCreditsService
  private readonly meterService: BillingMeterService
  private readonly payoutService: BillingEngineerPayoutService
  private readonly balanceService: BillingBalanceService

  constructor(
    customerStore: BillingCustomerStore,
    engineerStore: BillingEngineerStore,
    transferStore: BillingEngineerTransferStore,
    ticketStore: TicketStore,
    subscriptionService: BillingSubscriptionService,
    creditsService: BillingCreditsService,
    meterService: BillingMeterService,
    payoutService: BillingEngineerPayoutService,
    balanceService: BillingBalanceService,
  ) {
    this.customerStore = customerStore
    this.engineerStore = engineerStore
    this.transferStore = transferStore
    this.ticketStore = ticketStore
    this.subscriptionService = subscriptionService
    this.creditsService = creditsService
    this.meterService = meterService
    this.payoutService = payoutService
    this.balanceService = balanceService
  }

  async processPayment(ticketId: string, customerId: string): Promise<CreditTransferResponse> {

    console.info(`[PaymentHandler] Processing payment for ticket: ${ticketId}, profile: ${customerId}`)

    // STEP 1: Validate prerequisites and check idempotency
    console.info(`[PaymentHandler] Step 1: Validating prerequisites`)

    // Check if transfer already exists (idempotency)
    const existingTransfer = await this.transferStore.fetchByTicketId(ticketId)
    if (existingTransfer) {
      console.info(`[PaymentHandler] Transfer already exists for ticket ${ticketId}, status: ${existingTransfer.status}`)

      if (existingTransfer.status === 'completed') {
        return { success: true }
      }

      if (existingTransfer.status === 'failed') {
        throw new Error(`Transfer previously failed: ${existingTransfer.errorMessage}`)
      }

      if (existingTransfer.status === 'pending_funds') {
        console.info(`[PaymentHandler] Transfer waiting for funds to become available`)
        throw new Error('Transfer is waiting for funds to become available')
      }

      // Status is 'pending' - this shouldn't happen but treat as in-progress
      throw new Error('Transfer is already in progress')
    }

    // Validate prerequisites
    const { ticket, stripeCustomerId, engineerAccount, creditsUsed, creditValue } = await this.validateTransferPrerequisites(ticketId)

    console.info(`✅ [PaymentHandler] Prerequisites validated. Credit value: ${creditValue} cents`)

    // STEP 2: Create audit record FIRST (status: 'pending')
    console.info(`[PaymentHandler] Step 2: Creating audit record`)

    const transferRecord = await this.transferStore.create({
      ticketId,
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

    console.info(`✅ [PaymentHandler] Audit record created: ${transferRecord.id}`)

    try {
      // STEP 3 & 4: Execute transfer operations
      const transferResult = await this.executeTransferOperations({
        ticketId,
        stripeCustomerId,
        creditsUsed,
        engineerId: ticket.engineerId!,
        engineerAccountId: engineerAccount.id,
        customerId: ticket.customerId,
        creditValue
      })

      // Check if there are insufficient funds entirely
      if (transferResult.status === 'insufficient_funds') {
        // STEP 5a: Update audit record (status: 'failed')
        console.error(`[PaymentHandler] Step 5a: Updating audit record to failed - insufficient funds`)

        // Fetch payout amount for the transfer record
        const payoutAmount = await this.payoutService.fetchPayoutAmount(engineerAccount.id)
        const platformProfit = creditValue - payoutAmount

        await this.transferStore.update(transferRecord.id, {
          stripeTransferId: null,
          amount: payoutAmount,
          platformProfit,
          status: 'failed',
          errorMessage: 'Insufficient funds (both available and pending balance). Manual triage required.'
        })

        // STEP 6a: Update ticket status to 'payment-failed'
        console.error(`[PaymentHandler] Step 6a: Updating ticket status to payment-failed`)

        await this.ticketStore.updateStatus(ticketId, 'payment-failed')

        console.error(`❌ [PaymentHandler] Payment failed for ticket ${ticketId} - insufficient funds. Customer support triage required.`)

        throw new Error('Insufficient funds for transfer. Manual triage required.')
      }

      // Check if transfer is pending due to insufficient available funds (but pending will cover)
      if (transferResult.status === 'pending_funds') {
        // STEP 5b: Update audit record (status: 'pending_funds')
        console.info(`[PaymentHandler] Step 5b: Updating audit record to pending_funds`)

        // Fetch payout amount for the transfer record
        const payoutAmount = await this.payoutService.fetchPayoutAmount(engineerAccount.id)
        const platformProfit = creditValue - payoutAmount

        await this.transferStore.update(transferRecord.id, {
          stripeTransferId: null,
          amount: payoutAmount,
          platformProfit,
          status: 'pending_funds'
        })

        // STEP 6b: Update ticket status to 'pending-payment' to clearly indicate payment is pending
        console.info(`[PaymentHandler] Step 6b: Updating ticket status to pending-payment`)

        await this.ticketStore.updateStatus(ticketId, 'pending-payment')

        console.info(`⚠️ [PaymentHandler] Payment pending for ticket ${ticketId} - waiting for funds to clear`)

        return { success: true }
      }

      // TypeScript now knows transferResult is TransferCompletedResult
      // STEP 5: Update audit record (status: 'completed')
      console.info(`[PaymentHandler] Step 5: Updating audit record to completed`)

      await this.transferStore.update(transferRecord.id, {
        stripeTransferId: transferResult.transferId,
        amount: transferResult.amount,
        platformProfit: transferResult.platformProfit,
        status: 'completed',
        availableForTransferAt: new Date()
      })

      // STEP 6: Update ticket status to 'completed'
      console.info(`[PaymentHandler] Step 6: Updating ticket status to completed`)

      await this.ticketStore.updateStatus(ticketId, 'completed')

      console.info(`✅ [PaymentHandler] Payment completed successfully for ticket ${ticketId}`)

      return { success: true }

    } catch (error) {
      // Update audit record with failure status
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ [PaymentHandler] Payment failed: ${errorMessage}`)

      // Update ticket status to 'payment-failed'
      try {
        await this.transferStore.update(transferRecord.id, {
          status: 'failed',
          errorMessage
        })
        
        await this.ticketStore.updateStatus(ticketId, 'payment-failed')
      } catch (updateError) {
        console.error(`[PaymentHandler] Failed to update ticket status to payment-failed:`, updateError)
      }

      throw new Error(`Payment failed: ${errorMessage}`)
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
    const endTime = ticket.resolvedAt || ticket.markAsFixedAt || new Date()
    const elapsedMilliseconds = endTime.getTime() - startTime.getTime()
    const elapsedHours = elapsedMilliseconds / (1000 * 60 * 60)

    // Calculate number of credits (rounded up to nearest hour, max 2)
    const creditsUsed = Math.min(Math.ceil(elapsedHours), 2)

    // Calculate credit value (credit price × number of credits)
    const creditValue = subscription.creditPrice * creditsUsed

    console.info(`[PaymentHandler] Elapsed time: ${elapsedHours.toFixed(2)} hours, Credits used: ${creditsUsed}, Credit value: ${creditValue} cents`)

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
   * Checks available balance before attempting transfer
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
  }): Promise<TransferOperationResult> {
    // STEP 3: Record meter event to Stripe (deduct customer credit)
    console.info(`[PaymentHandler] Recording meter event to Stripe`)

    await this.meterService.recordTicketCompletion({
      customerId: params.stripeCustomerId,
      ticketId: params.ticketId,
      value: params.creditsUsed
    })

    console.info(`✅ [PaymentHandler] Meter event recorded: ${params.creditsUsed} credits`)

    // STEP 3.5: Fetch payout amount to check balance requirement
    console.info(`[PaymentHandler] Fetching payout amount for engineer`)

    const payoutAmount = await this.payoutService.fetchPayoutAmount(params.engineerAccountId)

    console.info(`[PaymentHandler] Payout amount: ${payoutAmount} cents ($${(payoutAmount / 100).toFixed(2)})`)

    // STEP 3.6: Check if sufficient balance is available
    console.info(`[PaymentHandler] Checking Stripe available balance`)

    const balanceInfo = await this.balanceService.getBalance()

    // Check for three scenarios:
    // 1. Insufficient funds entirely (both available and pending)
    if (balanceInfo.available < payoutAmount &&
        balanceInfo.pending < payoutAmount) {
      console.error(`❌ [PaymentHandler] Insufficient funds. Available: $${(balanceInfo.available / 100).toFixed(2)}, Pending: $${(balanceInfo.pending / 100).toFixed(2)}, Required: $${(payoutAmount / 100).toFixed(2)}. Manual triage required.`)
      return { status: 'insufficient_funds' }
    }

    // 2. Funds will be available once pending clears
    if (balanceInfo.available < payoutAmount &&
        balanceInfo.pending >= payoutAmount) {
      console.warn(`⚠️ [PaymentHandler] Insufficient available balance, but pending funds will cover it. Available: $${(balanceInfo.available / 100).toFixed(2)}, Pending: $${(balanceInfo.pending / 100).toFixed(2)}. Transfer marked as pending_funds.`)
      return { status: 'pending_funds' }
    }

    // 3. Sufficient available balance - proceed with transfer
    console.info(`✅ [PaymentHandler] Sufficient balance available. Available: $${(balanceInfo.available / 100).toFixed(2)}`)

    // STEP 4: Transfer funds to engineer via Stripe Connect
    console.info(`[PaymentHandler] Creating transfer to engineer`)

    const transferResult = await this.payoutService.createTransfer({
      ticketId: params.ticketId,
      engineerId: params.engineerId,
      engineerConnectAccountId: params.engineerAccountId,
      customerId: params.customerId,
      creditValue: params.creditValue
    })

    console.info(`✅ [PaymentHandler] Transfer created: ${transferResult.transferId}, amount: ${transferResult.amount}, profit: ${transferResult.platformProfit}`)

    return {
      status: 'completed',
      transferId: transferResult.transferId,
      amount: transferResult.amount,
      platformProfit: transferResult.platformProfit
    }
  }

}
