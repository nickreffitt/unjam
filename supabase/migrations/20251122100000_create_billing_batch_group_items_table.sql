-- Create billing_batch_group_items table
-- Tracks individual items added to Airwallex batch transfers, one per engineer
CREATE TABLE billing_batch_group_items (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_group_id UUID NOT NULL REFERENCES billing_batch_groups(id),
  external_batch_item_id TEXT NOT NULL,
  engineer_id UUID NOT NULL,
  beneficiary_id TEXT NOT NULL,
  total_amount INTEGER NOT NULL,
  total_platform_profit INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on batch_group_id for fetching items in a batch
CREATE INDEX billing_batch_group_items_batch_group_id_idx ON billing_batch_group_items (batch_group_id);

-- Create index on engineer_id for fetching items by engineer
CREATE INDEX billing_batch_group_items_engineer_id_idx ON billing_batch_group_items (engineer_id);

-- Create index on external_batch_item_id for lookups by Airwallex ID
CREATE INDEX billing_batch_group_items_external_batch_item_id_idx ON billing_batch_group_items (external_batch_item_id);

-- Create updated_at trigger
CREATE TRIGGER update_billing_batch_group_items_updated_at BEFORE UPDATE ON billing_batch_group_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE billing_batch_group_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Service role can manage all billing batch group items (for billing functions)
CREATE POLICY "Service role can manage all billing batch group items" ON billing_batch_group_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Engineers can view their own batch group items
CREATE POLICY "Engineers can view own billing batch group items" ON billing_batch_group_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE auth_id = (select auth.uid()) AND id = engineer_id AND type = 'engineer'
    )
  );

-- Add comments explaining the table purpose
COMMENT ON TABLE billing_batch_group_items IS 'Tracks individual items added to Airwallex batch transfers, one per engineer per batch';
COMMENT ON COLUMN billing_batch_group_items.batch_group_id IS 'Reference to the parent billing_batch_groups record';
COMMENT ON COLUMN billing_batch_group_items.external_batch_item_id IS 'The ID returned from Airwallex API when adding item to batch';
COMMENT ON COLUMN billing_batch_group_items.engineer_id IS 'The engineer profile ID this batch item is for';
COMMENT ON COLUMN billing_batch_group_items.beneficiary_id IS 'The Airwallex beneficiary_id used for the transfer';
COMMENT ON COLUMN billing_batch_group_items.total_amount IS 'Sum of amounts for engineer in cents';
COMMENT ON COLUMN billing_batch_group_items.total_platform_profit IS 'Sum of platform profits for engineer in cents';
COMMENT ON COLUMN billing_batch_group_items.status IS 'Status of the batch item (pending, completed, failed)';
