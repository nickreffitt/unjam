-- Add RLS policy to allow engineers to view their own collaborator records
-- This fixes the issue where engineers couldn't see repository_collaborators rows where they are the engineer

-- Engineers can view collaborator records where they are the engineer
CREATE POLICY "Engineers can view their own collaborator records" ON repository_collaborators
  FOR SELECT USING (
    engineer_id IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );
