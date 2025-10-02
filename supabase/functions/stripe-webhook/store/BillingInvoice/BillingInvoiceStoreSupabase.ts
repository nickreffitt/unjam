import { createClient, type SupabaseClient } from 'supabase'
import type { BillingInvoiceStore } from './BillingInvoiceStore.ts'
import type { Invoice } from '@types'

/**
 * Supabase implementation of BillingInvoiceStore
 */
export class BillingInvoiceStoreSupabase implements BillingInvoiceStore {
  private supabase: SupabaseClient

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey)
  }

  /**
   * Creates a new billing invoice record
   * @param invoice - The invoice data from the billing provider
   */
  async create(invoice: Invoice): Promise<void> {
    console.info(`[BillingInvoiceStoreSupabase] Creating billing invoice: ${invoice.id}`)

    // Insert the billing invoice record
    const { error: insertError } = await this.supabase
      .from('billing_invoices')
      .insert({
        stripe_invoice_id: invoice.id,
        stripe_customer_id: invoice.customerId,
        stripe_subscription_id: invoice.subscriptionId,
        status: invoice.status,
        amount: invoice.amount,
        period_start: invoice.periodStart.toISOString(),
        period_end: invoice.periodEnd.toISOString()
      })

    if (insertError) {
      console.error(`[BillingInvoiceStoreSupabase] Error creating billing invoice:`, insertError)
      throw new Error(`Failed to create billing invoice: ${insertError.message}`)
    }

    console.info(`[BillingInvoiceStoreSupabase] Successfully created billing invoice ${invoice.id}`)
  }

  /**
   * Updates an existing billing invoice record
   * @param invoice - The updated invoice data
   */
  async update(invoice: Invoice): Promise<void> {
    console.info(`[BillingInvoiceStoreSupabase] Updating billing invoice: ${invoice.id}`)

    const { error } = await this.supabase
      .from('billing_invoices')
      .update({
        status: invoice.status,
        amount: invoice.amount,
        period_start: invoice.periodStart.toISOString(),
        period_end: invoice.periodEnd.toISOString()
      })
      .eq('stripe_invoice_id', invoice.id)

    if (error) {
      console.error(`[BillingInvoiceStoreSupabase] Error updating billing invoice:`, error)
      throw new Error(`Failed to update billing invoice: ${error.message}`)
    }

    console.info(`[BillingInvoiceStoreSupabase] Successfully updated billing invoice ${invoice.id}`)
  }

  /**
   * Fetches a billing invoice by its billing provider ID
   * @param invoiceId - The billing provider's invoice ID
   * @returns The invoice if found, undefined otherwise
   */
  async fetch(invoiceId: string): Promise<Invoice | undefined> {
    console.info(`[BillingInvoiceStoreSupabase] Fetching billing invoice: ${invoiceId}`)

    const { data, error } = await this.supabase
      .from('billing_invoices')
      .select('stripe_invoice_id, stripe_customer_id, stripe_subscription_id, status, amount, period_start, period_end')
      .eq('stripe_invoice_id', invoiceId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        console.info(`[BillingInvoiceStoreSupabase] Billing invoice not found: ${invoiceId}`)
        return undefined
      }
      console.error(`[BillingInvoiceStoreSupabase] Error fetching billing invoice:`, error)
      throw new Error(`Failed to fetch billing invoice: ${error.message}`)
    }

    console.info(`[BillingInvoiceStoreSupabase] Found billing invoice ${invoiceId}`)
    return {
      id: data.stripe_invoice_id,
      customerId: data.stripe_customer_id,
      subscriptionId: data.stripe_subscription_id,
      status: data.status,
      amount: data.amount,
      periodStart: new Date(data.period_start),
      periodEnd: new Date(data.period_end)
    }
  }
}
