-- Create repository_collaborators table
-- Tracks engineer collaborators added per ticket
CREATE TABLE repository_collaborators (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  repository_id UUID NOT NULL,
  engineer_id UUID NOT NULL,
  github_username TEXT NOT NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  removed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT repository_collaborators_ticket_id_fkey
    FOREIGN KEY (ticket_id)
    REFERENCES tickets(id)
    ON DELETE CASCADE,
  CONSTRAINT repository_collaborators_repository_id_fkey
    FOREIGN KEY (repository_id)
    REFERENCES project_repositories(id)
    ON DELETE CASCADE,
  CONSTRAINT repository_collaborators_engineer_id_fkey
    FOREIGN KEY (engineer_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE,
  UNIQUE(ticket_id, repository_id, engineer_id)
);

-- Create index on ticket_id for faster lookups
CREATE INDEX repository_collaborators_ticket_id_idx ON repository_collaborators (ticket_id);

-- Create index on repository_id for faster lookups
CREATE INDEX repository_collaborators_repository_id_idx ON repository_collaborators (repository_id);

-- Create index on engineer_id for faster lookups
CREATE INDEX repository_collaborators_engineer_id_idx ON repository_collaborators (engineer_id);

-- Create index on github_username for faster lookups
CREATE INDEX repository_collaborators_github_username_idx ON repository_collaborators (github_username);

-- Enable Row Level Security
ALTER TABLE repository_collaborators ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view collaborators for their own tickets (either as customer or engineer)
CREATE POLICY "Users can view collaborators for their tickets" ON repository_collaborators
  FOR SELECT USING (
    ticket_id IN (
      SELECT id FROM tickets
      WHERE created_by IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
      OR assigned_to IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
    )
  );

-- Only service role can insert collaborators (via Edge Function)
CREATE POLICY "Service role can insert collaborators" ON repository_collaborators
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Only service role can update collaborators (via Edge Function)
CREATE POLICY "Service role can update collaborators" ON repository_collaborators
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Only service role can delete collaborators (via Edge Function)
CREATE POLICY "Service role can delete collaborators" ON repository_collaborators
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Enable realtime for repository_collaborators table
ALTER publication supabase_realtime ADD TABLE repository_collaborators;

-- Create a trigger function to broadcast repository collaborator changes
-- Note: We need to get the customer_id from the ticket to broadcast to the right channel
CREATE OR REPLACE FUNCTION public.broadcast_repository_collaborator_changes()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Get customer_id from the ticket
  IF TG_OP = 'DELETE' THEN
    SELECT created_by INTO v_customer_id
    FROM tickets
    WHERE id = OLD.ticket_id;
  ELSE
    SELECT created_by INTO v_customer_id
    FROM tickets
    WHERE id = NEW.ticket_id;
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
-- Allow users involved in tickets to subscribe to collaborator broadcasts
CREATE POLICY "Users can subscribe to their repository collaborator broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'repository-collaborators-%'
);
