# Unjam Payment Flow Documentation

## Overview

This document describes the complete payment flow for the Unjam platform, covering customer credit purchases, engineer payments, and the platform revenue model.

## System Components

### Client-Side Managers
- **BillingManager** (`common/features/BillingManager/`) - Customer credit purchases and balance queries
- **BillingAccountManager** (`common/features/BillingAccountManager/`) - Engineer payment account setup
- **ApiManager** (`common/features/ApiManager/`) - Backend API communication layer

### Backend Handlers (Supabase Edge Functions)
- **BillingCreditsHandler** - Customer credit operations (balance, purchases)
- **BillingLinksHandler** - Payment portal and onboarding link generation
- **PaymentHandler** - Ticket payment processing and engineer payouts
- **BillingEventHandler** (Customer) - Stripe webhook events for customer payments
- **BillingEventHandler** (Engineer) - Stripe webhook events for engineer accounts
- **BankTransferEventHandler** - Airwallex webhook events for bank transfers

### Payment Providers
- **Stripe** - Credit card purchases, Connect payouts, invoice tracking
- **Airwallex** - International bank transfers (batch processing)

---

## Revenue Model

### Credit Pricing
- **Credits are sold via one-time purchases** (no subscriptions)
- Pricing is configured in Stripe Products with `credit_price` in metadata
- **Example pricing tiers**:
  - 1 credit package: $50.00 → $50 per credit
  - 2 credit package: $79.60 → $39.80 per credit (20% volume discount)
  - 5 credit package: $175.00 → $35 per credit (30% volume discount)

### Ticket Charges
- **Rate**: 1 credit per hour of work
- **Maximum**: 2 hours (2 credits) per ticket
- **Calculation**: Time tracked from `claimed_at` to `resolved_at`, rounded up to nearest hour

### Engineer Payouts
- **Hourly Rate**: $20 per hour of work
- **Maximum**: $40 per ticket (2 hours maximum)
- **Calculation**: `hoursWorked × $20` (rounded up to nearest hour)
- **Payment Methods**:
  - Stripe Connect (instant transfer)
  - Bank Transfer via Airwallex (weekly batch)

### Platform Profit
```
Platform Profit = Customer Payment - Engineer Payout

Example 1 (1-hour ticket, customer bought 1-credit package):
  Customer paid: $50 (1 credit × $50)
  Engineer payout: $20 (1 hour × $20/hour)
  Platform profit: $30 (60% margin)

Example 2 (2-hour ticket, customer bought 1-credit package):
  Customer paid: $100 (2 credits × $50)
  Engineer payout: $40 (2 hours × $20/hour)
  Platform profit: $60 (60% margin)

Example 3 (1-hour ticket, customer bought 2-credit package):
  Customer paid: $39.80 (1 credit × $39.80)
  Engineer payout: $20 (1 hour × $20/hour)
  Platform profit: $19.80 (49.7% margin)

Example 4 (2-hour ticket, customer bought 2-credit package):
  Customer paid: $79.60 (2 credits × $39.80)
  Engineer payout: $40 (2 hours × $20/hour)
  Platform profit: $39.60 (49.7% margin)
```

**Note**: Platform profitability depends on credit pricing. With the example pricing above ($39.80-$50/credit) and $20/hour engineer rate, the platform achieves healthy margins of 49.7-60%.

---

## Flow 1: Customer Credit Purchase

### Trigger
Customer clicks "Buy Credits" in the billing dashboard

### Process Flow

#### Step 1: Fetch Available Products
**Client** → `BillingManager.fetchProducts()`
- Calls `ApiManager.fetchProducts()`
- Routes to `billing_credits/products` endpoint

**Backend** → `BillingCreditsHandler.fetchProducts()`
- Fetches active Stripe Products via `BillingProductService`
- Returns products with pricing and credit amounts

#### Step 2: Create Checkout Session
**Client** → `BillingManager.createProductCheckoutSession(profileId, priceId)`
- Calls `ApiManager.createProductCheckoutSession()`
- Routes to `billing_credits/product_checkout` endpoint

**Backend** → `BillingCreditsHandler.createCheckoutSession()`
1. Checks if Stripe Customer exists for profile
2. If not, creates new Stripe Customer via `BillingCustomerService`
3. Stores customer record in `billing_customer` table
4. Creates Stripe Checkout Session via `BillingLinksService`
5. Returns `checkout_url`

#### Step 3: Customer Completes Payment
- Customer redirected to Stripe Checkout
- Completes payment with credit card
- Stripe redirects back to success URL

#### Step 4: Stripe Webhook Processing
**Stripe** → `customer-billing-webhook` endpoint
- Sends `checkout.session.completed` event
- Sends `invoice.paid` event

