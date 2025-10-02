# Credit-Based Billing Flow for Unjam

This document describes the complete implementation of credit-based billing using Stripe's Credit Grants and Meter Events APIs.

## Billing Model

**Key Policies:**
- ✅ **No Overage Charges**: Customers cannot use more credits than allocated
- ✅ **No Rollover**: Credits expire at the end of each billing period
- ✅ **Fresh Start**: Each billing cycle starts with a fresh allocation of credits
- ✅ **Automatic Replenishment**: Old credits are voided and new credits granted when invoice is paid

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SETUP PHASE (One-time)                        │
├─────────────────────────────────────────────────────────────────┤
│ 1. Create Stripe Meter                                          │
│    - Name: "Ticket Completions"                                 │
│    - Event Name: "ticket_completed"                             │
│    - Aggregation: sum                                           │
│                                                                  │
│ 2. Create Stripe Product                                        │
│    - Name: "Unjam Support Credits"                              │
│    - Metadata: { credit_price: "1000" } // $10 per credit      │
│                                                                  │
│ 3. Create Metered Price                                         │
│    - Link to Meter: "ticket_completed"                          │
│    - Unit Amount: 1000 (cents) // $10 per ticket               │
│    - Currency: USD                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 CUSTOMER PURCHASE FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│ 1. Customer subscribes to plan                                  │
│    - Subscription created with metered price                    │
│    - Example: $100/month for 10 credits                         │
│                                                                  │
│ 2. Invoice is paid                                              │
│    ├─ Webhook: invoice.payment_succeeded                        │
│    ├─ BillingEventConverterStripe extracts invoice details:     │
│    │   • period from line item (not invoice level)              │
│    │   • periodStart & periodEnd as Date objects                │
│    ├─ BillingInvoiceStore persists invoice with periods         │
│    ├─ BillingEventHandler processes paid invoice                │
│    ├─ Fetches subscription from Stripe (for planName & price)   │
│    ├─ VOIDS all existing credit grants (no rollover)            │
│    └─ BillingCreditsStore creates NEW Credit Grant              │
│        • Amount: $100 (invoice amount)                          │
│        • Category: "paid"                                       │
│        • Applicability: metered prices only                     │
│        • Expires: invoice.periodEnd ⏰                          │
│        • Metadata: invoice_id, subscription_id, credits_count   │
│                                                                  │
│ 3. Customer now has fresh prepaid credits in Stripe ✅          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   CREDIT CONSUMPTION FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│ 1. Customer creates ticket                                      │
│    - Ticket stored in database                                  │
│    - Status: "waiting"                                          │
│                                                                  │
│ 2. Engineer claims and completes ticket                         │
│    - Customer marks ticket as complete                          │
│    - Status: "complete"                                         │
│                                                                  │
│ 3. Record usage to Stripe                                       │
│    ├─ BillingMeterStore.recordTicketCompletion()               │
│    ├─ Creates Stripe Meter Event:                              │
│    │   • event_name: "ticket_completed"                        │
│    │   • stripe_customer_id: customer.stripeId                 │
│    │   • value: 1 (one ticket completed)                       │
│    └─ Stripe stores event for billing period                   │
│                                                                  │
│ 4. Usage tracked but NOT billed yet ⏳                          │
│    - Stripe accumulates meter events                            │
│    - No immediate charge                                        │
│    - Credits continue to apply automatically                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  BILLING CYCLE END (Monthly)                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. Stripe aggregates all meter events                           │
│    - Example: Customer completed 8 tickets                      │
│    - Total usage: 8 tickets × $10 = $80                         │
│                                                                  │
│ 2. Stripe applies Credit Grants automatically                   │
│    - Available credits: $100                                    │
│    - Usage cost: $80                                            │
│    - Remaining credits: $20 (will expire)                       │
│                                                                  │
│ 3. Invoice generated                                            │
│    ├─ Subscription line item: $100 (prepaid credits)           │
│    ├─ Metered usage line item: $80 (tickets completed)         │
│    ├─ Credit applied: -$80                                      │
│    └─ Total due: $100 (just the subscription renewal)          │
│                                                                  │
│ 4. Customer pays invoice                                        │
│    ├─ Webhook: invoice.payment_succeeded                        │
│    ├─ Old credit grant VOIDED ($20 unused credits lost)        │
│    ├─ NEW credit grant created ($100 fresh credits)            │
│    └─ New expiration: next billing cycle end                   │
│                                                                  │
│ 5. ⚠️ What if customer exhausts credits?                       │
│    - UI prevents ticket creation when credits = 0              │
│    - Customer must wait for next billing cycle                 │
│    - No overage charges possible                               │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Components

