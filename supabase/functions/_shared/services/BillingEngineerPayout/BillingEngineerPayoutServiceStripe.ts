import type Stripe from 'stripe'
import type { BillingEngineerPayoutService, CreateTransferParams, TransferResult } from './BillingEngineerPayoutService.ts'

/**
 * Default payout amount for engineers (in cents)
 * $3.50 per ticket
 */
const DEFAULT_PAYOUT_AMOUNT = 350

/**
 * Stripe implementation of BillingEngineerPayoutService
 * Manages transfers from platform balance to engineer Connect accounts
 */
export class BillingEngineerPayoutServiceStripe implements BillingEngineerPayoutService {
  private stripe: Stripe

  constructor(stripe: Stripe) {
    this.stripe = stripe
  }

  /**
   * Creates a transfer to pay an engineer for completing a ticket
   * Fetches the engineer's payout amount from their Connect account metadata
   * and creates a transfer to their account
   *
   * @param params - Transfer parameters
   * @returns Transfer result with Stripe transfer ID and platform profit
   * @throws Error if Connect account not found or transfer fails
   */
  async createTransfer(params: CreateTransferParams): Promise<TransferResult> {
    const { ticketId, engineerId, engineerConnectAccountId, customerId, creditValue } = params

    console.info(`[BillingEngineerPayoutServiceStripe] Creating transfer for ticket: ${ticketId}, engineer: ${engineerId}`)

    try {
      // 1. Fetch payout amount from Connect account metadata
      const payoutAmount = await this.fetchPayoutAmount(engineerConnectAccountId)

      console.info(`[BillingEngineerPayoutServiceStripe] Payout amount: ${payoutAmount} cents ($${(payoutAmount / 100).toFixed(2)})`)

      // 2. Validate that credit value covers payout
      if (creditValue < payoutAmount) {
        throw new Error(`Credit value (${creditValue}) is less than payout amount (${payoutAmount})`)
      }

      // 3. Create transfer to engineer's Connect account
      const transfer = await this.stripe.transfers.create({
        amount: payoutAmount,
        currency: 'usd',
        destination: engineerConnectAccountId,
        metadata: {
          ticket_id: ticketId,
          engineer_id: engineerId,
          customer_id: customerId,
          credit_value: creditValue.toString()
        }
      })

      // 4. Calculate platform profit
      const platformProfit = creditValue - payoutAmount

      console.info(`✅ [BillingEngineerPayoutServiceStripe] Transfer created: ${transfer.id}, amount: ${payoutAmount}, profit: ${platformProfit}`)

      return {
        transferId: transfer.id,
        amount: payoutAmount,
        platformProfit
      }
    } catch (err) {
      const error = err as Error
      console.error('[BillingEngineerPayoutServiceStripe] Failed to create transfer:', error.message)
      throw new Error(`Failed to create engineer transfer: ${error.message}`)
    }
  }

  /**
   * Fetches the configured payout amount for an engineer
   * Reads from Connect account metadata with fallback to default
   *
   * @param connectAccountId - Engineer's Stripe Connect account ID
   * @returns Payout amount in cents (defaults to 350 = $3.50)
   */
  async fetchPayoutAmount(connectAccountId: string): Promise<number> {
    console.info(`[BillingEngineerPayoutServiceStripe] Fetching payout amount for account: ${connectAccountId}`)

    try {
      const account = await this.stripe.accounts.retrieve(connectAccountId)

      // Check for payout_amount in metadata
      const payoutAmountStr = account.metadata?.payout_amount

      if (payoutAmountStr) {
        const payoutAmount = parseInt(payoutAmountStr, 10)

        if (isNaN(payoutAmount) || payoutAmount <= 0) {
          console.warn(`[BillingEngineerPayoutServiceStripe] Invalid payout_amount in metadata: ${payoutAmountStr}, using default`)
          return DEFAULT_PAYOUT_AMOUNT
        }

        console.info(`[BillingEngineerPayoutServiceStripe] Found payout amount: ${payoutAmount}`)
        return payoutAmount
      }

      console.info(`[BillingEngineerPayoutServiceStripe] No payout_amount in metadata, using default: ${DEFAULT_PAYOUT_AMOUNT}`)
      return DEFAULT_PAYOUT_AMOUNT
    } catch (err) {
      const error = err as Error
      console.error('[BillingEngineerPayoutServiceStripe] Failed to fetch payout amount:', error.message)
      throw new Error(`Failed to fetch payout amount: ${error.message}`)
    }
  }
}