**Backend** → `BillingEventHandler.handleEvent()`
1. Verifies webhook signature via `BillingEventConverter`
2. Handles `CheckoutSessionEvent` (logs completion)
3. Handles `InvoiceEvent` (paid):
   - Extracts invoice line items with product metadata
   - Calculates credits: `amountPaid / credit_price`
   - Stores invoice in `billing_invoice` table with line items
   - Example: $15 paid, credit_price = 500 cents → 3 credits

#### Result
- Customer has paid invoice stored in database
- Credits available for ticket payments
- Balance visible in dashboard via `fetchCreditBalance()`

---

## Flow 2: Engineer Payment Setup

Engineers must set up ONE payment method (either Stripe Connect OR Bank Transfer, not both).

### Option A: Stripe Connect Setup

#### Step 1: Engineer Initiates Onboarding
**Client** → `BillingAccountManager.createAccountLink(engineerProfile)`
- Calls `ApiManager.createEngineerAccountLink()`
- Routes to `billing-links` endpoint with `create_engineer_account`

#### Step 2: Create Connect Account
**Backend** → `BillingLinksHandler.createEngineerAccountLink()`
1. Checks if engineer already has Connect account
2. If not, creates Stripe Express Connect account via `BillingEngineerAccountService`
   - Sets `payout_amount: 2000` (cents) in metadata
3. Stores account in `billing_engineer` table
4. Generates onboarding link via `BillingLinksService.createEngineerAccountLink()`
5. Returns onboarding URL

#### Step 3: Engineer Completes Onboarding
- Engineer redirected to Stripe Express onboarding
- Completes identity verification and bank account setup
- Stripe processes verification

#### Step 4: Stripe Webhook Updates
**Stripe** → `engineer-billing-webhook` endpoint
- Sends `account.updated` events as onboarding progresses

**Backend** → `BillingEventHandler.handleEvent()` (Engineer)
1. Converts event via `BillingEngineerEventConverter`
2. Updates `billing_engineer` table with:
   - `charges_enabled` - Can receive transfers
   - `payouts_enabled` - Can receive payouts to bank
   - `details_submitted` - Onboarding complete

#### Result
- Engineer account ready when both `charges_enabled` and `payouts_enabled` are true
- Can receive instant transfers via Stripe Connect

### Option B: Bank Transfer Setup (Airwallex)

#### Step 1: Generate Authorization Code
**Client** → `BillingAccountManager.createBeneficiaryAuthCode(codeChallenge)`
- Generates PKCE code challenge (SHA256 hash)
- Calls `ApiManager.createEngineerBeneficiaryAuthCode()`
- Routes to `billing-links` endpoint with `create_engineer_beneficiary_auth_code`

**Backend** → `BillingLinksHandler.createEngineerBeneficiaryAuthCode()`
- Generates authorization code via `BillingEngineerBankTransferAccountService`
- Returns code valid for 30 seconds

#### Step 2: Render Airwallex Embedded Form
**Client** → Loads Airwallex embedded beneficiary component
- Uses authorization code for authentication
- Engineer fills in bank account details (account number, routing, etc.)
- Airwallex validates account information

#### Step 3: Create Beneficiary
**Client** → `BillingAccountManager.createBeneficiary(beneficiaryData)`
- Submits form data from Airwallex component
- Calls `ApiManager.createEngineerBeneficiary()`
- Routes to `billing-links` endpoint with `create_engineer_beneficiary`

**Backend** → `BillingLinksHandler.createEngineerBeneficiary()`
1. Creates beneficiary in Airwallex via `BillingEngineerBankTransferAccountService`
2. Stores beneficiary in `billing_engineer_bank_transfer_account` table:
   - `external_id` - Airwallex beneficiary ID
   - `active: true`
   - Bank account details

#### Result
- Engineer has active bank transfer account
- Can receive weekly batch transfers via Airwallex

---

## Flow 3: Ticket Payment Processing

### Trigger
Customer marks ticket as complete and confirms engineer's work

### Entry Point
**Backend** → `ticket-payment` edge function
- Triggered by RPC call from client
- Calls `PaymentHandler.processPayment(ticketId, customerId)`

### Payment Processing Flow

#### Step 1: Validate Prerequisites
**PaymentHandler.validateTransferPrerequisites()**
1. Fetch ticket details from `tickets` table
   - Verify `engineerId` is assigned
   - Calculate elapsed time: `resolvedAt - claimedAt`
   - Calculate credits: `Math.min(Math.ceil(elapsedHours), 2)`
   - Example: 1.5 hours → 2 credits
2. Fetch customer's Stripe ID from `billing_customer` table
3. Fetch paid invoices via `BillingInvoiceService.fetchPaidInvoicesWithProducts()`
   - Returns last 365 days of paid invoices with line items
   - Each line item has: `amountPaid`, `creditPrice`, `creditsFromLineItem`
