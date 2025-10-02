# Stripe Setup Guide: Metered Billing with Credit Grants

This guide walks through setting up the complete Stripe infrastructure for Unjam's credit-based billing system.

## Prerequisites

1. Install Stripe CLI: https://docs.stripe.com/stripe-cli
2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

## Step 1: Create the Billing Meter

The meter tracks ticket completions and aggregates them for billing.

### Using Stripe CLI:

```bash
stripe billing meters create \
  --display-name "Ticket Completions" \
  --event-name "ticket_completed" \
  --default-aggregation[formula]=sum \
  --customer-mapping[type]=by_id \
  --customer-mapping[event-payload-key]=stripe_customer_id
```

**Expected Output:**
```
id: mtr_xxxxxxxxxxxxx
object: billing.meter
display_name: Ticket Completions
event_name: ticket_completed
status: active
```

**Save the meter ID** - you'll need it for the next step!

### Using Stripe Dashboard:

1. Go to: https://dashboard.stripe.com/test/billing/meters
2. Click **"Create meter"**
3. Fill in:
   - **Display name**: `Ticket Completions`
   - **Event name**: `ticket_completed`
   - **Aggregation formula**: `sum`
   - **Customer mapping**: `By ID`
   - **Event payload key**: `stripe_customer_id`
4. Click **"Create meter"**
5. Copy the meter ID (starts with `mtr_`)

---

## Step 2: Create the Product

The product represents your service (Unjam Support Credits).

### Using Stripe CLI:

```bash
stripe products create \
  --name "Unjam Support Credits" \
  --description "Prepaid credits for technical support tickets" \
  --metadata[credit_price]=1000
```

**Expected Output:**
```
id: prod_xxxxxxxxxxxxx
object: product
name: Unjam Support Credits
metadata:
  credit_price: 1000
```

**Save the product ID** - you'll need it for the next step!

**Note:** `credit_price=1000` means $10.00 per credit (in cents).

### Using Stripe Dashboard:

1. Go to: https://dashboard.stripe.com/test/products
2. Click **"Add product"**
3. Fill in:
   - **Name**: `Unjam Support Credits`
   - **Description**: `Prepaid credits for technical support tickets`
4. Scroll to **"Additional options"** → **"Metadata"**
5. Add metadata:
   - Key: `credit_price`
   - Value: `1000`
6. Click **"Add product"**
7. Copy the product ID (starts with `prod_`)

---

## Step 3: Create the Metered Price

The price links the product to the meter and defines the billing behavior.

### Using Stripe CLI:

```bash
# Replace PRODUCT_ID and METER_ID with your values from Steps 1 & 2
stripe prices create \
  --product prod_xxxxxxxxxxxxx \
  --currency usd \
  --billing-scheme per_unit \
  --unit-amount 1000 \
  --recurring[interval]=month \
  --recurring[usage-type]=metered \
  --recurring[meter]=mtr_xxxxxxxxxxxxx
```

**Expected Output:**
```
id: price_xxxxxxxxxxxxx
object: price
product: prod_xxxxxxxxxxxxx
unit_amount: 1000
recurring:
  interval: month
  usage_type: metered
  meter: mtr_xxxxxxxxxxxxx
```

**Save the price ID** - you'll use this when creating subscriptions!

### Using Stripe Dashboard:

1. Go to your product page: https://dashboard.stripe.com/test/products/prod_xxxxxxxxxxxxx
2. Click **"Add another price"**
3. Fill in:
   - **Price type**: `Recurring`
   - **Billing period**: `Monthly`
   - **Usage type**: `Metered`
   - **Meter**: Select `Ticket Completions` (the meter you created)
   - **Pricing model**: `Per unit`
   - **Unit amount**: `10.00` USD
4. Click **"Add price"**
5. Copy the price ID (starts with `price_`)

---

## Step 4: Create a Test Subscription

Now create a subscription for a test customer using the metered price.

