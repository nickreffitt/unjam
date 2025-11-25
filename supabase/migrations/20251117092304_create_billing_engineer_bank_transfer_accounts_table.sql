-- Create billing_engineer_bank_transfer_accounts table
CREATE TABLE billing_engineer_bank_transfer_accounts (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE,
  external_recipient_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  summary TEXT,
  hash TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_profile
    FOREIGN KEY (profile_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE
);

-- Create index on external_recipient_id for faster lookups
CREATE INDEX billing_engineer_bank_transfer_accounts_external_recipient_id_idx ON billing_engineer_bank_transfer_accounts (external_recipient_id);

-- Create index on profile_id for faster lookups
CREATE INDEX billing_engineer_bank_transfer_accounts_profile_id_idx ON billing_engineer_bank_transfer_accounts (profile_id);

-- Create updated_at trigger
CREATE TRIGGER update_billing_engineer_bank_transfer_accounts_updated_at BEFORE UPDATE ON billing_engineer_bank_transfer_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE billing_engineer_bank_transfer_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Service role can manage all billing engineer bank transfer accounts (for webhook handlers)
CREATE POLICY "Service role can manage all billing engineer bank transfer accounts" ON billing_engineer_bank_transfer_accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Engineers can read their own bank transfer account OR customers can read engineers for their tickets
CREATE POLICY "Users can view relevant billing engineer bank transfer accounts" ON billing_engineer_bank_transfer_accounts
  FOR SELECT USING (
    -- Engineers can read their own bank transfer account
    profile_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
    OR
    -- Customers can read billing engineer bank transfer accounts for engineers they have tickets with
    profile_id IN (
      SELECT assigned_to FROM tickets
      WHERE created_by IN (
        SELECT id FROM profiles WHERE auth_id = (select auth.uid())
      )
    )
  );

-- Engineers can insert their own bank transfer account
CREATE POLICY "Engineers can insert their own bank transfer account" ON billing_engineer_bank_transfer_accounts
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid()) AND type = 'engineer'
    )
  );
