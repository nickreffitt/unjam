-- Create billing_customers table to link billing provider customers to profiles
CREATE TABLE billing_customers (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  email TEXT,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on profile_id for faster lookups
CREATE INDEX billing_customers_profile_id_idx ON billing_customers (profile_id);

-- Create index on stripe_customer_id for faster lookups
CREATE INDEX billing_customers_stripe_customer_id_idx ON billing_customers (stripe_customer_id);

-- Create unique constraint to ensure one billing customer per profile
CREATE UNIQUE INDEX billing_customers_profile_id_unique ON billing_customers (profile_id);

-- Create updated_at trigger
CREATE TRIGGER update_billing_customers_updated_at BEFORE UPDATE ON billing_customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read their own billing customer record
CREATE POLICY "Users can view their own billing customer" ON billing_customers
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );

-- Service role can manage all billing customers (for webhook handlers)
CREATE POLICY "Service role can manage all billing customers" ON billing_customers
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
