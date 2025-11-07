import type Stripe from 'stripe'
import type { BillingInvoiceService, InvoiceWithProducts, InvoiceLineItemWithProduct } from './BillingInvoiceService.ts'

/**
 * Stripe implementation of BillingInvoiceService
 * Fetches paid invoices from Stripe with enriched product metadata
 */
export class BillingInvoiceServiceStripe implements BillingInvoiceService {
  private stripe: Stripe

  constructor(stripe: Stripe) {
    this.stripe = stripe
  }

  /**
   * Fetches all paid invoices from the last 365 days with enriched product data
   * For each invoice line item, retrieves the associated product to extract credit_price from metadata
   *
   * @param customerId - The Stripe customer ID
   * @returns Array of invoices with product information attached to line items
   */
  async fetchPaidInvoicesWithProducts(customerId: string): Promise<InvoiceWithProducts[]> {
    console.info(`[BillingInvoiceServiceStripe] Fetching paid invoices with products for customer: ${customerId}`)

    try {
      // Calculate 365 days ago
      const now = new Date()
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      const oneYearAgoTimestamp = Math.floor(oneYearAgo.getTime() / 1000)

      // Fetch all paid invoices from the last 365 days
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        status: 'paid',
        created: {
          gte: oneYearAgoTimestamp
        },
        limit: 100,
        expand: ['data.lines.data']
      })

      console.info(`[BillingInvoiceServiceStripe] Found ${invoices.data.length} paid invoices`)

      // Process each invoice and enrich with product data
      const enrichedInvoices: InvoiceWithProducts[] = []

      for (const invoice of invoices.data) {
        const lineItems: InvoiceLineItemWithProduct[] = []

        // Process each line item
        for (const lineItem of invoice.lines.data) {
          // Skip line items without pricing details
          if (!lineItem.pricing || lineItem.pricing.type !== 'price_details' || !lineItem.pricing.price_details) {
            console.warn(`[BillingInvoiceServiceStripe] Line item ${lineItem.id} has no pricing.price_details, skipping`)
            continue
          }

          // Get product ID from pricing.price_details.product
          const productId = lineItem.pricing.price_details.product

          if (!productId || typeof productId !== 'string') {
            console.warn(`[BillingInvoiceServiceStripe] Line item ${lineItem.id} has no product ID, skipping`)
            continue
          }

          // Fetch product to get credit_price from metadata
          const product = await this.stripe.products.retrieve(productId)

          const creditPriceMetadata = product.metadata?.credit_price

          if (!creditPriceMetadata) {
            console.warn(`[BillingInvoiceServiceStripe] Product ${productId} has no credit_price metadata, skipping`)
            continue
          }

          const creditPrice = parseInt(creditPriceMetadata, 10)
          if (creditPrice <= 0) {
            console.warn(`[BillingInvoiceServiceStripe] Invalid credit_price ${creditPrice} for product ${productId}, skipping`)
            continue
          }

          // Calculate credits: amount_paid / credit_price
          const amountPaid = lineItem.amount || 0
          const creditsFromLineItem = Math.floor(amountPaid / creditPrice)

          console.info(`[BillingInvoiceServiceStripe] Invoice ${invoice.id}, line item ${lineItem.id}: ${amountPaid} cents / ${creditPrice} = ${creditsFromLineItem} credits`)

          lineItems.push({
            invoiceId: invoice.id,
            lineItemId: lineItem.id,
            amountPaid,
            creditPrice,
            creditsFromLineItem,
            productId
          })
        }

        // Only include invoices that have valid line items with credit data
        if (lineItems.length > 0) {
          enrichedInvoices.push({
            invoiceId: invoice.id,
            customerId: invoice.customer as string,
            status: invoice.status || 'unknown',
            totalAmount: invoice.amount_paid || 0,
            paidAt: new Date((invoice.status_transitions?.paid_at || invoice.created) * 1000),
            lineItems
          })
        }
      }

      console.info(`✅ [BillingInvoiceServiceStripe] Processed ${enrichedInvoices.length} invoices with product data`)

      // Sort by paidAt (oldest first) for FIFO credit allocation
      enrichedInvoices.sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime())

      return enrichedInvoices
    } catch (err) {
      const error = err as Error
      console.error('[BillingInvoiceServiceStripe] Failed to fetch invoices with products:', error.message)
      throw new Error(`Failed to fetch invoices with products: ${error.message}`)
    }
  }
}
