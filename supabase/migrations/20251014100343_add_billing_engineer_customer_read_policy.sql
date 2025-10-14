-- Add RLS policy to allow customers to read engineer billing accounts
-- when they have tickets with those engineers

-- Customers can read billing engineer accounts for engineers they have tickets with
CREATE POLICY "Customers can read engineer billing accounts for their tickets" ON billing_engineers
  FOR SELECT USING (
    profile_id IN (
      SELECT assigned_to FROM tickets
      WHERE created_by IN (
        SELECT id FROM profiles WHERE auth_id = auth.uid()
      )
    )
  );