4. Allocate credits from invoices (FIFO - oldest first):
   - Deduct from oldest invoice line items first
   - Example: Need 2 credits, Invoice A has 3 credits available → allocate 2
5. Calculate total credit value:
   ```
   creditValue = sum(creditsFromLineItem × creditPrice)
   Example: 2 credits × 500 cents = 1000 cents ($10)
   ```

#### Step 2: Check for Existing Transfer (Idempotency)
- Query `billing_engineer_transfers` by `ticket_id`
- If exists and `status = 'completed'`, return success
- If exists with other status, throw error (already in progress)

#### Step 3: Determine Payment Method
Check engineer's payment setup:
1. Query `billing_engineer` table for Stripe Connect account
   - Valid if: `charges_enabled = true` AND `payouts_enabled = true`
2. Query `billing_engineer_bank_transfer_account` table for bank account
   - Valid if: `active = true`
3. Set `paymentService` to either `'stripe_connect'` or `'bank_transfer'`
4. If neither valid, throw error

#### Step 4: Create Audit Record
Create record in `billing_engineer_transfers`:
```
{
  ticket_id: ticketId,
  engineer_id: engineerId,
  customer_id: customerId,
  service: 'stripe_connect' | 'bank_transfer',
  amount: 0,  // Updated after payout calculation
  credits_used: creditsUsed,
  credit_value: creditValue,
  platform_profit: 0,  // Updated after payout calculation
  status: 'pending'
}
```

#### Step 5A: Stripe Connect Payment Path

**PaymentHandler.executeTransferOperations()**

1. **Record Meter Event**
   - `BillingMeterService.recordTicketCompletion()`
   - Records credit usage to Stripe Billing Meter
   - Used for tracking and analytics

2. **Calculate Payout Amount**
   - Calculates hours worked: `Math.ceil((resolvedAt - claimedAt) / (1000 * 60 * 60))`
   - Hours are capped at 2 hours maximum
   - Payout = `hours × 2000` cents (hours × $20/hour)
   - Example: 1.5 hours → 2 hours → 4000 cents ($40)

3. **Check Available Balance**
   - `BillingBalanceService.getBalance()`
   - Fetches Stripe platform balance
   - Returns: `{ available, pending }`

4. **Balance Decision Logic**
   ```
   If (available < payoutAmount AND pending < payoutAmount):
     → Status: 'insufficient_funds'
     → Update transfer status to 'failed'
     → Update ticket status to 'payment-failed'
     → Requires manual triage

   If (available < payoutAmount AND pending >= payoutAmount):
     → Status: 'pending_funds'
     → Update transfer status to 'pending_funds'
     → Update ticket status to 'pending-payment'
     → Will retry when pending clears

   If (available >= payoutAmount):
     → Continue to transfer
   ```

5. **Create Stripe Transfer**
   - `BillingEngineerPayoutService.createTransfer()`
   - Transfers calculated payout to engineer's Connect account
   - Returns: `{ transferId, amount, platformProfit }`
   - Example: Transfer $40 (2 hours), credit value $30 → profit -$10 (loss)

6. **Update Records**
   - Update transfer record:
     ```
     {
       amount: hours × 2000,  // e.g., 2 hours × 2000 = 4000 cents
       platform_profit: creditValue - amount,
       status: 'completed',
       available_for_transfer_at: new Date()
     }
     ```
   - Update ticket status to `'completed'`

#### Step 5B: Bank Transfer Payment Path

1. **Record Meter Event**
   - Same as Stripe Connect path

2. **Calculate Payout**
   - Calculate hours worked: `Math.ceil((resolvedAt - claimedAt) / (1000 * 60 * 60))`
   - Hours capped at 2 hours maximum
   - Payout = `hours × 2000` cents (hours × $20/hour)
   - Calculate platform profit: `creditValue - payout`

3. **Update Transfer Record**
   ```
   {
     amount: hours × 2000,  // e.g., 2 hours × 2000 = 4000 cents
     platform_profit: platformProfit,
     status: 'pending'  // Awaiting batch processing
   }
   ```

4. **Update Ticket Status**
   - Set ticket to `'pending-payment'`
   - Engineer payment pending weekly batch

#### Result
- Stripe Connect: Engineer paid instantly, ticket completed
- Bank Transfer: Payment pending, will be processed in weekly batch
- Transfer record created for audit trail
- Platform profit calculated and recorded

---

## Flow 4: Bank Transfer Batch Processing

### Trigger
Weekly cron job (runs every Monday at 10am UTC)

**Implementation**:
- Script: [deploy/process-batch-transfer-cron.sh](../deploy/process-batch-transfer-cron.sh)
- Deployment: [.github/workflows/staging.yml](../.github/workflows/staging.yml) (line 298-299)
- Schedule: `0 9 * * 1` (Monday at 09:00 UTC)

