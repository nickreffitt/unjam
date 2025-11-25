-- Create billing_batch_groups table
-- Tracks batch transfer groups for aggregating engineer payouts
CREATE TABLE billing_batch_groups (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  external_batch_group_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'DRAFTING',
  transfers JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create index on external_batch_group_id for faster lookups
CREATE INDEX billing_batch_groups_external_batch_group_id_idx ON billing_batch_groups (external_batch_group_id);

-- Create index on status for filtering by status
CREATE INDEX billing_batch_groups_status_idx ON billing_batch_groups (status);

-- Create updated_at trigger
CREATE TRIGGER update_billing_batch_groups_updated_at BEFORE UPDATE ON billing_batch_groups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE billing_batch_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Service role can manage all billing batch groups (for billing functions)
CREATE POLICY "Service role can manage all billing batch groups" ON billing_batch_groups
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add comments explaining the table purpose
COMMENT ON TABLE billing_batch_groups IS 'Tracks batch transfer groups for aggregating engineer payouts via Airwallex';
COMMENT ON COLUMN billing_batch_groups.external_batch_group_id IS 'The ID returned from Airwallex API when creating the batch';
COMMENT ON COLUMN billing_batch_groups.name IS 'Human-readable name for the batch group';
COMMENT ON COLUMN billing_batch_groups.version IS 'Version number for optimistic locking';
COMMENT ON COLUMN billing_batch_groups.status IS 'Status of the batch group from Airwallex';
COMMENT ON COLUMN billing_batch_groups.transfers IS 'JSON array of internal transfer IDs included in this batch';
COMMENT ON COLUMN billing_batch_groups.completed_at IS 'Timestamp when batch was successfully completed';
COMMENT ON COLUMN billing_batch_groups.cancelled_at IS 'Timestamp when batch was cancelled';
