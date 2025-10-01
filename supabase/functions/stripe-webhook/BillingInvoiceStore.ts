import type { Invoice } from './types.ts'

/**
 * Interface for billing invoice persistence
 */
export interface BillingInvoiceStore {
  /**
   * Creates a new billing invoice record
   * @param invoice - The invoice data from the billing provider
   */
  create(invoice: Invoice): Promise<void>

  /**
   * Updates an existing billing invoice record
   * @param invoice - The updated invoice data
   */
  update(invoice: Invoice): Promise<void>

  /**
   * Fetches a billing invoice by its billing provider ID
   * @param invoiceId - The billing provider's invoice ID
   * @returns The invoice if found, undefined otherwise
   */
  fetch(invoiceId: string): Promise<Invoice | undefined>
}
