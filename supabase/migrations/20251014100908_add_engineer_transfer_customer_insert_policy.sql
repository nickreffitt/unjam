-- Add RLS policy to allow customers to create engineer transfer records
-- for their own tickets

-- Customers can insert transfer records for tickets they created
CREATE POLICY "Customers can insert transfers for their tickets" ON engineer_transfers
  FOR INSERT WITH CHECK (
    customer_id IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );

-- Customers can update transfer records for their tickets (needed for retry logic)
CREATE POLICY "Customers can update transfers for their tickets" ON engineer_transfers
  FOR UPDATE USING (
    customer_id IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );
