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

┌─────────────────────────────────────────────────────────────────┐
│              SUBSCRIPTION CHANGES (Upgrade/Downgrade)            │
├─────────────────────────────────────────────────────────────────┤
│ UPGRADE (Immediate Effect)                                      │
│ ─────────────────────────────────────────────────────────────   │
│ Example: Starter ($50, 5 credits) → Popular ($100, 10 credits) │
│                                                                  │
│ 1. Customer initiates upgrade via UI                            │
│    - Stripe API called with proration_behavior: 'always_invoice'│
│                                                                  │
│ 2. Stripe immediately switches plan                             │
│    ├─ Webhook: customer.subscription.updated                    │
│    ├─ BillingEventHandler detects upgrade                       │
│    │   • Old creditPrice: 500 ($5 per credit)                  │
│    │   • New creditPrice: 1000 ($10 per credit)                │
│    │   • Old planName: "Starter"                               │
│    │   • New planName: "Popular"                               │
│    └─ VOIDS existing $50 credit grant ❌                       │
│                                                                  │
│ 3. Stripe creates prorated invoice                              │
│    - Prorated refund for unused Starter time: -$25             │
│    - Full charge for Popular plan: +$100                       │
│    - Total due: ~$75                                            │
│                                                                  │
│ 4. Invoice paid                                                 │
│    ├─ Webhook: invoice.payment_succeeded                        │
│    └─ Creates NEW $100 credit grant (10 credits) ✅            │
│        • Expires at new current_period_end                      │
│                                                                  │
│ DOWNGRADE (End of Period)                                       │
│ ─────────────────────────────────────────────────────────────   │
│ Example: Popular ($100, 10 credits) → Starter ($50, 5 credits) │
│                                                                  │
│ 1. Customer initiates downgrade via UI                          │
│    - Stripe API: billing_cycle_anchor: 'unchanged'              │
│    - Scheduled for current_period_end (e.g., Oct 10th)         │
│                                                                  │
│ 2. Subscription updated with future change                      │
│    ├─ Webhook: customer.subscription.updated                    │
│    ├─ BillingEventHandler updates database                      │
│    └─ NO credit changes (not an upgrade) ⏸️                    │
│                                                                  │
│ 3. Customer continues on Popular plan                           │
│    - Still has 10 credits available                             │
│    - Credits expire at Oct 10th (unchanged)                     │
│                                                                  │
│ 4. On Oct 10th (period end)                                     │
│    ├─ Popular credits expire naturally ⏰                       │
│    ├─ Invoice generated for Starter plan ($50)                 │
│    ├─ Invoice paid → invoice.payment_succeeded                  │
│    └─ Creates NEW $50 credit grant (5 credits) ✅              │
│                                                                  │
│ CANCELLATION (End of Period)                                    │
│ ─────────────────────────────────────────────────────────────   │
│ 1. Customer cancels subscription                                │
│    ├─ Webhook: customer.subscription.updated                    │
│    │   • cancel_at_period_end: true                             │
│    │   • current_period_end: Oct 10th                           │
│    └─ NO credit changes ⏸️                                     │
│                                                                  │
│ 2. Until Oct 10th                                               │
│    - Subscription remains active                                │
│    - Customer can use remaining credits                         │
│    - UI shows "Cancels on Oct 10th" warning                     │
│                                                                  │
│ 3. On Oct 10th (period end)                                     │
│    ├─ Credits expire naturally ⏰                               │
│    ├─ Webhook: customer.subscription.deleted                    │
│    └─ Subscription removed from database                        │
│                                                                  │
│ 4. After cancellation                                           │
│    - No new invoice generated                                   │
│    - No new credits granted                                     │
│    - Customer must resubscribe to continue                      │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Components

### 1. Subscription Change Tracking (✅ Implemented)

**Files**: `types.ts`, `BillingEventConverterStripe.ts`, `BillingSubscriptionStoreSupabase.ts`, `BillingEventHandler.ts`

**What**: Tracks subscription changes to handle upgrades, downgrades, and cancellations
**Why**: Different subscription changes require different credit management strategies

**Key Fields Added to Subscription**:
- `cancelAtPeriodEnd: boolean` - Whether subscription is set to cancel at period end
- `currentPeriodEnd: Date` - When the current billing period ends