### First, create a test customer:

```bash
stripe customers create \
  --email test@example.com \
  --name "Test Customer" \
  --description "Test customer for Unjam"
```

**Expected Output:**
```
id: cus_xxxxxxxxxxxxx
email: test@example.com
name: Test Customer
```

### Then, create the subscription:

```bash
# Replace CUSTOMER_ID and PRICE_ID
stripe subscriptions create \
  --customer cus_xxxxxxxxxxxxx \
  --items[0][price]=price_xxxxxxxxxxxxx
```

**Expected Output:**
```
id: sub_xxxxxxxxxxxxx
customer: cus_xxxxxxxxxxxxx
status: active
current_period_end: 1748534400
```

**Your subscription is now active!** ✅

---

## Step 5: Configure Webhooks

Set up webhooks to receive events in your Supabase function.

### Option A: Test with Stripe CLI (Development)

Forward webhook events to your local environment:

```bash
# Forward to local Supabase functions
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# Or forward to deployed Supabase
stripe listen --forward-to https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook
```

**Save the webhook signing secret** (starts with `whsec_`) for your environment variables.

### Option B: Dashboard Setup (Production)

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. Fill in:
   - **Endpoint URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
   - **Description**: `Unjam billing webhook`
4. Select events to listen for:
   - `customer.created`
   - `customer.updated`
   - `customer.deleted`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
5. Click **"Add endpoint"**
6. Copy the **"Signing secret"** (starts with `whsec_`)

---

## Step 6: Update Environment Variables

Update your Supabase function environment variables:

```env
STRIPE_API_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_xxxxxxxxxxxxx
WEBHOOKS_ENABLE_STRIPE=true
```

### Update via Supabase CLI:

```bash
supabase secrets set STRIPE_API_KEY=sk_test_xxxxxxxxxxxxx
supabase secrets set STRIPE_WEBHOOK_SIGNING_SECRET=whsec_xxxxxxxxxxxxx
supabase secrets set WEBHOOKS_ENABLE_STRIPE=true
```

### Update via Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/functions
2. Add/update the secrets above

---

## Step 7: Test the Complete Flow

### 7.1 Test Subscription Creation

When a subscription is created, it should trigger a webhook:

```bash
# This should have already happened in Step 4
# Check your Supabase function logs for:
# "📅 [BillingEventConverterStripe] Subscription created: sub_xxxxxxxxxxxxx"
```

### 7.2 Test Invoice Payment (Credit Grant)

Trigger an invoice payment to create credit grants:

```bash
# Retrieve the latest invoice for the subscription
stripe invoices list --subscription sub_xxxxxxxxxxxxx --limit 1

# Pay the invoice manually (if needed)
stripe invoices pay inv_xxxxxxxxxxxxx
```

**Check logs for:**
```
✅ [BillingEventConverterStripe] Payment succeeded: inv_xxxxxxxxxxxxx
[BillingEventHandler] Creating credit grant for invoice: inv_xxxxxxxxxxxxx
✅ [BillingCreditsStoreStripe] Credit grant created: creditgrant_xxxxxxxxxxxxx
```

### 7.3 Test Meter Event (Usage Recording)

Simulate a ticket completion by sending a meter event:

```bash
# Replace with your customer ID
stripe billing meter-events create \
  --event-name ticket_completed \
  --payload[stripe_customer_id]=cus_xxxxxxxxxxxxx \
  --payload[value]=1
```

**Expected Output:**
```
identifier: evt_xxxxxxxxxxxxx
```

**Check that the meter event was recorded:**

```bash
# List meter event summaries
stripe billing meter-event-summaries list \
  --meter mtr_xxxxxxxxxxxxx \
  --customer cus_xxxxxxxxxxxxx \
  --start-time $(($(date +%s) - 86400)) \
  --end-time $(date +%s)
```

### 7.4 Verify Credit Balance

