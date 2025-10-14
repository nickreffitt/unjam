# Credit-Based Billing Flow for Unjam

This document describes the complete implementation of credit-based billing using Stripe's Meter Events API for usage-based billing.

## Naming Conventions

This project follows a consistent naming pattern for billing-related code:

**Services** (Business logic, Stripe API calls):
- Location: `supabase/functions/_shared/services/[Feature]/`
- Pattern: `Billing[Feature]Service.ts` (interface), `Billing[Feature]ServiceStripe.ts` (implementation)
- Examples: `BillingCreditsServiceStripe`, `BillingMeterServiceStripe`, `BillingSubscriptionServiceStripe`

**Stores** (Data persistence, Supabase operations):
- Location: `supabase/functions/_shared/stores/[Feature]/`
- Pattern: `Billing[Feature]Store.ts` (interface), `Billing[Feature]StoreSupabase.ts` (implementation)
- Examples: `BillingCustomerStoreSupabase`, `BillingInvoiceStoreSupabase`, `BillingSubscriptionStoreSupabase`

**Events** (Webhook event conversion):
- Location: `supabase/functions/_shared/events/`
- Pattern: `BillingEventConverter[Provider].ts`
- Examples: `BillingEventConverterStripe`, `BillingEventConverterLocal`

**Handlers** (Webhook orchestration):
- Location: `supabase/functions/[webhook-name]/`
- Pattern: `BillingEventHandler.ts`
- Example: `customer-billing-webhook/BillingEventHandler.ts`

**Database Tables**:
- Pattern: `billing_[entity]` (snake_case)
- Examples: `billing_customers`, `billing_invoices`, `billing_subscriptions`, `engineer_transfers`

## Billing Model

**Unjam operates as a marketplace connecting customers with engineers for technical support.**

**Customer Billing (Usage-Based with Credit Limits):**
- ✅ **No Overage Charges**: Customers cannot use more credits than allocated (enforced by UI)
- ✅ **No Rollover**: Each billing period starts with fresh credit allocation
- ✅ **Meter-Based Tracking**: Usage tracked via Stripe Meters, automatically billed at period end
- ✅ **Simple Model**: Subscribe → Use credits → Billed for usage at month end

