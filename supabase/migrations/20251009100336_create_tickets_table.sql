-- Create ticket_status enum
CREATE TYPE ticket_status AS ENUM (
  'waiting',
  'in-progress',
  'awaiting-confirmation',
  'marked-resolved',
  'completed',
  'auto-completed'
);

-- Create tickets table
CREATE TABLE tickets (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  status ticket_status NOT NULL DEFAULT 'waiting',
  summary TEXT NOT NULL,
  estimated_time TEXT NOT NULL,
  problem_description TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  claimed_at TIMESTAMP WITH TIME ZONE,
  abandoned_at TIMESTAMP WITH TIME ZONE,
  marked_as_fixed_at TIMESTAMP WITH TIME ZONE,
  auto_complete_timeout_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX tickets_status_idx ON tickets (status);
CREATE INDEX tickets_created_by_idx ON tickets (created_by);
CREATE INDEX tickets_assigned_to_idx ON tickets (assigned_to);
CREATE INDEX tickets_created_at_idx ON tickets (created_at DESC);

-- Create composite index for engineer queries (assigned_to + status)
CREATE INDEX tickets_assigned_to_status_idx ON tickets (assigned_to, status);

-- Create updated_at trigger
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- All authenticated users can view all tickets
CREATE POLICY "Authenticated users can view all tickets" ON tickets
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can create tickets (customers creating their own tickets)
CREATE POLICY "Users can create tickets" ON tickets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update tickets they created (customers marking as complete)
CREATE POLICY "Users can update tickets they created" ON tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_id = auth.uid()
      AND profiles.id = tickets.created_by
    )
  );

-- Users can update tickets assigned to them (engineers working on tickets)
CREATE POLICY "Users can update tickets assigned to them" ON tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_id = auth.uid()
      AND profiles.id = tickets.assigned_to
    )
  );

-- Engineers can claim waiting tickets (assign themselves to unassigned tickets)
CREATE POLICY "Engineers can claim waiting tickets" ON tickets
  FOR UPDATE USING (
    tickets.status = 'waiting'
    AND tickets.assigned_to IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_id = auth.uid()
      AND profiles.type = 'engineer'
    )
  );

-- Users can delete tickets they created
CREATE POLICY "Users can delete their own tickets" ON tickets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_id = auth.uid()
      AND profiles.id = tickets.created_by
    )
  );

-- Enable realtime for tickets table
ALTER publication supabase_realtime ADD TABLE tickets;

-- Create a trigger function to broadcast ticket changes to appropriate channels
-- ticket-new: For new tickets (INSERT) and claim events (waiting -> in-progress)
-- ticket-changes-{id}: For updates to claimed tickets (only creator and assignee receive)
CREATE OR REPLACE FUNCTION public.broadcast_ticket_changes()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle INSERT events (new tickets) - broadcast to ticket-new channel
  IF TG_OP = 'INSERT' THEN
    PERFORM realtime.broadcast_changes(
      'ticket-new',
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
    -- If ticket is being claimed (waiting -> in-progress), broadcast to ticket-new channel
    IF OLD.status = 'waiting' AND NEW.status = 'in-progress' THEN
      PERFORM realtime.broadcast_changes(
        'ticket-new',
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        NEW,
        OLD
      );
    ELSE
      -- Otherwise, broadcast to the specific ticket channel for claimed tickets
      PERFORM realtime.broadcast_changes(
        'ticket-changes-' || NEW.id::text,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        NEW,
        OLD
      );
    END IF;
    RETURN NEW;
  END IF;

  -- Handle DELETE events (if needed in future)
  IF TG_OP = 'DELETE' THEN
    PERFORM realtime.broadcast_changes(
      'ticket-changes-' || OLD.id::text,
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

-- Create a trigger to execute the function on ticket changes
CREATE TRIGGER handle_ticket_changes
AFTER INSERT OR UPDATE OR DELETE
ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION broadcast_ticket_changes();

-- Create Realtime Authorization policies for broadcast channels
-- Allow all authenticated users to subscribe to new ticket broadcasts
CREATE POLICY "Authenticated users can subscribe to new ticket broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'ticket-new'
);

-- Allow authenticated users to subscribe to specific ticket update channels
-- Users can only subscribe to channels for tickets they created or are assigned to
CREATE POLICY "Users can subscribe to their ticket update broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'ticket-changes-%'
  AND (
    -- User is the creator of the ticket
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id::text = REPLACE(realtime.topic(), 'ticket-changes-', '')
      AND tickets.created_by IN (
        SELECT id FROM profiles WHERE auth_id = auth.uid()
      )
    )
    OR
    -- User is assigned to the ticket
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id::text = REPLACE(realtime.topic(), 'ticket-changes-', '')
      AND tickets.assigned_to IN (
        SELECT id FROM profiles WHERE auth_id = auth.uid()
      )
    )
  )
);
