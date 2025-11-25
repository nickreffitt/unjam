-- Add batch_group_item_id column to engineer_transfers table
-- This links individual transfers to their aggregated batch group item
-- Created after billing_batch_group_items table exists (20251122100000)

ALTER TABLE engineer_transfers
ADD COLUMN batch_group_item_id UUID;

-- Add foreign key constraint
ALTER TABLE engineer_transfers
ADD CONSTRAINT fk_batch_group_item
  FOREIGN KEY (batch_group_item_id)
  REFERENCES billing_batch_group_items(id)
  ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX engineer_transfers_batch_group_item_id_idx
ON engineer_transfers (batch_group_item_id);

-- Add comment explaining the batch_group_item_id column
COMMENT ON COLUMN engineer_transfers.batch_group_item_id IS 'Foreign key to the batch group item that aggregates this transfer with others for the same engineer';