### Entry Point
**Backend** → `ticket-payment?action=batch-transfer` edge function
- Calls `PaymentHandler.processWeeklyBatchTransfer()`

### Batch Processing Flow

#### Step 1: Fetch Pending Transfers
- Query `billing_engineer_transfers` table:
  ```sql
  WHERE service = 'bank_transfer'
    AND status = 'pending'
  GROUP BY engineer_id
  ```
- Aggregates transfers by engineer:
  ```
  Map<engineerId, {
    totalAmount: sum(amount),
    totalPlatformProfit: sum(platform_profit),
    transferIds: [id1, id2, ...]
  }>
  ```

#### Step 2: Create Batch Group
**BillingBatchGroupService.createBatchGroup()**
- Creates batch transfer in Airwallex
- Returns: `{ id, name, status: 'DRAFTING' }`

Store in `billing_batch_group` table:
```
{
  external_batch_group_id: airwallexBatchId,
  name: batchName,
  version: 1,
  status: 'drafting'
}
```

#### Step 3: Build Batch Items
For each engineer with pending transfers:
1. Fetch bank account from `billing_engineer_bank_transfer_account`
2. Create batch item request:
   ```
   {
     beneficiary_id: bankAccount.external_id,
     source_currency: 'USD',
     transfer_currency: 'USD',
     transfer_amount: totalAmount / 100,  // Convert cents to dollars
     transfer_method: 'LOCAL',
     reason: 'Contractor payment',
     reference: 'Unjam',
     request_id: crypto.randomUUID()  // For matching response
   }
   ```

#### Step 4: Add Items to Batch
**BillingBatchGroupItemService.addItemsToBatch()**
- Sends all batch items to Airwallex in one request
- Airwallex validates and adds items to batch

#### Step 5: Fetch Batch Items with External IDs
**BillingBatchGroupItemService.getBatchItems()**
- Retrieves items with Airwallex-assigned IDs
- Matches items by `request_id`

#### Step 6: Store Batch Items
For each batch item:
1. Store in `billing_batch_group_item` table:
   ```
   {
     external_id: airwallexItemId,
     batch_group_id: batchGroupId,
     engineer_id: engineerId,
     external_engineer_id: beneficiaryId,
     total_amount: totalAmount,
     total_platform_profit: totalPlatformProfit,
     status: 'pending'
   }
   ```
2. Link transfers to batch item:
   - Update `billing_engineer_transfers.batch_group_item_id`

#### Step 7: Submit Batch for Processing
**BillingBatchGroupService.submitBatchGroup()**
- Submits batch to Airwallex for funding and payout
- Airwallex validates, funds, and processes transfers

Update batch group:
```
{
  status: 'SCHEDULED'
}
```

#### Result
- Batch submitted to Airwallex
- All pending bank transfers grouped and linked
- System awaits webhook events for status updates

---

## Flow 5: Bank Transfer Webhook Processing

### Trigger
Airwallex sends webhook events as batch progresses

### Entry Point
**Backend** → `billing-engineer-bank-transfer-webhook` endpoint
- Receives webhook POST with HMAC-SHA256 signature

### Webhook Processing Flow

#### Step 1: Verify Signature
**BankTransferEventHandler.verifySignature()**
1. Concatenate: `x-timestamp` + raw body
2. Compute HMAC-SHA256 with webhook secret
3. Compare with `x-signature` header
4. Reject if mismatch

#### Step 2: Store Raw Event
- Logs event details for analysis
- Future: Store in `airwallex_webhook_events` table

#### Step 3: Handle Event Type

### Event Type A: Batch Transfer Status
Events: `payout.batch_transfers.*` (drafting, scheduled, booking, booked, failed, cancelled)

**BankTransferEventHandler.handleBatchTransferStatusUpdate()**
1. Parse event data: `{ id, status }`
2. Map Airwallex status to internal status (lowercase)
3. Fetch batch group by `external_batch_group_id`
4. **Check status order** (prevents out-of-order webhooks):
   ```
   Status Order:
   drafting: 0
   in_approval: 1
   scheduled: 3
   booking: 5
   booked: 7
   failed/cancelled: 8
   ```
   - If `newStatusOrder < currentStatusOrder`, ignore (out of order)
   - If equal, skip (no update needed)
5. Update `billing_batch_group` table:
   ```
   {
     status: newStatus,
     completed_at: new Date() (if booked),
     cancelled_at: new Date() (if failed/cancelled)
   }
   ```

### Event Type B: Individual Transfer Status
Events: `payout.transfer.*` (processing, sent, paid, failed, cancelled)

