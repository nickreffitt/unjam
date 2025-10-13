-- Create engineer_transfer_status enum
CREATE TYPE engineer_transfer_status AS ENUM (
  'pending',
  'completed',
  'failed'
);

-- Create engineer_transfers table
-- Audit trail for all engineer payouts via Stripe Connect
CREATE TABLE engineer_transfers (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  engineer_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  stripe_transfer_id TEXT UNIQUE,
  amount INTEGER NOT NULL,
  credits_used INTEGER NOT NULL,
  credit_value INTEGER NOT NULL,
  platform_profit INTEGER NOT NULL,
  status engineer_transfer_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_ticket
    FOREIGN KEY (ticket_id)
    REFERENCES tickets(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_engineer
    FOREIGN KEY (engineer_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_customer
    FOREIGN KEY (customer_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE
);

-- Create unique index on ticket_id to prevent duplicate transfers for same ticket
CREATE UNIQUE INDEX engineer_transfers_ticket_id_idx ON engineer_transfers (ticket_id);

-- Create index on stripe_transfer_id for faster lookups
CREATE INDEX engineer_transfers_stripe_transfer_id_idx ON engineer_transfers (stripe_transfer_id);

-- Create index on engineer_id for filtering transfers by engineer
CREATE INDEX engineer_transfers_engineer_id_idx ON engineer_transfers (engineer_id);

-- Create index on customer_id for filtering transfers by customer
CREATE INDEX engineer_transfers_customer_id_idx ON engineer_transfers (customer_id);

-- Create index on status for filtering by transfer status
CREATE INDEX engineer_transfers_status_idx ON engineer_transfers (status);

-- Create index on created_at for sorting by date
CREATE INDEX engineer_transfers_created_at_idx ON engineer_transfers (created_at DESC);

-- Enable Row Level Security
ALTER TABLE engineer_transfers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Service role can manage all engineer transfers (for billing functions)
CREATE POLICY "Service role can manage all engineer transfers" ON engineer_transfers
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Engineers can read their own transfers
CREATE POLICY "Engineers can read their own transfers" ON engineer_transfers
  FOR SELECT USING (
    engineer_id IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );

-- Customers can read transfers for their tickets
CREATE POLICY "Customers can read transfers for their tickets" ON engineer_transfers
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );
