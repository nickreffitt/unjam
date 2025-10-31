-- Create engineer_account_verification_status enum
CREATE TYPE engineer_account_verification_status AS ENUM (
  'active',
  'eventually_due',
  'currently_due',
  'past_due',
  'pending_verification',
  'disabled'
);

-- Create billing_engineers table
CREATE TABLE billing_engineers (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  details_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status engineer_account_verification_status NOT NULL DEFAULT 'pending_verification',
  current_deadline TIMESTAMP WITH TIME ZONE,
  disabled_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_profile
    FOREIGN KEY (profile_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE
);

-- Create index on stripe_account_id for faster lookups
CREATE INDEX billing_engineers_stripe_account_id_idx ON billing_engineers (stripe_account_id);

-- Create index on profile_id for faster lookups
CREATE INDEX billing_engineers_profile_id_idx ON billing_engineers (profile_id);

-- Create index on verification_status for filtering
CREATE INDEX billing_engineers_verification_status_idx ON billing_engineers (verification_status);

-- Create index on email for lookups
CREATE INDEX billing_engineers_email_idx ON billing_engineers (email);

-- Create updated_at trigger
CREATE TRIGGER update_billing_engineers_updated_at BEFORE UPDATE ON billing_engineers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE billing_engineers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Service role can manage all billing engineer accounts (for webhook handlers)
CREATE POLICY "Service role can manage all billing engineers" ON billing_engineers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Engineers can read their own billing account OR customers can read engineers for their tickets
CREATE POLICY "Users can view relevant billing engineers" ON billing_engineers
  FOR SELECT USING (
    -- Engineers can read their own billing account
    profile_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
    OR
    -- Customers can read billing engineer accounts for engineers they have tickets with
    profile_id IN (
      SELECT assigned_to FROM tickets
      WHERE created_by IN (
        SELECT id FROM profiles WHERE auth_id = (select auth.uid())
      )
    )
  );

-- Engineers can insert their own billing account
CREATE POLICY "Engineers can insert their own billing account" ON billing_engineers
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid()) AND type = 'engineer'
    )
  );
