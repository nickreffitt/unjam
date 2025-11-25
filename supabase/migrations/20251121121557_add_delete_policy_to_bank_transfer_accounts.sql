-- Add DELETE policy for engineers to delete their own bank transfer account
CREATE POLICY "Engineers can delete their own bank transfer account" ON billing_engineer_bank_transfer_accounts
  FOR DELETE USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid()) AND type = 'engineer'
    )
  );