Check that credits are available:

```bash
stripe billing credit-balance-summaries list \
  --customer cus_xxxxxxxxxxxxx
```

**Expected Output:**
```
ledger:
  balance: 10000  # $100.00 in credits
  available_balance: 9000  # $90.00 remaining (after 1 ticket)
```

---

## Quick Reference: All IDs You Need

Keep track of these IDs for your application:

```bash
# Meter
METER_ID=mtr_xxxxxxxxxxxxx

# Product
PRODUCT_ID=prod_xxxxxxxxxxxxx
PRODUCT_METADATA_CREDIT_PRICE=1000

# Price (use this when creating subscriptions)
METERED_PRICE_ID=price_xxxxxxxxxxxxx

# Webhook
WEBHOOK_SIGNING_SECRET=whsec_xxxxxxxxxxxxx

# Test Customer
TEST_CUSTOMER_ID=cus_xxxxxxxxxxxxx

# Test Subscription
TEST_SUBSCRIPTION_ID=sub_xxxxxxxxxxxxx
```

---

## Troubleshooting

### "Meter not found" error
- Make sure you're using the correct meter ID (starts with `mtr_`)
- Verify the meter exists: `stripe billing meters retrieve mtr_xxxxxxxxxxxxx`

### "No credit grants found"
- Ensure an invoice has been paid: `stripe invoices list --customer cus_xxxxxxxxxxxxx`
- Check webhook logs in Supabase dashboard
- Verify `STRIPE_WEBHOOK_SIGNING_SECRET` is correct

### "Meter events not appearing"
- Wait a few minutes - Stripe processes meter events asynchronously
- Verify event name matches meter: `ticket_completed`
- Check customer ID is correct

### Webhook signature verification fails
- Ensure `STRIPE_WEBHOOK_SIGNING_SECRET` matches your webhook endpoint
- Use `stripe listen` to test locally first
- Check that the secret starts with `whsec_`

---

## Production Checklist

Before going live:

- [ ] Switch from test mode to live mode in Stripe Dashboard
- [ ] Create production versions of:
  - [ ] Meter
  - [ ] Product
  - [ ] Metered Price
  - [ ] Webhook endpoint
- [ ] Update environment variables with live keys:
  - [ ] `STRIPE_API_KEY=sk_live_xxxxxxxxxxxxx`
  - [ ] `STRIPE_WEBHOOK_SIGNING_SECRET=whsec_xxxxxxxxxxxxx` (live)
- [ ] Test complete flow with real payment
- [ ] Monitor webhook delivery in Stripe Dashboard
- [ ] Set up alerts for webhook failures

---

## Useful Commands

### List all meters:
```bash
stripe billing meters list
```

### Retrieve meter details:
```bash
stripe billing meters retrieve mtr_xxxxxxxxxxxxx
```

### List meter events for a customer:
```bash
stripe billing meter-event-summaries list \
  --meter mtr_xxxxxxxxxxxxx \
  --customer cus_xxxxxxxxxxxxx \
  --start-time $(($(date +%s) - 2592000)) \
  --end-time $(date +%s)
```

### List credit grants for a customer:
```bash
stripe billing credit-grants list --customer cus_xxxxxxxxxxxxx
```

### Void a credit grant:
```bash
stripe billing credit-grants void creditgrant_xxxxxxxxxxxxx
```

### View upcoming invoice (with usage):
```bash
stripe invoices upcoming --customer cus_xxxxxxxxxxxxx
```

---

## Resources

- [Stripe CLI Reference](https://docs.stripe.com/cli)
- [Billing Meters API](https://docs.stripe.com/api/billing/meter)
- [Credit Grants API](https://docs.stripe.com/api/billing/credit-grant)
- [Meter Events API](https://docs.stripe.com/api/billing/meter-event)
- [Usage-Based Billing Guide](https://docs.stripe.com/billing/subscriptions/usage-based)
