-- Create subscription_status enum
CREATE TYPE subscription_status AS ENUM (
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused'
);

-- Create billing_subscriptions table
CREATE TABLE billing_subscriptions (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  status subscription_status NOT NULL,
  plan_name TEXT NOT NULL,
  plan_amount INTEGER NOT NULL,
  credit_price INTEGER NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on stripe_subscription_id for faster lookups
CREATE INDEX billing_subscriptions_stripe_subscription_id_idx ON billing_subscriptions (stripe_subscription_id);

-- Create index on stripe_customer_id for faster lookups
CREATE INDEX billing_subscriptions_stripe_customer_id_idx ON billing_subscriptions (stripe_customer_id);

-- Create index on status for filtering active subscriptions
CREATE INDEX billing_subscriptions_status_idx ON billing_subscriptions (status);

-- Create index on current_period_end for querying expiring subscriptions
CREATE INDEX billing_subscriptions_current_period_end_idx ON billing_subscriptions (current_period_end);

-- Create updated_at trigger
CREATE TRIGGER update_billing_subscriptions_updated_at BEFORE UPDATE ON billing_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Service role can manage all billing subscriptions (for webhook handlers)
CREATE POLICY "Service role can manage all billing subscriptions" ON billing_subscriptions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Users can view their own billing subscriptions
-- This allows users to view subscriptions that belong to their billing customer record
CREATE POLICY "Users can view their own billing subscriptions" ON billing_subscriptions
  FOR SELECT USING (
    stripe_customer_id IN (
      SELECT stripe_customer_id
      FROM billing_customers
      WHERE profile_id IN (
        SELECT id FROM profiles WHERE auth_id = auth.uid()
      )
    )
  );