**BankTransferEventHandler.handlePayoutTransferStatusUpdate()**
1. Parse event data: `{ request_id, status }`
2. Map Airwallex status to internal status
3. Fetch batch item by `external_id = request_id`
4. **Check status order** (prevents out-of-order webhooks):
   ```
   Status Order:
   pending: 0
   processing: 1
   sent: 2
   paid: 3
   failed/cancelled: 4
   ```
   - If `newStatusOrder < currentStatusOrder`, ignore
5. Update `billing_batch_group_item.status`
6. Fetch all engineer transfers linked to batch item
7. **Update based on status**:

   **If status = 'failed' or 'cancelled':**
   - Update each transfer: `status = 'failed'`
   - Update each ticket: `status = 'payment-failed'`

   **If status = 'sent' or 'paid':**
   - Update each transfer: `status = 'completed'`
   - Update each ticket: `status = 'completed'`
   - Engineer has been paid successfully

   **If status = 'processing':**
   - Update transfers in 'pending' state: `status = 'pending_funds'`
   - Update tickets: `status = 'pending-payment'`

#### Result
- Transfer and ticket statuses updated in real-time
- Engineers notified of payment completion
- Failed transfers flagged for manual review

---

## Flow 6: Customer Credit Balance Query

### Trigger
Customer views billing dashboard

### Process Flow

#### Step 1: Fetch Credit Balance
**Client** → `BillingManager.getCreditBalanceForProfile(profileId)`
- Calls `ApiManager.fetchCreditBalance()`
- Routes to `billing_credits/credit_balance` endpoint

#### Step 2: Calculate Balance
**Backend** → `BillingCreditsHandler.fetchCreditBalance()`
1. Fetch customer Stripe ID from `billing_customer` table
2. If no customer exists, return `{ creditBalance: 0, pendingCredits: 0 }`
3. Fetch credit balance from invoices:
   - `BillingCreditsService.fetchCreditBalanceFromInvoices()`
   - Fetches paid invoices (last 365 days)
   - Fetches meter events (last 365 days)
   - Calculates: `totalCredits - usedCredits = availableCredits`

#### Step 3: Calculate Pending Credits
**BillingCreditsHandler.calculatePendingCredits()**
1. Fetch tickets in processing states:
   - `'in-progress'` - Currently being worked on
   - `'awaiting-confirmation'` - Waiting for customer confirmation
   - `'pending-payment'` - Payment in progress
   - `'payment-failed'` - Payment failed, needs resolution
2. For each ticket, calculate credits:
   ```
   startTime = claimedAt || createdAt
   endTime = resolvedAt || markAsFixedAt || now()
   elapsedHours = (endTime - startTime) / (1000 * 60 * 60)
   credits = Math.min(Math.ceil(elapsedHours), 2)
   ```
3. Sum all pending credits

#### Step 4: Return Balance
```json
{
  "creditBalance": 5,        // Available credits
  "pendingCredits": 2        // Credits locked by active tickets
}
```

#### Display Logic
- **Available**: Green, can create new tickets
- **Pending**: Yellow, locked by tickets in progress
- **Zero Balance**: Red, prompt to buy more credits

---

## Data Models

### Customer Domain
```
billing_customer
├── id (UUID, PK)
├── stripe_customer_id (Text, Unique)
├── profile_id (UUID, FK → profiles)
└── created_at (Timestamp)

billing_invoice
├── id (UUID, PK)
├── stripe_invoice_id (Text, Unique)
├── customer_id (Text, FK → billing_customer)
├── status (Text)
├── total_amount (Integer, cents)
├── paid_at (Timestamp)
└── line_items (JSONB[])
    ├── line_item_id
    ├── amount_paid (cents)
    ├── product_id
    ├── credit_price (cents)
    └── credits_from_line_item
```

### Engineer Domain
```
billing_engineer
├── id (Text, PK, Stripe Connect account ID)
├── profile_id (UUID, FK → profiles)
├── charges_enabled (Boolean)
├── payouts_enabled (Boolean)
├── details_submitted (Boolean)
└── created_at (Timestamp)

billing_engineer_bank_transfer_account
├── id (UUID, PK)
├── external_id (Text, Airwallex beneficiary ID)
├── profile_id (UUID, FK → profiles)
├── active (Boolean)
├── bank_details (JSONB)
└── created_at (Timestamp)
```

### Transfer Domain
```
billing_engineer_transfers
├── id (UUID, PK)
├── ticket_id (UUID, FK → tickets)
├── engineer_id (UUID, FK → profiles)
├── customer_id (UUID, FK → profiles)
├── service (Text: 'stripe_connect' | 'bank_transfer')
├── amount (Integer, cents)
├── credits_used (Integer)
├── credit_value (Integer, cents)
├── platform_profit (Integer, cents)
├── status (Text: 'pending' | 'pending_funds' | 'completed' | 'failed')
├── batch_group_item_id (UUID, FK → billing_batch_group_item)
├── available_for_transfer_at (Timestamp)
├── error_message (Text)
└── created_at (Timestamp)
```

