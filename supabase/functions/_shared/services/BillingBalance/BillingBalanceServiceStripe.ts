import type Stripe from 'stripe'
import type { BillingBalanceService, BalanceInfo } from './BillingBalanceService.ts'

/**
 * Stripe implementation of BillingBalanceService
 * Checks Stripe account balance to verify funds are available before transfers
 */
export class BillingBalanceServiceStripe implements BillingBalanceService {
  private stripe: Stripe

  constructor(stripe: Stripe) {
    this.stripe = stripe
  }

  /**
   * Gets the current balance from Stripe
   * Returns available and pending balances in USD
   *
   * @returns Balance information with available and pending amounts
   * @throws Error if balance check fails
   */
  async getBalance(): Promise<BalanceInfo> {
    console.info('[BillingBalanceServiceStripe] Fetching Stripe balance')

    try {
      const balance = await this.stripe.balance.retrieve()

      // Get USD balance (primary currency)
      const usdBalance = balance.available.find(b => b.currency === 'usd') || { amount: 0, currency: 'usd' }
      const usdPending = balance.pending.find(b => b.currency === 'usd') || { amount: 0, currency: 'usd' }

      const balanceInfo: BalanceInfo = {
        available: usdBalance.amount,
        pending: usdPending.amount,
        currency: 'usd'
      }

      console.info(`[BillingBalanceServiceStripe] Balance: available=$${(balanceInfo.available / 100).toFixed(2)}, pending=$${(balanceInfo.pending / 100).toFixed(2)}`)

      return balanceInfo
    } catch (err) {
      const error = err as Error
      console.error('[BillingBalanceServiceStripe] Failed to fetch balance:', error.message)
      throw new Error(`Failed to fetch Stripe balance: ${error.message}`)
    }
  }

  /**
   * Checks if sufficient funds are available in Stripe for a transfer
   *
   * @param amount - Amount in cents to check
   * @returns true if sufficient available balance exists
   * @throws Error if balance check fails
   */
  async hasAvailableBalance(amount: number): Promise<boolean> {
    console.info(`[BillingBalanceServiceStripe] Checking if ${amount} cents is available`)

    const balance = await this.getBalance()
    const hasBalance = balance.available >= amount

    console.info(`[BillingBalanceServiceStripe] Has sufficient balance: ${hasBalance} (available: ${balance.available}, needed: ${amount})`)

    return hasBalance
  }
}