### 1. Credit Grant Creation with Expiration (✅ Implemented)

**File**: `BillingEventHandler.ts`

**When**: Invoice payment succeeds
**What**:
1. Voids all existing credit grants (no rollover)
2. Creates new credit grant with expiration date
3. Expiration set to `invoice.periodEnd` (from line item period)

**How**:
```typescript
// Void old credits (no rollover)
await voidExistingCreditGrants(customerId)

// Use invoice's period end for credit expiration (from line item)
const expiresAt = Math.floor(invoice.periodEnd.getTime() / 1000)

// Create new credit grant with expiration
await creditsStore.create({
  customerId: invoice.customerId,
  name: `Credits for ${subscription.planName} - Invoice ${invoice.id}`,
  amount: {
    type: 'monetary',
    monetary: {
      value: invoice.amount,
      currency: 'usd'
    }
  },
  category: 'paid',
  applicability_config: {
    scope: {
      price_type: 'metered'
    }
  },
  expires_at: expiresAt, // ⏰ Expires at end of billing period (no rollover)
  metadata: {
    invoice_id: invoice.id,
    subscription_id: invoice.subscriptionId,
    credits_count: numberOfCredits.toString()
  }
})
```

### 2. Invoice Period Tracking (✅ Implemented)

**Files**: `types.ts`, `BillingEventConverterStripe.ts`, `BillingInvoiceStoreSupabase.ts`

**What**: Extracts and persists `period_start` and `period_end` from invoice line items
**Why**: Used to set credit expiration dates - represents the actual billing period covered by the invoice

**Flow**:
```typescript
// 1. Stripe webhook received: invoice.payment_succeeded
// 2. BillingEventConverterStripe extracts period from first line item
const firstLineItem = stripeInvoice.lines?.data[0]
const invoice = {
  ...
  periodStart: new Date(firstLineItem.period.start * 1000),
  periodEnd: new Date(firstLineItem.period.end * 1000)
}

// 3. BillingInvoiceStore persists to database as timestamps
await supabase.from('billing_invoices').insert({
  ...
  period_start: invoice.periodStart.toISOString(),
  period_end: invoice.periodEnd.toISOString()
})

// 4. BillingEventHandler uses invoice.periodEnd for credit expiration
const expiresAt = Math.floor(invoice.periodEnd.getTime() / 1000)
await creditsStore.create({ ..., expires_at: expiresAt })
```

### 3. Usage Recording (✅ Implemented)

**File**: `BillingMeterStore.ts`, `BillingMeterStoreStripe.ts`

**When**: Ticket is completed
**What**: Sends meter event to Stripe
**How**:
```typescript
await meterStore.recordTicketCompletion({
  customerId: customer.stripeCustomerId,
  ticketId: ticket.id,
  value: 1 // One ticket completed
})
```

**Integration Point** (TODO):
```typescript
// In your TicketManager or similar
async markAsComplete(ticketId: string): Promise<void> {
  // ... existing logic to update ticket status ...

  // Record usage to Stripe
  await billingMeterStore.recordTicketCompletion({
    customerId: ticket.customer.stripeCustomerId,
    ticketId: ticket.id
  })
}
```

## How Credits Work (No Overage/No Rollover Model)

### Automatic Application & Expiration

1. **During billing period**: Meter events accumulate, credits automatically apply
2. **At period end**: Stripe calculates total usage cost and applies available credits
3. **On next invoice payment**: Old credits voided, new credits granted with new expiration
4. **Unused credits**: Lost - no rollover to next cycle

### Example Scenarios