### Batch Transfer Domain
```
billing_batch_group
├── id (UUID, PK)
├── external_batch_group_id (Text, Airwallex batch ID)
├── name (Text)
├── version (Integer)
├── status (Text: 'drafting' | 'scheduled' | 'booked' | 'failed' | 'cancelled')
├── completed_at (Timestamp)
├── cancelled_at (Timestamp)
└── created_at (Timestamp)

billing_batch_group_item
├── id (UUID, PK)
├── external_id (Text, Airwallex item ID)
├── batch_group_id (UUID, FK → billing_batch_group)
├── engineer_id (UUID, FK → profiles)
├── external_engineer_id (Text, Airwallex beneficiary ID)
├── total_amount (Integer, cents)
├── total_platform_profit (Integer, cents)
├── status (Text: 'pending' | 'processing' | 'sent' | 'paid' | 'failed' | 'cancelled')
└── created_at (Timestamp)
```

---

## Error Handling & Edge Cases

### Insufficient Funds (Stripe Connect)
**Scenario**: Platform doesn't have enough balance to pay engineer

**Detection**: `BillingBalanceService.getBalance()` check before transfer

**Outcomes**:
1. **No funds available or pending**:
   - Transfer status → `'failed'`
   - Ticket status → `'payment-failed'`
   - Error message: "Insufficient funds (both available and pending balance). Manual triage required."
   - Requires manual intervention to fund platform account

2. **Funds pending (will clear soon)**:
   - Transfer status → `'pending_funds'`
   - Ticket status → `'pending-payment'`
   - System will retry when Stripe balance updates
   - No immediate action needed

### Duplicate Payment Attempts (Idempotency)
**Scenario**: Payment processing called multiple times for same ticket

**Detection**: Check `billing_engineer_transfers` by `ticket_id` before processing

**Outcomes**:
- If `status = 'completed'`: Return success (already paid)
- If `status = 'pending'`: Throw error "Transfer already in progress"
- If `status = 'failed'`: Throw error with original failure message
- If `status = 'pending_funds'`: Throw error "Transfer waiting for funds"

### Out-of-Order Webhooks
**Scenario**: Airwallex webhooks arrive in wrong order (e.g., 'paid' arrives before 'processing')

**Protection**: Status order validation in `BankTransferEventHandler`

**Logic**:
```
Status has numeric order value (0-8)
If newStatusOrder < currentStatusOrder:
  Ignore webhook (log warning)
If newStatusOrder == currentStatusOrder:
  Skip update (no change needed)
If newStatusOrder > currentStatusOrder:
  Apply update
```

### Engineer Has No Payment Method
**Scenario**: Ticket completed but engineer hasn't set up Stripe Connect or bank transfer

**Detection**: Check both payment methods in `PaymentHandler.processPayment()`

**Outcome**:
- Throw error before creating transfer record
- Ticket status not updated
- Customer notified to contact support
- Engineer prompted to set up payment method

### Failed Bank Transfers
**Scenario**: Airwallex transfer fails (invalid account, compliance issue, etc.)

**Detection**: `payout.transfer.failed` webhook event

**Actions**:
1. Update batch item status → `'failed'`
2. Update all linked transfers → `'failed'`
3. Update all linked tickets → `'payment-failed'`
4. Log failure reason from Airwallex
5. Notify support team for manual review

### Credit Allocation Failures
**Scenario**: Customer doesn't have enough paid credits for ticket

**Detection**: FIFO allocation in `validateTransferPrerequisites()`

**Outcome**:
- Throw error before transfer creation
- Error message: "Insufficient credits: need X, but only Y available from paid invoices"
- Ticket payment blocked until customer purchases more credits

---

## Monitoring & Analytics

### Key Metrics to Track

**Revenue Metrics**:
- Total credit sales (by product)
- Average credit value per invoice
- Platform profit per ticket
- Monthly recurring revenue (if subscriptions added)

**Payout Metrics**:
- Total engineer payouts (by payment method)
- Stripe Connect transfer volume
- Airwallex batch transfer volume
- Failed transfer rate

**Credit Usage**:
- Credits purchased vs. credits used
- Average credits per ticket
- Credit burn rate per customer
- Pending credits (work in progress)

**Payment Method Adoption**:
- Engineers using Stripe Connect vs. bank transfer
- Bank transfer batch sizes and frequency
- Connect onboarding completion rate

### Health Checks

**Daily**:
- Verify Stripe balance > $1000 (buffer for payouts)
- Check failed transfers count
- Monitor webhook delivery success rate

**Weekly**:
- Review bank transfer batch success rate
- Audit platform profit margins
- Check for stale pending transfers

