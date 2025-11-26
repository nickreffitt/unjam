import type { BillingCreditsService } from '@services/BillingCredits/index.ts'
import type { BillingInvoiceService, InvoiceLineItemWithProduct } from '@services/BillingInvoice/index.ts'
import type { BillingMeterService } from '@services/BillingMeter/index.ts'
import type { BillingEngineerPayoutService } from '@services/BillingEngineerPayout/index.ts'
import type { BillingBalanceService } from '@services/BillingBalance/index.ts'
import type { BillingBatchGroupService } from '@services/BillingBatchGroup/index.ts'
import type { BillingBatchGroupItemService } from '@services/BillingBatchGroupItem/index.ts'
import { type BillingCustomerStore } from "@stores/BillingCustomer/index.ts";
import { type BillingEngineerStore } from "@stores/BillingEngineer/index.ts";
import { type BillingEngineerTransferStore } from "@stores/BillingEngineerTransfer/index.ts";
import { type BillingBatchGroupStore } from "@stores/BillingBatchGroup/index.ts";
import { type BillingBatchGroupItemStore } from "@stores/BillingBatchGroupItem/index.ts";
import { type BillingEngineerBankTransferAccountStore } from "@stores/BillingEngineerBankTransferAccount/index.ts";
import { type TicketStore } from "@stores/Ticket/index.ts";
import type { AddBatchItemRequest, CreditTransferResponse } from '@types';

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
  private readonly bankTransferAccountStore: BillingEngineerBankTransferAccountStore
  private readonly transferStore: BillingEngineerTransferStore
  private readonly batchGroupStore: BillingBatchGroupStore
  private readonly batchGroupItemStore: BillingBatchGroupItemStore
  private readonly ticketStore: TicketStore
  private readonly invoiceService: BillingInvoiceService
  private readonly creditsService: BillingCreditsService
  private readonly meterService: BillingMeterService
  private readonly payoutService: BillingEngineerPayoutService
  private readonly balanceService: BillingBalanceService
  private readonly batchGroupService: BillingBatchGroupService
  private readonly batchGroupItemService: BillingBatchGroupItemService

  constructor(
    customerStore: BillingCustomerStore,
    engineerStore: BillingEngineerStore,
    bankTransferAccountStore: BillingEngineerBankTransferAccountStore,
    transferStore: BillingEngineerTransferStore,
    batchGroupStore: BillingBatchGroupStore,
    batchGroupItemStore: BillingBatchGroupItemStore,
    ticketStore: TicketStore,
    invoiceService: BillingInvoiceService,
    creditsService: BillingCreditsService,
    meterService: BillingMeterService,
    payoutService: BillingEngineerPayoutService,
    balanceService: BillingBalanceService,
    batchGroupService: BillingBatchGroupService,
    batchGroupItemService: BillingBatchGroupItemService,
  ) {
    this.customerStore = customerStore
    this.engineerStore = engineerStore
    this.bankTransferAccountStore = bankTransferAccountStore
    this.transferStore = transferStore
    this.batchGroupStore = batchGroupStore
    this.batchGroupItemStore = batchGroupItemStore
    this.ticketStore = ticketStore
    this.invoiceService = invoiceService
    this.creditsService = creditsService
    this.meterService = meterService
    this.payoutService = payoutService
    this.balanceService = balanceService
    this.batchGroupService = batchGroupService
    this.batchGroupItemService = batchGroupItemService
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
    const { ticket, stripeCustomerId, creditsUsed, creditValue, allocatedInvoiceLineItems } = await this.validateTransferPrerequisites(ticketId)
    if (!ticket.engineerId) {
      throw new Error(`Engineer ID not set in ticket`)
    }

    console.info(`✅ [PaymentHandler] Prerequisites validated. Credit value: ${creditValue} cents`)

    // Check which payment account the engineer has set up
    console.info(`[PaymentHandler] Checking engineer payment account setup`)

    const engineerAccount = await this.engineerStore.getByProfileId(ticket.engineerId)
    const bankTransferAccount = await this.bankTransferAccountStore.getByProfileId(ticket.engineerId)

    let paymentService: 'stripe_connect' | 'bank_transfer'

    if (engineerAccount && engineerAccount.chargesEnabled && engineerAccount.payoutsEnabled) {
      console.info(`[PaymentHandler] Engineer has Stripe Connect account`)
      paymentService = 'stripe_connect'
    } else if (bankTransferAccount && bankTransferAccount.active) {
      console.info(`[PaymentHandler] Engineer has bank transfer account`)
      paymentService = 'bank_transfer'
    } else {
      throw new Error(`Engineer has no valid payment account. Stripe enabled: ${engineerAccount?.chargesEnabled}/${engineerAccount?.payoutsEnabled}, Bank transfer active: ${bankTransferAccount?.active}`)
    }

    // STEP 2: Create audit record FIRST (status: 'pending')
    console.info(`[PaymentHandler] Step 2: Creating audit record with service: ${paymentService}`)

    const transferRecord = await this.transferStore.create({
      ticketId,
      engineerId: ticket.engineerId!, // Non-null assertion: validated in validateTransferPrerequisites
      customerId: ticket.customerId,
      service: paymentService,
      amount: 0, // Will be updated after payout
      creditsUsed,
      creditValue,
      platformProfit: 0, // Will be calculated after payout
      status: 'pending',
      errorMessage: null
    })

    console.info(`✅ [PaymentHandler] Audit record created: ${transferRecord.id}`)

    try {
      // STEP 3 & 4: Execute transfer operations based on payment service
      let transferResult: TransferOperationResult

      if (paymentService === 'stripe_connect') {
        transferResult = await this.executeTransferOperations({
          ticketId,
          stripeCustomerId,
          creditsUsed,
          engineerId: ticket.engineerId!,
          engineerAccountId: engineerAccount!.id,
          customerId: ticket.customerId,
          creditValue
        })
      } else {
        // Bank transfer - just record meter event and create pending transfer
        console.info(`[PaymentHandler] Recording meter event for bank transfer`)

        await this.meterService.recordTicketCompletion({
          customerId: stripeCustomerId,
          ticketId,
          value: creditsUsed
        })

        console.info(`✅ [PaymentHandler] Meter event recorded: ${creditsUsed} credits`)

        // Calculate fixed payout amount and platform profit
        const payoutAmount = 2000 // Fixed $20 payout
        const platformProfit = creditValue - payoutAmount

        // Update transfer record with calculated amounts
        await this.transferStore.update(transferRecord.id, {
          amount: payoutAmount,
          platformProfit,
          status: 'pending'
        })

        console.info(`[PaymentHandler] Transfer record updated with amounts. Awaiting batch processing.`)

        // Update ticket status to pending-payment
        await this.ticketStore.updateStatus(ticketId, 'pending-payment')

        console.info(`✅ [PaymentHandler] Bank transfer pending for ticket ${ticketId} - awaiting weekly batch processing`)

        return { success: true }
      }

      // Check if there are insufficient funds entirely
      if (transferResult.status === 'insufficient_funds') {
        // STEP 5a: Update audit record (status: 'failed')
        console.error(`[PaymentHandler] Step 5a: Updating audit record to failed - insufficient funds`)

        // Fetch payout amount for the transfer record
        const payoutAmount = await this.payoutService.fetchPayoutAmount(engineerAccount.id)
        const platformProfit = creditValue - payoutAmount

        await this.transferStore.update(transferRecord.id, {
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
        const payoutAmount = await this.payoutService.fetchPayoutAmount(engineerAccount!.id)
        const platformProfit = creditValue - payoutAmount

        await this.transferStore.update(transferRecord.id, {
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
   * Processes weekly batch transfer
   * This method handles the batch group lifecycle:
   * 1. Fetch all pending bank transfers grouped by engineer
   * 2. Create new batch group via BatchGroupService and persist to BatchGroupStore
   * 3. Add items to batch via BatchGroupItemService, then store items in BatchGroupItemStore
   * 4. If >1 transfer, submit the batch via BatchGroupService
   */
  async processWeeklyBatchTransfer(): Promise<CreditTransferResponse> {
    console.info(`[PaymentHandler] Processing weekly batch transfer`)

    // STEP 1: Fetch all pending bank transfers grouped by engineer
    console.info(`[PaymentHandler] Step 1: Fetching pending bank transfers`)

    const pendingTransfers = await this.transferStore.fetchPendingBankTransfersGroupedByEngineer()

    if (pendingTransfers.size === 0) {
      console.info(`[PaymentHandler] No pending bank transfers to process`)
      return { success: true }
    }

    console.info(`[PaymentHandler] Found ${pendingTransfers.size} engineers with pending transfers`)

    // STEP 2: Create new batch group via BatchGroupService
    console.info(`[PaymentHandler] Step 2: Creating batch group`)

    const batchGroupResponse = await this.batchGroupService.createBatchGroup()

    console.info(`✅ [PaymentHandler] Batch group created: ${batchGroupResponse.id}`)

    // STEP 3: Persist batch group to BatchGroupStore
    console.info(`[PaymentHandler] Step 3: Persisting batch group`)

    const batchGroup = await this.batchGroupStore.create({
      externalBatchGroupId: batchGroupResponse.id,
      name: batchGroupResponse.name,
      version: 1, // Initial version for new batch group
      status: batchGroupResponse.status,
      transfers: []
    })

    console.info(`✅ [PaymentHandler] Batch group persisted: ${batchGroup.id}`)

    // STEP 4: Build batch items for each engineer
    console.info(`[PaymentHandler] Step 4: Building batch items`)

    const batchItems: AddBatchItemRequest[] = []
    const engineerBatchItemMap: Map<string, {
      totalAmount: number;
      totalPlatformProfit: number;
      externalEngineerId: string;
      transferIds: string[];
      requestId: string;
    }> = new Map()

    for (const [engineerId, data] of pendingTransfers) {
      // Get engineer's bank transfer account (beneficiary)
      const bankAccount = await this.bankTransferAccountStore.getByProfileId(engineerId)
      if (!bankAccount) {
        console.error(`[PaymentHandler] No bank account for engineer ${engineerId}, skipping`)
        continue
      }

      // Create batch item request (amount in major units - dollars)
      const item: AddBatchItemRequest = {
        beneficiaryId: bankAccount.external_id,
        sourceCurrency: 'USD',
        transferCurrency: 'USD', // All transfers are in USD
        transferAmount: data.totalAmount / 100, // Convert cents to dollars
        transferMethod: 'LOCAL',
        reason: 'Contractor payment',
        reference: `Unjam`,
        requestId: crypto.randomUUID()
      }
      batchItems.push(item)

      // Store mapping for later persistence (include requestId for matching with Airwallex response)
      engineerBatchItemMap.set(engineerId, {
        totalAmount: data.totalAmount,
        totalPlatformProfit: data.totalPlatformProfit,
        externalEngineerId: bankAccount.external_id,
        transferIds: data.transferIds,
        requestId: item.requestId
      })

      console.info(`[PaymentHandler] Added batch item for engineer ${engineerId}: $${(data.totalAmount / 100).toFixed(2)}`)
    }

    if (batchItems.length === 0) {
      console.warn(`[PaymentHandler] No valid batch items to process`)
      return { success: true }
    }

    // STEP 5: Add items to batch via BatchGroupItemService
    console.info(`[PaymentHandler] Step 5: Adding ${batchItems.length} items to batch`)

    await this.batchGroupItemService.addItemsToBatch(
      batchGroupResponse.id,
      batchItems
    )

    console.info(`✅ [PaymentHandler] Items added to batch`)

    // STEP 6: Fetch batch items to get external IDs
    console.info(`[PaymentHandler] Step 6: Fetching batch items with external IDs`)

    const batchItemsResponse = await this.batchGroupItemService.getBatchItems(batchGroupResponse.id)

    console.info(`✅ [PaymentHandler] Retrieved ${batchItemsResponse.items.length} batch items from Airwallex`)

    // STEP 7: Store batch items in BatchGroupItemStore with external IDs
    console.info(`[PaymentHandler] Step 7: Persisting batch items`)

    for (const [engineerId, data] of engineerBatchItemMap) {
      // Find the matching external batch item by request_id
      const externalBatchItem = batchItemsResponse.items.find(item => item.request_id === data.requestId)

      if (!externalBatchItem) {
        console.error(`[PaymentHandler] Could not find external batch item for engineer ${engineerId} with request_id ${data.requestId}`)
        throw new Error(`Could not find external batch item for engineer ${engineerId}`)
      }

      const batchItem = await this.batchGroupItemStore.create({
        externalId: externalBatchItem.request_id,
        batchGroupId: batchGroup.id,
        engineerId,
        externalEngineerId: data.externalEngineerId,
        totalAmount: data.totalAmount,
        totalPlatformProfit: data.totalPlatformProfit,
        status: 'pending'
      })

      console.info(`[PaymentHandler] Batch item persisted for engineer ${engineerId} with external ID ${externalBatchItem.id}`)

      // Link all engineer transfers to this batch item
      await this.transferStore.updateBatchGroupItemId(data.transferIds, batchItem.id)

      console.info(`[PaymentHandler] Linked ${data.transferIds.length} transfers to batch item ${batchItem.id}`)
    }

    // STEP 8: Submit batch if there are items
    if (batchItems.length > 0) {
      console.info(`[PaymentHandler] Step 8: Submitting batch for processing`)

      await this.batchGroupService.submitBatchGroup(batchGroupResponse.id)

      // Update batch group status
      await this.batchGroupStore.update(batchGroup.id, {
        status: 'SCHEDULED'
      })

      console.info(`✅ [PaymentHandler] Batch submitted for processing`)
    }

    console.info(`✅ [PaymentHandler] Weekly batch transfer completed with ${batchItems.length} items`)
    return { success: true }
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

    // Calculate elapsed time in hours
    const startTime = ticket.claimedAt || ticket.createdAt
    const endTime = ticket.resolvedAt || ticket.markAsFixedAt || new Date()
    const elapsedMilliseconds = endTime.getTime() - startTime.getTime()
    const elapsedHours = elapsedMilliseconds / (1000 * 60 * 60)

    // Calculate number of credits (rounded up to nearest hour, max 2)
    const creditsUsed = Math.min(Math.ceil(elapsedHours), 2)

    console.info(`[PaymentHandler] Elapsed time: ${elapsedHours.toFixed(2)} hours, Credits used: ${creditsUsed}`)

    // Fetch paid invoices with product information
    const invoices = await this.invoiceService.fetchPaidInvoicesWithProducts(stripeCustomerId)

    if (invoices.length === 0) {
      throw new Error(`No paid invoices found for customer: ${stripeCustomerId}`)
    }

    // Allocate credits from invoices (FIFO - oldest first)
    // Invoices are already sorted by paidAt in ascending order
    const allocatedInvoiceLineItems: InvoiceLineItemWithProduct[] = []
    let remainingCreditsToAllocate = creditsUsed

    for (const invoice of invoices) {
      if (remainingCreditsToAllocate <= 0) break

      for (const lineItem of invoice.lineItems) {
        if (remainingCreditsToAllocate <= 0) break

        // Allocate up to the available credits from this line item
        const creditsToAllocateFromThisItem = Math.min(remainingCreditsToAllocate, lineItem.creditsFromLineItem)

        if (creditsToAllocateFromThisItem > 0) {
          allocatedInvoiceLineItems.push({
            ...lineItem,
            creditsFromLineItem: creditsToAllocateFromThisItem // Override with actual allocated amount
          })

          remainingCreditsToAllocate -= creditsToAllocateFromThisItem
        }
      }
    }

    if (remainingCreditsToAllocate > 0) {
      throw new Error(`Insufficient credits: need ${creditsUsed}, but only ${creditsUsed - remainingCreditsToAllocate} available from paid invoices`)
    }

    // Calculate total credit value from allocated line items
    const creditValue = allocatedInvoiceLineItems.reduce((sum, item) => {
      return sum + (item.creditsFromLineItem * item.creditPrice)
    }, 0)

    console.info(`[PaymentHandler] Allocated ${creditsUsed} credits from ${allocatedInvoiceLineItems.length} invoice line item(s), total value: ${creditValue} cents`)

    return {
      ticket,
      stripeCustomerId,
      creditsUsed,
      creditValue,
      allocatedInvoiceLineItems
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
    allocatedInvoiceLineItems: InvoiceLineItemWithProduct[]
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
    console.info(`[PaymentHandler] Credit value breakdown: ${params.allocatedInvoiceLineItems.map(item =>
      `${item.creditsFromLineItem} credits @ ${item.creditPrice} cents = ${item.creditsFromLineItem * item.creditPrice} cents`
    ).join(', ')}`)

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
