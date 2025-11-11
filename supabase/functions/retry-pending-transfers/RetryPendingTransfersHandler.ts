import type { BillingEngineerTransferStore } from "@stores/BillingEngineerTransfer/index.ts";
import type { BillingEngineerStore } from "@stores/BillingEngineer/index.ts";
import type { BillingEngineerPayoutService } from "@services/BillingEngineerPayout/index.ts";
import type { BillingBalanceService } from "@services/BillingBalance/index.ts";

/**
 * Result summary from processing pending transfers
 */
export interface RetryResult {
  processed: number;
  completed: number;
  stillPending: number;
  errors: number;
}

/**
 * Handler for retrying pending_funds transfers
 * Attempts to create Stripe transfers when sufficient balance becomes available
 */
export class RetryPendingTransfersHandler {
  private readonly transferStore: BillingEngineerTransferStore
  private readonly engineerStore: BillingEngineerStore
  private readonly payoutService: BillingEngineerPayoutService
  private readonly balanceService: BillingBalanceService

  constructor(
    transferStore: BillingEngineerTransferStore,
    engineerStore: BillingEngineerStore,
    payoutService: BillingEngineerPayoutService,
    balanceService: BillingBalanceService
  ) {
    this.transferStore = transferStore
    this.engineerStore = engineerStore
    this.payoutService = payoutService
    this.balanceService = balanceService
  }

  /**
   * Processes all pending_funds transfers and attempts to complete them
   * @returns Summary of processing results
   */
  async processPendingTransfers(): Promise<RetryResult> {
    console.info('[RetryPendingTransfersHandler] Starting retry process')

    // Fetch all pending_funds transfers
    const pendingTransfers = await this.transferStore.fetchByStatus('pending_funds')

    if (pendingTransfers.length === 0) {
      console.info('[RetryPendingTransfersHandler] No pending transfers found')
      return { processed: 0, completed: 0, stillPending: 0, errors: 0 }
    }

    console.info(`[RetryPendingTransfersHandler] Found ${pendingTransfers.length} pending transfers`)

    let completed = 0
    let stillPending = 0
    let errors = 0

    // Process each pending transfer
    for (const transfer of pendingTransfers) {
      try {
        console.info(`[RetryPendingTransfersHandler] Processing transfer ${transfer.id} for ticket ${transfer.ticketId}`)

        // Fetch engineer account
        const engineerAccount = await this.engineerStore.getByProfileId(transfer.engineerId)
        if (!engineerAccount) {
          console.error(`[RetryPendingTransfersHandler] Engineer account not found for ${transfer.engineerId}`)
          errors++
          continue
        }

        // Check if balance is now available
        const hasBalance = await this.balanceService.hasAvailableBalance(transfer.amount)

        if (!hasBalance) {
          console.info(`[RetryPendingTransfersHandler] Still insufficient balance for transfer ${transfer.id}`)
          stillPending++
          continue
        }

        console.info(`[RetryPendingTransfersHandler] Sufficient balance available, creating transfer`)

        // Create the transfer
        const transferResult = await this.payoutService.createTransfer({
          ticketId: transfer.ticketId,
          engineerId: transfer.engineerId,
          engineerConnectAccountId: engineerAccount.id,
          customerId: transfer.customerId,
          creditValue: transfer.creditValue
        })

        // Update transfer record to completed
        await this.transferStore.update(transfer.id, {
          stripeTransferId: transferResult.transferId,
          status: 'completed',
          availableForTransferAt: new Date()
        })

        console.info(`✅ [RetryPendingTransfersHandler] Transfer ${transfer.id} completed: ${transferResult.transferId}`)
        completed++

      } catch (err) {
        const error = err as Error
        console.error(`[RetryPendingTransfersHandler] Error processing transfer ${transfer.id}:`, error.message)

        // Update transfer with error
        try {
          await this.transferStore.update(transfer.id, {
            status: 'failed',
            errorMessage: `Retry failed: ${error.message}`
          })
        } catch (updateError) {
          console.error(`[RetryPendingTransfersHandler] Failed to update error status:`, updateError)
        }

        errors++
      }
    }

    console.info(`[RetryPendingTransfersHandler] Retry complete: ${completed} completed, ${stillPending} still pending, ${errors} errors`)

    return {
      processed: pendingTransfers.length,
      completed,
      stillPending,
      errors
    }
  }
}
