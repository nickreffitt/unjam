-- Create invoice_status enum
CREATE TYPE invoice_status AS ENUM (
  'draft',
  'open',
  'paid',
  'uncollectible',
  'void'
);

-- Create billing_invoices table
CREATE TABLE billing_invoices (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  status invoice_status NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on stripe_invoice_id for faster lookups
CREATE INDEX billing_invoices_stripe_invoice_id_idx ON billing_invoices (stripe_invoice_id);

-- Create index on stripe_customer_id for faster lookups
CREATE INDEX billing_invoices_stripe_customer_id_idx ON billing_invoices (stripe_customer_id);

-- Create index on stripe_subscription_id for faster lookups
CREATE INDEX billing_invoices_stripe_subscription_id_idx ON billing_invoices (stripe_subscription_id);

-- Create index on status for filtering paid invoices
CREATE INDEX billing_invoices_status_idx ON billing_invoices (status);

-- Create updated_at trigger
CREATE TRIGGER update_billing_invoices_updated_at BEFORE UPDATE ON billing_invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Service role can manage all billing invoices (for webhook handlers)
CREATE POLICY "Service role can manage all billing invoices" ON billing_invoices
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
