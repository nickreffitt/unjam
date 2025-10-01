/**
 * Domain types for billing events
 */

export type CustomerState = 'created' | 'updated' | 'deleted'

export interface Customer {
  id: string
  email: string | null
  name?: string | null
}

export interface CustomerEvent {
  state: CustomerState
  customer: Customer
}

export type SubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused'

export interface Subscription {
  id: string
  customerId: string
  status: SubscriptionStatus
  planName: string
  creditPrice: number
}

export type SubscriptionState = 'created' | 'updated' | 'deleted'

export interface SubscriptionEvent {
  state: SubscriptionState
  subscription: Subscription
}

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'

export interface Invoice {
  id: string
  customerId: string
  subscriptionId: string
  status: InvoiceStatus
  amount: number
}

export type InvoiceState = 'paid' | 'failed'

export interface InvoiceEvent {
  state: InvoiceState
  invoice: Invoice
}

export interface CheckoutSession {
  id: string
  customerId: string
}

export interface CheckoutSessionEvent {
  checkoutSession: CheckoutSession
}

export type BillingEvent = CustomerEvent | SubscriptionEvent | InvoiceEvent | CheckoutSessionEvent