-- Add INSERT policy for engineers to create their own billing account
CREATE POLICY "Engineers can insert their own billing account" ON billing_engineers
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid() AND type = 'engineer'
    )
  );