**Monthly**:
- Reconcile total credits sold vs. engineer payouts
- Review payment method fees (Stripe vs. Airwallex)
- Analyze credit purchase patterns

---

## Security Considerations

### Webhook Signature Verification
- **Stripe**: Verify using `stripe-signature` header and webhook secret
- **Airwallex**: Verify using HMAC-SHA256 with `x-signature` and `x-timestamp` headers
- **Reject unsigned or invalid webhooks immediately**

### Row-Level Security (RLS)
- All database tables use Supabase RLS policies
- Customers can only see their own invoices and credit balances
- Engineers can only see their own transfer records
- Batch operations use service role (bypasses RLS)

### Sensitive Data
- Never expose Stripe API keys or webhook secrets in client code
- Store payment metadata (account IDs, beneficiary IDs) encrypted at rest
- Log payment events without including full account numbers

### Idempotency
- All payment operations check for existing records before processing
- Transfer records created in 'pending' state before API calls
- Prevents duplicate charges or double-payments

---

## Future Enhancements

### Subscription Model
- Add recurring credit subscriptions (monthly/annual)
- Auto-renew credits at start of billing period
- Prorate credits for mid-cycle upgrades/downgrades

### Dynamic Pricing
- Tier-based engineer payouts (based on rating/experience)
- Volume discounts for credit purchases
- Promotional pricing campaigns

### Multi-Currency Support
- Accept payments in EUR, GBP, etc.
- Pay engineers in local currency
- Airwallex multi-currency batch transfers

### Instant Bank Transfers
- Explore real-time bank transfer options (e.g., FedNow, RTP)
- Reduce batch processing delay from weekly to daily/instant

### Payment Retries
- Auto-retry failed Stripe Connect transfers when balance available
- Intelligent retry logic with exponential backoff
- Automated notification to engineers on payment status

---

## Troubleshooting Guide

### Customer: "My credits aren't showing up after purchase"

**Check**:
1. Verify invoice webhook received: Check `billing_invoice` table
2. Confirm invoice status is 'paid'
3. Check invoice line items have correct `credit_price` in metadata
4. Verify credit calculation: `amountPaid / credit_price`

**Resolution**:
- If webhook missed: Manually sync invoice via Stripe API
- If metadata missing: Update product metadata and recalculate credits

### Engineer: "I haven't received payment for completed tickets"

**Check**:
1. Verify payment method setup:
   - Stripe Connect: `charges_enabled` and `payouts_enabled` both true
   - Bank transfer: `active = true` in bank transfer account table
2. Check transfer status in `billing_engineer_transfers`
3. If Stripe Connect and `status = 'pending_funds'`: Waiting for platform balance
4. If bank transfer and `status = 'pending'`: Waiting for weekly batch

**Resolution**:
- Stripe Connect: Fund platform account if insufficient balance
- Bank transfer: Wait for next batch run or manually trigger batch
- Failed status: Review error message and resolve account issues

### Platform: "Batch transfer stuck in 'scheduled' status"

**Check**:
1. Verify Airwallex webhooks are being received
2. Check `billing_batch_group.status` in database
3. Review Airwallex dashboard for batch status
4. Check webhook event logs for errors

**Resolution**:
- If webhooks not arriving: Verify webhook URL and secret
- If batch failed in Airwallex: Review failure reason and contact support
- Manual intervention: Update batch status and retry or cancel

### Platform: "Platform balance going negative"

**Check**:
1. Review recent transfer volume in `billing_engineer_transfers`
2. Compare total credits purchased vs. total payouts
3. Check for refunded invoices or chargebacks
4. Verify platform profit margin per ticket

**Resolution**:
- Adjust credit pricing if profit margins too thin
- Increase Stripe balance buffer
- Review payout amounts and adjust if needed
- Implement balance threshold alerts before reaching zero

---

## Appendix: Example Flows

### Example 1: Complete Payment Flow (Stripe Connect)

**Setup**:
- Customer: John (profile_id: `cust_123`)
- Engineer: Sarah (profile_id: `eng_456`)
- Credit Product: $15 for 1 credit
- Engineer Payout: $20 per hour

**Timeline**:

1. **T+0 (Day 1)**: John purchases credits
   - Buys 3 credits for $45 via Stripe Checkout
   - Invoice created: `invoice_789`
   - Line item: `{ amountPaid: 4500, creditPrice: 1500, creditsFromLineItem: 3 }`
   - John's balance: 3 credits

2. **T+1 hour**: John creates ticket
   - Ticket `ticket_abc` created
   - Status: `'open'`

3. **T+2 hours**: Sarah claims ticket
   - Ticket status: `'in-progress'`
   - `claimedAt`: recorded