#### Scenario 1: Usage Within Credits
```
Month 1:
- Subscription: $100/month for 10 credits ($10/credit)
- Usage: 8 tickets completed ($80 value)
- Credits available: $100
- Credits expire: End of Month 1

Invoice at Month End:
- Subscription renewal: $100
- Metered usage: $80
- Credits applied: -$80
- Unused credits: $20 (will be voided)
- Total due: $100

Month 2 Start:
- Old $20 credits: VOIDED ❌
- New $100 credits: GRANTED ✅ (expires end of Month 2)
```

#### Scenario 2: Credits Exhausted (No Overage)
```
Month 1:
- Subscription: $100/month for 10 credits
- Usage: 10 tickets completed ($100 value)
- Credits available: $100

Invoice at Month End:
- Subscription renewal: $100
- Metered usage: $100
- Credits applied: -$100
- Remaining credits: $0
- Total due: $100

What if customer tries ticket #11?
- UI prevents ticket creation when credits = 0
- Customer must wait for Month 2 credits
- No backend validation needed - UI enforces limit
```

#### Scenario 3: Minimal Usage
```
Month 1:
- Subscription: $100/month for 10 credits
- Usage: 2 tickets completed ($20 value)
- Credits available: $100

Invoice at Month End:
- Subscription renewal: $100
- Metered usage: $20
- Credits applied: -$20
- Unused credits: $80 ❌ LOST (no rollover)
- Total due: $100

Month 2 Start:
- Fresh $100 credits (not $180!)
```

## Key Benefits of This Model

1. ✅ **Predictable Revenue**: No overage means customers always pay fixed amount
2. ✅ **Encourages Usage**: "Use it or lose it" motivates customers to use credits
3. ✅ **Simple Pricing**: No complex overage calculations or prorations
4. ✅ **Fresh Start**: Each cycle is independent, easier to reason about
5. ✅ **Stripe-Native**: Leverages Stripe's credit expiration features

## Database Schema Requirements

### Billing Invoices Table

The `billing_invoices` table stores period information for credit expiration:

```sql
CREATE TABLE billing_invoices (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  status invoice_status NOT NULL,
  amount INTEGER NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL, -- ⚠️ From line item period
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,   -- ⚠️ Used for credit expiration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Billing Subscriptions Table

```sql
CREATE TABLE billing_subscriptions (
  stripe_subscription_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  credit_price INTEGER NOT NULL,
  current_period_end INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Environment Variables

Required for the webhook function:

```env
STRIPE_API_KEY=sk_test_xxx
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_xxx
WEBHOOKS_ENABLE_STRIPE=true
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

## Testing

Run tests:
```bash
npm test supabase/functions/stripe-webhook/BillingCreditsStoreStripe.test.ts
npm test supabase/functions/stripe-webhook/BillingMeterStoreStripe.test.ts
```

## Next Steps for Full Integration

1. **UI: Display Credit Balance**:
   - Query Stripe Credit Balance Summary API
   - Show remaining credits in customer UI
   - Disable ticket creation button when credits = 0
   - Example UI code:
   ```typescript
   // Fetch credit balance
   const balance = await stripe.billing.creditBalanceSummary.retrieve({
     customer: customerId
   })

   const hasCredits = balance.ledger.available_balance > 0

   // Disable button if no credits
   <button disabled={!hasCredits}>
     Create Ticket {!hasCredits && '(No credits remaining)'}
   </button>
   ```

2. **Add Meter Event Recording**:
   - Integrate `BillingMeterStore` into ticket completion flow
   - Send meter events when tickets marked complete

3. **Configure Stripe Meter**:
   - See **[STRIPE_SETUP_GUIDE.md](./STRIPE_SETUP_GUIDE.md)** for complete CLI commands
   - Create the "ticket_completed" meter
   - Create metered price linked to meter
   - Update subscription creation to use metered price
   - Configure webhooks

## References

- **[Stripe Setup Guide](./STRIPE_SETUP_GUIDE.md)** - Complete CLI commands for setting up meters, products, and webhooks

- [Stripe Credit Grants API](https://docs.stripe.com/api/billing/credit-grant)
- [Stripe Meter Events API](https://docs.stripe.com/api/billing/meter-event)
- [Credits-Based Pricing Model Guide](https://docs.stripe.com/billing/subscriptions/usage-based/use-cases/credits-based-pricing-model)
- [Usage-Based Billing](https://docs.stripe.com/billing/subscriptions/usage-based)
