-- Create repository_collaborators table
-- Tracks engineer collaborators added per repository (repository-level access, not ticket-specific)
CREATE TABLE repository_collaborators (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL,
  engineer_id UUID NOT NULL,
  github_username TEXT NOT NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  removed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT repository_collaborators_repository_id_fkey
    FOREIGN KEY (repository_id)
    REFERENCES project_repositories(id)
    ON DELETE CASCADE,
  CONSTRAINT repository_collaborators_engineer_id_fkey
    FOREIGN KEY (engineer_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE,
  UNIQUE(repository_id, engineer_id)
);

-- Create index on repository_id for faster lookups
CREATE INDEX repository_collaborators_repository_id_idx ON repository_collaborators (repository_id);

-- Create index on engineer_id for faster lookups
CREATE INDEX repository_collaborators_engineer_id_idx ON repository_collaborators (engineer_id);

-- Create index on github_username for faster lookups
CREATE INDEX repository_collaborators_github_username_idx ON repository_collaborators (github_username);

-- Enable Row Level Security
ALTER TABLE repository_collaborators ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view collaborators for repositories they own
CREATE POLICY "Users can view collaborators for their repositories" ON repository_collaborators
  FOR SELECT USING (
    repository_id IN (
      SELECT id FROM project_repositories
      WHERE customer_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
    )
  );

-- Allow authenticated users to insert collaborators for repositories they own
CREATE POLICY "Users can insert collaborators for their repositories" ON repository_collaborators
  FOR INSERT WITH CHECK (
    repository_id IN (
      SELECT id FROM project_repositories
      WHERE customer_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
    )
  );

-- Allow authenticated users to update collaborators for repositories they own
CREATE POLICY "Users can update collaborators for their repositories" ON repository_collaborators
  FOR UPDATE USING (
    repository_id IN (
      SELECT id FROM project_repositories
      WHERE customer_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
    )
  );

-- Allow authenticated users to delete collaborators for repositories they own
CREATE POLICY "Users can delete collaborators for their repositories" ON repository_collaborators
  FOR DELETE USING (
    repository_id IN (
      SELECT id FROM project_repositories
      WHERE customer_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
    )
  );

-- Enable realtime for repository_collaborators table
ALTER publication supabase_realtime ADD TABLE repository_collaborators;

-- Create a trigger function to broadcast repository collaborator changes
-- Broadcasts to customer's channel based on repository ownership
CREATE OR REPLACE FUNCTION public.broadcast_repository_collaborator_changes()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Get customer_id from the repository
  IF TG_OP = 'DELETE' THEN
    SELECT customer_id INTO v_customer_id
    FROM project_repositories
    WHERE id = OLD.repository_id;
  ELSE
    SELECT customer_id INTO v_customer_id
    FROM project_repositories
    WHERE id = NEW.repository_id;
  END IF;

  -- Handle INSERT events
  IF TG_OP = 'INSERT' THEN
    PERFORM realtime.broadcast_changes(
      'repository-collaborators-' || v_customer_id::text,
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
      'repository-collaborators-' || v_customer_id::text,
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
      'repository-collaborators-' || v_customer_id::text,
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

-- Create a trigger to execute the function on repository collaborator changes
CREATE TRIGGER handle_repository_collaborator_changes
AFTER INSERT OR UPDATE OR DELETE
ON public.repository_collaborators
FOR EACH ROW
EXECUTE FUNCTION broadcast_repository_collaborator_changes();

-- Create Realtime Authorization policy for broadcast channel
-- Allow authenticated users to subscribe to repository collaborator broadcasts
CREATE POLICY "Users can subscribe to their repository collaborator broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'repository-collaborators-%'
);