4. **T+3.5 hours**: Sarah marks ticket fixed
   - Ticket status: `'awaiting-confirmation'`
   - Elapsed time: 1.5 hours → 2 hours (rounded up) → 2 credits
   - John's pending credits: 2

5. **T+4 hours**: John confirms fix
   - Triggers `PaymentHandler.processPayment()`
   - Validates: John has 3 credits, needs 2 credits ✓
   - Allocates 2 credits from invoice `invoice_789`
   - Credit value: 2 × $15 = $30
   - Creates transfer record: `status = 'pending'`
   - Records meter event: 2 credits used
   - Checks balance: Available $1000 ✓
   - Calculates engineer payout: 2 hours × $20/hour = $40
   - Creates Stripe transfer: $40 to Sarah
   - Platform profit: $30 - $40 = -$10 (loss)
   - Updates transfer: `status = 'completed'`
   - Updates ticket: `status = 'completed'`

6. **T+4 hours + 1 min**: John's new balance
   - Total credits: 3
   - Used credits: 2
   - Available credits: 1
   - Pending credits: 0

**Financial Summary**:
- Customer paid: $30 (2 credits × $15)
- Engineer received: $40 (2 hours × $20/hour)
- Platform profit: -$10 (loss)
- Payment method: Instant via Stripe Connect

### Example 2: Complete Payment Flow (Bank Transfer)

**Setup**:
- Customer: Emma (profile_id: `cust_xyz`)
- Engineer: Carlos (profile_id: `eng_789`)
- Credit Product: $10 for 1 credit
- Engineer Payout: $20 per hour
- Current date: Monday

**Timeline**:

1. **Monday 10am**: Emma purchases 2 credits for $20
2. **Monday 11am**: Emma creates and Carlos claims ticket
3. **Monday 1pm**: Carlos marks fixed, Emma confirms
   - Elapsed time: 2 hours → 2 credits
   - Credit value: 2 × $10 = $20
   - Calculates engineer payout: 2 hours × $20/hour = $40
   - Creates transfer: `{ service: 'bank_transfer', amount: 4000, status: 'pending' }`
   - Ticket status: `'pending-payment'`

4. **Sunday 12:01am** (6 days later): Weekly batch runs
   - Fetches Carlos's pending transfer
   - Creates batch group in Airwallex
   - Adds batch item: $40 to Carlos's beneficiary account
   - Submits batch for processing
   - Batch status: `'scheduled'`

5. **Sunday 9am**: Airwallex processes batch
   - Webhook: `payout.batch_transfers.booking`
   - Batch status → `'booking'`

6. **Sunday 10am**: Batch sent to bank
   - Webhook: `payout.transfer.sent`
   - Transfer status → `'completed'`
   - Ticket status → `'completed'`

7. **Monday-Tuesday**: Carlos receives bank deposit
   - ACH clearing time (1-2 business days)
   - Carlos sees $40 in bank account

**Financial Summary**:
- Customer paid: $20 (2 credits × $10)
- Engineer received: $40 (2 hours × $20/hour)
- Platform profit: -$20 (loss)
- Payment method: Bank transfer (5-7 day delay)
- Transaction fee: ~$1-2 Airwallex fee (deducted from platform, increasing total loss)

### Example 3: Insufficient Balance Scenario

**Setup**:
- Platform Stripe balance: $15 available, $60 pending
- Customer: Alex completes ticket (1 hour of work)
- Engineer: Jamie (Stripe Connect)
- Ticket credit value: $25 (1 credit)
- Engineer payout: $20 (1 hour × $20/hour)

**Flow**:

1. **Payment processing starts**:
   - Validates prerequisites ✓
   - Credit value: $25 ✓
   - Creates transfer record: `status = 'pending'`
   - Records meter event ✓

2. **Balance check**:
   - Available balance: $15
   - Required: $20
   - Result: Insufficient available balance

3. **Check pending balance**:
   - Pending balance: $60
   - Result: Pending balance will cover it

4. **Decision**: Mark as pending funds
   - Transfer status → `'pending_funds'`
   - Ticket status → `'pending-payment'`
   - Platform profit calculation deferred
   - No Stripe transfer created yet

5. **Next day**: Pending balance clears
   - Available balance now: $75
   - Manual retry or automated job retries payment
   - Creates Stripe transfer: $20 to Jamie (1 hour × $20/hour)
   - Transfer status → `'completed'`
   - Ticket status → `'completed'`
   - Platform profit: $25 - $20 = $5

**Note**: If both available ($15) AND pending ($5) were insufficient:
- Transfer status → `'failed'`
- Ticket status → `'payment-failed'`
- Error: "Manual triage required"
- Support team must fund platform account

---

## Version History

- **v1.0** (2025-01-26): Initial documentation covering Stripe Connect and Airwallex bank transfer flows