**Engineer Payouts (Marketplace Model):**
- ✅ **Stripe Connect Express**: Engineers onboard via Express Connect accounts for quick setup
- ✅ **Fixed Payout**: Engineers receive a configurable fixed amount per ticket (default: $3.50)
- ✅ **Separate Transfers**: Unjam transfers funds to engineer accounts when tickets complete
- ✅ **Platform Revenue**: Unjam retains the difference between credit value and engineer payout

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
│    - Example: $100/month base + metered usage                   │
│    - Plan metadata stores credit allocation (e.g., 10 credits)  │
│                                                                  │
│ 2. Invoice is paid                                              │
│    ├─ Webhook: invoice.payment_succeeded                        │
│    ├─ BillingEventConverterStripe extracts invoice details      │
│    ├─ BillingInvoiceStoreSupabase persists invoice             │
│    └─ No credit grants created (using meters instead)           │
│                                                                  │
│ 3. Customer can now create tickets within credit limit ✅       │
│    - Credit balance calculated: plan allocation - meter usage   │
│    - UI enforces limit by checking available credits            │
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
│    ├─ BillingMeterServiceStripe.recordTicketCompletion()       │
│    ├─ Creates Stripe Meter Event:                              │
│    │   • event_name: "ticket_completed"                        │
│    │   • stripe_customer_id: customer.stripeId                 │
│    │   • value: 1 (one ticket completed)                       │
│    └─ Stripe stores event for billing period                   │
│                                                                  │
│ 4. Pay engineer via Stripe Connect                             │
│    ├─ Fetch engineer's payout amount from Connect account      │
│    │   • Default: $3.50 (350 cents)                            │
│    │   • Configurable per engineer in account metadata         │
│    ├─ Create Stripe Transfer:                                  │
│    │   • amount: 350 (engineer's fixed payout)                 │
│    │   • destination: engineer.stripeConnectAccountId          │
│    │   • metadata: ticket_id, engineer_id, customer_id         │
│    └─ Unjam retains difference as platform revenue 💰          │
│        • Example: $7 credit value - $3.50 payout = $3.50 profit│
│                                                                  │
│ 5. Usage tracked but NOT billed yet ⏳                          │
│    - Stripe accumulates meter events                            │
│    - No immediate charge to customer                            │
│    - Credits continue to apply automatically                    │
│    - Engineer paid immediately from platform balance            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  BILLING CYCLE END (Monthly)                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. Stripe aggregates all meter events                           │
│    - Example: Customer completed 8 tickets                      │
│    - Total usage: 8 tickets × $10 = $80                         │
│                                                                  │
│ 2. Invoice generated                                            │
│    ├─ Subscription line item: $100 (base fee for 10 credits)   │
│    ├─ Metered usage line item: $80 (8 tickets completed)       │
│    └─ Total due: $180 (base + usage)                           │
│                                                                  │
│ 3. Customer pays invoice                                        │
│    ├─ Webhook: invoice.payment_succeeded                        │
│    ├─ BillingInvoiceStoreSupabase persists invoice             │
│    └─ New billing period starts with fresh 10 credits          │
│                                                                  │
│ 4. ⚠️ What if customer exhausts credits?                       │
│    - UI prevents ticket creation when credits = 0              │
│    - Customer must wait for next billing cycle                 │
│    - No overage charges possible (UI enforced)                 │
│                                                                  │
│ NOTE: In this model, customers pay for both:                    │
│  • Base subscription ($100 for credit allocation)               │
│  • Actual usage ($80 for 8 tickets used)                        │
│ This differs from prepaid credit grants where usage is          │
│ automatically deducted from prepaid balance.                     │
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
│    ├─ BillingEventHandler updates subscription in database      │
│    │   • Old creditPrice: 500 ($5 per credit)                  │
│    │   • New creditPrice: 1000 ($10 per credit)                │
│    │   • Old planName: "Starter"                               │
│    │   • New planName: "Popular"                               │
│    └─ No credit grant operations needed ✅                     │
│                                                                  │
│ 3. Stripe creates prorated invoice                              │
│    - Prorated refund for unused Starter time: -$25             │
│    - Full charge for Popular plan: +$100                       │
│    - Metered usage up to upgrade: charged at Starter rate      │
│    - Total due: ~$75 + usage                                    │
│                                                                  │
│ 4. Invoice paid                                                 │
│    ├─ Webhook: invoice.payment_succeeded                        │
│    └─ Customer now has 10 credits available (Popular plan)     │
│        • Credit allocation updated via subscription metadata    │
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
│    └─ NO immediate changes ⏸️                                  │
│                                                                  │
│ 3. Customer continues on Popular plan                           │
│    - Still has 10 credits available in current period           │
│    - Can use all 10 credits until Oct 10th                      │
│                                                                  │
│ 4. On Oct 10th (period end)                                     │
│    ├─ Invoice generated for Starter plan ($50 + usage)         │
│    ├─ Invoice paid → invoice.payment_succeeded                  │
│    └─ Next period: Customer has 5 credits (Starter allocation) │
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

**Files**: `_shared/types.ts`, `_shared/events/BillingEventConverterStripe.ts`, `_shared/stores/BillingSubscription/BillingSubscriptionStoreSupabase.ts`, `customer-billing-webhook/BillingEventHandler.ts`

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

### 2. Credit Balance Calculation (✅ Implemented)

**Files**: `_shared/services/BillingCredits/BillingCreditsServiceStripe.ts`

**When**: Customer checks credit balance
**What**: Calculates available credits from subscription allocation minus meter usage
**How**:
```typescript
// BillingCreditsServiceStripe.ts
async fetchCreditBalance(subscription: Subscription, customerId: string): Promise<CreditBalance> {
  // 1. Get subscription period boundaries
  const stripeSubscription = await this.stripe.subscriptions.retrieve(subscription.id)

  // 2. Find the meter
  const meters = await this.stripe.billing.meters.list({ limit: 100 })
  const meter = meters.data.find(m => m.event_name === 'ticket_completed')

  // 3. Get meter usage for current billing period
  const eventSummaries = await this.stripe.billing.meters.listEventSummaries(
    meter.id,
    {
      customer: customerId,
      start_time: stripeSubscription.current_period_start,
      end_time: stripeSubscription.current_period_end
    }
  )

  // 4. Calculate usage
  const usedCredits = eventSummaries.data.reduce((sum, summary) => {
    return sum + (summary.aggregated_value || 0)
  }, 0)

  // 5. Calculate allocation from subscription
  const firstItem = stripeSubscription.items.data[0]
  const recurringAmount = firstItem?.price.unit_amount || 0
  const totalCredits = Math.floor(recurringAmount / subscription.creditPrice)
  const availableCredits = Math.max(0, totalCredits - usedCredits)

  return { availableCredits, usedCredits, totalCredits, creditPrice }
}
```

### 3. Invoice Period Tracking (✅ Implemented)

**Files**: `_shared/types.ts`, `_shared/events/BillingEventConverterStripe.ts`, `_shared/stores/BillingInvoice/BillingInvoiceStoreSupabase.ts`

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

// 3. BillingInvoiceStoreSupabase persists to database as timestamps
await supabase.from('billing_invoices').insert({
  ...
  period_start: invoice.periodStart.toISOString(),
  period_end: invoice.periodEnd.toISOString()
})

// 4. BillingEventHandler uses invoice.periodEnd for credit expiration
const expiresAt = Math.floor(invoice.periodEnd.getTime() / 1000)
await creditsService.create({ ..., expires_at: expiresAt })
```

### 4. Usage Recording (✅ Implemented)

**Files**: `_shared/services/BillingMeter/BillingMeterService.ts`, `_shared/services/BillingMeter/BillingMeterServiceStripe.ts`

**When**: Ticket is completed
**What**: Sends meter event to Stripe
**How**:
```typescript
await meterService.recordTicketCompletion({
  customerId: customer.stripeCustomerId,
  ticketId: ticket.id,
  value: 1 // One ticket completed
})
```

### 5. Engineer Payout via Stripe Connect (✅ Implemented)

**Files**: `_shared/services/EngineerPayout/EngineerPayoutService.ts`, `_shared/services/EngineerPayout/EngineerPayoutServiceStripe.ts` (to be created)

**When**: Ticket is marked as complete
**What**: Transfers fixed payout amount to engineer's Stripe Connect Express account
**Why**: Unjam operates as a marketplace - engineers earn money when completing tickets

**Engineer Onboarding**:
```typescript
// EngineerPayoutServiceStripe.ts
async onboardEngineer(engineerId: string, email: string): Promise<string> {
  // Create Stripe Connect Express account for engineer
  const account = await this.stripe.accounts.create({
    type: 'express',
    country: 'US',
    email,
    metadata: {
      engineer_id: engineerId,
      payout_amount: '350', // $3.50 default, configurable per engineer
      payout_currency: 'usd'
    },
    capabilities: {
      transfers: { requested: true }
    }
  });

  // Return account ID to be stored in engineers table
  return account.id;
}
```

**Payout on Ticket Completion**:
```typescript
// EngineerPayoutServiceStripe.ts
async payEngineer(
  ticketId: string,
  engineerId: string,
  engineerConnectAccountId: string,
  customerId: string,
  creditValue: number
): Promise<{ transferId: string; platformProfit: number }> {
  // 1. Fetch engineer's Connect account to get payout amount
  const account = await this.stripe.accounts.retrieve(engineerConnectAccountId);
  const payoutAmount = parseInt(account.metadata.payout_amount || '350');

  // 2. Create transfer to engineer's Connect account
  const transfer = await this.stripe.transfers.create({
    amount: payoutAmount, // e.g., 350 = $3.50
    currency: 'usd',
    destination: engineerConnectAccountId,
    metadata: {
      ticket_id: ticketId,
      engineer_id: engineerId,
      customer_id: customerId,
      credit_value: creditValue.toString() // e.g., 700 = $7.00
    }
  });

  // 3. Calculate platform profit
  const platformProfit = creditValue - payoutAmount;
  // Example: 700 - 350 = 350 ($3.50 profit)

  return {
    transferId: transfer.id,
    platformProfit
  };
}
```

**Integration Point** (TODO):
```typescript
// In your TicketManager or similar
async markAsComplete(ticketId: string): Promise<void> {
  // ... existing logic to update ticket status ...

  // 1. Record usage to Stripe (deducts customer credit)
  await billingMeterService.recordTicketCompletion({
    customerId: ticket.customer.stripeCustomerId,
    ticketId: ticket.id
  });

  // 2. Pay engineer via Stripe Connect
  const { transferId, platformProfit } = await engineerPayoutService.payEngineer(
    ticket.id,
    engineer.id,
    engineer.stripeConnectAccountId,
    ticket.customerId,
    ticket.creditValue // e.g., 700 cents = $7.00
  );

  // 3. Record transfer in audit table
  await engineerTransferStore.create({
    ticketId: ticket.id,
    engineerId: engineer.id,
    customerId: ticket.customerId,
    stripeTransferId: transferId,
    amount: payoutAmount,
    creditValue: ticket.creditValue,
    platformProfit,
    status: 'completed'
  });
}
```

## How Credits Work (Usage-Based Model with Credit Limits)

### Usage Tracking & Billing

1. **During billing period**: Meter events accumulate, tracking actual usage
2. **Credit enforcement**: UI checks available balance (allocation - usage) before allowing ticket creation
3. **At period end**: Stripe generates invoice with base subscription + metered usage charges
4. **Next billing period**: Fresh credit allocation starts (based on subscription plan)

### Example Scenarios

#### Scenario 1: Usage Within Limit (Marketplace Economics)
```
Month 1:
- Subscription: $100/month for 10 credit allocation ($10/credit value)
- Usage: 8 tickets completed
- Available credits: 10 - 8 = 2 remaining

Engineer Payouts (Immediate via Stripe Connect):
- 8 tickets × $3.50 = $28 transferred to engineers
- Paid from Unjam's Stripe balance

Invoice at Month End:
- Subscription base: $100 (for 10 credit allocation)
- Metered usage: 8 tickets × $10 = $80
- Total customer pays: $180

Platform Revenue Breakdown:
- Customer paid: $180 total
- Engineer costs: $28
- Unjam profit: $180 - $28 = $152 💰

Month 2 Start:
- Fresh 10 credit allocation
- Meter resets (new billing period)
```

#### Scenario 2: Credit Limit Reached (No Overage)
```
Month 1:
- Subscription: $100/month for 10 credit allocation
- Usage: 10 tickets completed
- Available credits: 10 - 10 = 0 remaining

Engineer Payouts:
- 10 tickets × $3.50 = $35 transferred to engineers

Invoice at Month End:
- Subscription base: $100
- Metered usage: 10 tickets × $10 = $100
- Total customer pays: $200

Platform Revenue Breakdown:
- Customer paid: $200 total
- Engineer costs: $35
- Unjam profit: $200 - $35 = $165 💰

What if customer tries ticket #11?
- UI prevents ticket creation when availableCredits = 0
- Customer must wait for Month 2
- No overage charges possible (UI enforced)
```

#### Scenario 3: Minimal Usage
```
Month 1:
- Subscription: $100/month for 10 credit allocation
- Usage: 2 tickets completed
- Available credits: 10 - 2 = 8 unused

Engineer Payouts:
- 2 tickets × $3.50 = $7 transferred to engineers

Invoice at Month End:
- Subscription base: $100
- Metered usage: 2 tickets × $10 = $20
- Total customer pays: $120

Platform Revenue Breakdown:
- Customer paid: $120 total
- Engineer costs: $7
- Unjam profit: $120 - $7 = $113 💰

Month 2 Start:
- Fresh 10 credit allocation (unused credits from Month 1 don't carry over)

Platform Economics:
- Customer pays for base subscription regardless of usage
- Actual usage charged separately via metered pricing
- Lower usage = lower total cost for customer compared to credit grant model
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

**Customer Benefits:**
1. ✅ **Pay for What You Use**: Only charged for actual usage + base subscription
2. ✅ **No Prepayment Waste**: Lower usage = lower total cost (unlike prepaid credits)
3. ✅ **Simple Pricing**: Clear base fee + usage-based charges
4. ✅ **Protected from Overages**: UI enforces credit limits - can't go over allocation

**Platform Benefits:**
1. ✅ **Marketplace Revenue**: Unjam earns from both subscription and usage charges, minus engineer payouts
2. ✅ **Simpler Implementation**: No credit grant management - just record meter events
3. ✅ **Flexible Margins**: Engineer payouts are configurable per account
4. ✅ **Stripe-Native**: Leverages Stripe's metering and Connect features
5. ✅ **Immediate Payouts**: Engineers paid instantly via Stripe transfers when tickets complete
6. ✅ **Better for Customers**: They don't lose money on unused credits

**Example Profit Margins:**
- Starter Plan: $35/month base, 5 credit allocation at $7 each
  - Full usage (5 tickets): $35 + $35 = $70 revenue, $17.50 engineer cost = $52.50 profit
  - Low usage (2 tickets): $35 + $14 = $49 revenue, $7 engineer cost = $42 profit
- Enterprise Plan: $245/month base, 35 credit allocation at $7 each
  - Full usage (35 tickets): $245 + $245 = $490 revenue, $122.50 engineer cost = $367.50 profit

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

### Engineers Table (Stripe Connect)

```sql
CREATE TABLE engineers (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  stripe_connect_account_id TEXT UNIQUE, -- Express Connect account
  payout_amount INTEGER NOT NULL DEFAULT 350, -- $3.50 in cents, configurable
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Payout amount can also be stored in Stripe Connect account metadata
-- This local field provides faster access and caching
```

### Engineer Transfers Table (Audit Trail)

```sql
CREATE TABLE engineer_transfers (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  engineer_id UUID NOT NULL REFERENCES engineers(id),
  customer_id UUID NOT NULL,
  stripe_transfer_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL, -- Engineer payout amount in cents
  credit_value INTEGER NOT NULL, -- Customer credit value in cents
  platform_profit INTEGER NOT NULL, -- Unjam profit = credit_value - amount
  status TEXT NOT NULL, -- 'pending', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_engineer_transfers_engineer ON engineer_transfers(engineer_id);
CREATE INDEX idx_engineer_transfers_ticket ON engineer_transfers(ticket_id);
CREATE INDEX idx_engineer_transfers_created ON engineer_transfers(created_at);
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
npm test supabase/functions/_shared/services/BillingCredits/BillingCreditsServiceStripe.test.ts
npm test supabase/functions/_shared/services/BillingMeter/BillingMeterServiceStripe.test.ts
```

## Next Steps for Full Integration

1. **Engineer Onboarding (Stripe Connect Express)**:
   - Create Express Connect accounts for engineers
   - Implement onboarding flow using Stripe Account Links
   - Store `stripe_connect_account_id` in engineers table
   - Configure payout amounts (default $3.50, customizable)
   - Enable transfers capability on accounts

2. **Engineer Payout Service**:
   - Create `_shared/services/EngineerPayout/EngineerPayoutService.ts` interface
   - Create `_shared/services/EngineerPayout/EngineerPayoutServiceStripe.ts` implementation
   - Create `_shared/stores/EngineerTransfer/EngineerTransferStore.ts` for audit trail
   - Integrate into ticket completion flow
   - Record transfers in `engineer_transfers` table for audit trail
   - Handle transfer failures and retries
   - Track platform profit per ticket

3. **UI: Display Credit Balance**:
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

4. **Add Meter Event Recording**:
   - Integrate `BillingMeterService` into ticket completion flow
   - Send meter events when tickets marked complete
   - Trigger engineer payout after meter event recorded

5. **Configure Stripe**:
   - See **[STRIPE_SETUP_GUIDE.md](./STRIPE_SETUP_GUIDE.md)** for complete CLI commands
   - Create the "ticket_completed" meter
   - Create metered price linked to meter
   - Update subscription creation to use metered price
   - Configure webhooks for both billing and Connect events
   - Set up Connect platform settings

## References

- **[Stripe Setup Guide](./STRIPE_SETUP_GUIDE.md)** - Complete CLI commands for setting up meters, products, and webhooks

**Billing & Credits:**
- [Stripe Credit Grants API](https://docs.stripe.com/api/billing/credit-grant)
- [Stripe Meter Events API](https://docs.stripe.com/api/billing/meter-event)
- [Credits-Based Pricing Model Guide](https://docs.stripe.com/billing/subscriptions/usage-based/use-cases/credits-based-pricing-model)
- [Usage-Based Billing](https://docs.stripe.com/billing/subscriptions/usage-based)

**Stripe Connect (Marketplace Payouts):**
- [Stripe Connect Overview](https://docs.stripe.com/connect)
- [Express Accounts](https://docs.stripe.com/connect/express-accounts)
- [Transfers API](https://docs.stripe.com/api/transfers)
- [Connect Account Types Comparison](https://docs.stripe.com/connect/accounts)
- [Marketplace Payments Guide](https://docs.stripe.com/connect/charges)
