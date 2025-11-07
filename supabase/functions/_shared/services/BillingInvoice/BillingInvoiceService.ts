/**
 * Represents an invoice line item with associated product information
 */
export interface InvoiceLineItemWithProduct {
  invoiceId: string
  lineItemId: string
  amountPaid: number // Amount paid for this line item in cents
  creditPrice: number // Credit price from product metadata in cents
  creditsFromLineItem: number // Calculated credits: amountPaid / creditPrice
  productId: string
}

/**
 * Represents a paid invoice with enriched product data
 */
export interface InvoiceWithProducts {
  invoiceId: string
  customerId: string
  status: string
  totalAmount: number
  paidAt: Date
  lineItems: InvoiceLineItemWithProduct[]
}

/**
 * Service for fetching invoice data with product information from billing provider
 * Used for calculating payment amounts and platform profit in one-time credit purchase model
 */
export interface BillingInvoiceService {
  /**
   * Fetches all paid invoices from the last 365 days with enriched product data
   * For each invoice line item, retrieves the associated product to extract credit_price from metadata
   *
   * @param customerId - The billing provider's customer ID
   * @returns Array of invoices with product information attached to line items
   */
  fetchPaidInvoicesWithProducts(customerId: string): Promise<InvoiceWithProducts[]>
}
