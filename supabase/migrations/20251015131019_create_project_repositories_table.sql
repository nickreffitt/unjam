-- Create project_repositories table
-- Maps external project URLs to GitHub repositories
CREATE TABLE project_repositories (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  external_project_url TEXT NOT NULL,
  external_platform TEXT NOT NULL,
  external_project_id TEXT NOT NULL,
  github_repo_url TEXT NOT NULL,
  github_owner TEXT NOT NULL,
  github_repo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT project_repositories_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE,
  UNIQUE(customer_id, external_project_url)
);

-- Create index on customer_id for faster lookups
CREATE INDEX project_repositories_customer_id_idx ON project_repositories (customer_id);

-- Create index on external_project_url for faster lookups
CREATE INDEX project_repositories_external_project_url_idx ON project_repositories (external_project_url);

-- Create index on external_platform for filtering by platform
CREATE INDEX project_repositories_external_platform_idx ON project_repositories (external_platform);

-- Create composite index for customer + platform queries
CREATE INDEX project_repositories_customer_platform_idx ON project_repositories (customer_id, external_platform);

-- Create updated_at trigger
CREATE TRIGGER update_project_repositories_updated_at BEFORE UPDATE ON project_repositories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE project_repositories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Consolidated SELECT policy (combines customer own repositories + engineer assigned ticket repositories)
CREATE POLICY "Consolidated: View project repositories" ON project_repositories
  FOR SELECT USING (
    -- Customers can view their own repositories
    customer_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
    OR
    -- Engineers can view repositories for customers whose tickets they are assigned to
    EXISTS (
      SELECT 1 FROM tickets
      INNER JOIN profiles ON profiles.id = tickets.assigned_to
      WHERE profiles.auth_id = (select auth.uid())
      AND profiles.type = 'engineer'
      AND tickets.created_by = project_repositories.customer_id
    )
  );

-- Customers can create their own repositories
CREATE POLICY "Customers can create their own repositories" ON project_repositories
  FOR INSERT WITH CHECK (
    customer_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
  );

-- Customers can update their own repositories
CREATE POLICY "Customers can update their own repositories" ON project_repositories
  FOR UPDATE USING (
    customer_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
  );

-- Customers can delete their own repositories
CREATE POLICY "Customers can delete their own repositories" ON project_repositories
  FOR DELETE USING (
    customer_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
  );

-- Enable realtime for project_repositories table
ALTER publication supabase_realtime ADD TABLE project_repositories;

-- Create a trigger function to broadcast project repository changes
CREATE OR REPLACE FUNCTION public.broadcast_project_repository_changes()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle INSERT events
  IF TG_OP = 'INSERT' THEN
    PERFORM realtime.broadcast_changes(
      'project-repositories-' || NEW.customer_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
    RETURN NEW;
  END IF;

  -- Handle UPDATE events
  IF TG_OP = 'UPDATE' THEN
    PERFORM realtime.broadcast_changes(
      'project-repositories-' || NEW.customer_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
    RETURN NEW;
  END IF;

  -- Handle DELETE events
  IF TG_OP = 'DELETE' THEN
    PERFORM realtime.broadcast_changes(
      'project-repositories-' || OLD.customer_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Create a trigger to execute the function on project repository changes
CREATE TRIGGER handle_project_repository_changes
AFTER INSERT OR UPDATE OR DELETE
ON public.project_repositories
FOR EACH ROW
EXECUTE FUNCTION broadcast_project_repository_changes();

-- Create Realtime Authorization policy for broadcast channel
-- Allow customers to subscribe to their own project repository broadcasts
CREATE POLICY "Customers can subscribe to their project repository broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'project-repositories-%'
);