**Upgrade Detection Logic**:
```typescript
// In BillingEventHandler.handleSubscriptionEvent()
const oldSubscription = await this.subscriptionStore.fetch(event.subscription.id)

// Detect upgrade: plan changed AND credit price increased
if (oldSubscription && this.isUpgrade(oldSubscription, event.subscription)) {
  // Void old credits immediately
  await this.voidExistingCreditGrants(event.subscription.customerId)
  // New credits granted when prorated invoice is paid
}

private isUpgrade(oldSub: Subscription, newSub: Subscription): boolean {
  return oldSub.planName !== newSub.planName &&
         newSub.creditPrice > oldSub.creditPrice
}
```

**Database Schema**:
```sql
ALTER TABLE billing_subscriptions
ADD COLUMN cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN current_period_end TIMESTAMP WITH TIME ZONE;
```

### 2. Credit Grant Creation with Expiration (✅ Implemented)

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

## Subscription Change Scenarios

### Upgrade Scenario (Mid-Cycle)
```
Starting State (Sept 15th):
- Current plan: Starter ($50/month, 5 credits)
- Subscription started: Sept 1st
- Current credits: $50 (expires Sept 30th)
- Credits used so far: 2 tickets ($20)
- Remaining credits: $30

Customer upgrades to Popular ($100/month, 10 credits):

Immediate Effects:
1. Stripe fires customer.subscription.updated webhook
2. BillingEventHandler detects upgrade:
   - Old creditPrice: 500, New creditPrice: 1000
   - Old planName: "Starter", New planName: "Popular"
3. Old $50 credit grant VOIDED ❌ (loses $30 unused credits)
4. Prorated invoice created:
   - Refund unused Starter time: -$25 (15 days)
   - Charge for Popular plan: +$100
   - Total due: $75
5. Invoice paid immediately
6. NEW $100 credit grant created ✅
   - Expires: Sept 30th (unchanged period end)
   - Full 10 credits available immediately

Result:
- Customer has 10 fresh credits
- Paid $125 total for September ($50 initial + $75 upgrade)
- Next renewal: Sept 30th for $100
```

### Downgrade Scenario (Mid-Cycle)
```
Starting State (Sept 15th):
- Current plan: Popular ($100/month, 10 credits)
- Subscription started: Sept 1st
- Current credits: $100 (expires Sept 30th)
- Credits used so far: 3 tickets ($30)
- Remaining credits: $70

Customer downgrades to Starter ($50/month, 5 credits):

Immediate Effects:
1. Stripe updates subscription with schedule_at: current_period_end
2. Webhook: customer.subscription.updated
3. BillingEventHandler updates database
4. NO upgrade detected (creditPrice decreased: 1000 → 500)
5. NO credit changes ⏸️

Until Sept 30th:
- Customer keeps using 10 credits
- Credits still expire Sept 30th
- Full access maintained

On Sept 30th (Period End):
1. Popular credits expire ($70 if unused lost) ❌
2. Invoice for Starter plan: $50
3. Invoice paid → invoice.payment_succeeded
4. NEW $50 credit grant (5 credits) ✅
   - Expires: Oct 30th

Result:
- Customer retains full access until Sept 30th
- Unused credits lost (no refund)
- Starts fresh with 5 credits on Oct 1st
- Total paid in Sept: $100 (original charge only)
```

### Cancellation Scenario
```
Starting State (Sept 15th):
- Current plan: Popular ($100/month, 10 credits)
- Current credits: $100 (expires Sept 30th)
- Credits used: 4 tickets ($40)
- Remaining: $60

Customer cancels subscription:

Immediate Effects:
1. Stripe sets cancel_at_period_end: true
2. Webhook: customer.subscription.updated
3. BillingEventHandler updates database:
   - cancelAtPeriodEnd: true
   - currentPeriodEnd: Sept 30th
4. NO upgrade detected
5. NO credit changes ⏸️

Until Sept 30th:
- Subscription status: "active" (but canceling)
- Customer can use remaining 6 credits
- UI shows: "Access until Sept 30th"
- No new invoice scheduled
- Full feature access maintained

On Sept 30th:
1. Credits expire ($60 if unused) ❌
2. Webhook: customer.subscription.deleted
3. Subscription removed from database
4. Access revoked

After Cancellation:
- No refund for unused time/credits
- Must resubscribe to continue service

Result:
- Customer keeps what they paid for
- No partial refunds
- Clean end at period boundary
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
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  current_period_end TIMESTAMP WITH TIME ZONE,
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
