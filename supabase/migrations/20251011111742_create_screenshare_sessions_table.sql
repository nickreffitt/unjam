-- Create session_status enum
CREATE TYPE session_status AS ENUM (
  'initializing',
  'active',
  'ended',
  'error',
  'disconnected'
);

-- Create screenshare_sessions table
CREATE TABLE screenshare_sessions (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES screenshare_requests(id) ON DELETE CASCADE,
  publisher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status session_status NOT NULL DEFAULT 'initializing',
  stream_id TEXT,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX screenshare_sessions_ticket_id_idx ON screenshare_sessions (ticket_id);
CREATE INDEX screenshare_sessions_request_id_idx ON screenshare_sessions (request_id);
CREATE INDEX screenshare_sessions_publisher_id_idx ON screenshare_sessions (publisher_id);
CREATE INDEX screenshare_sessions_subscriber_id_idx ON screenshare_sessions (subscriber_id);
CREATE INDEX screenshare_sessions_status_idx ON screenshare_sessions (status);
CREATE INDEX screenshare_sessions_started_at_idx ON screenshare_sessions (started_at DESC);
CREATE INDEX screenshare_sessions_last_activity_at_idx ON screenshare_sessions (last_activity_at DESC);

-- Create composite index for active session queries (ticket_id + status)
CREATE INDEX screenshare_sessions_ticket_status_idx ON screenshare_sessions (ticket_id, status) WHERE status IN ('initializing', 'active');

-- Enable Row Level Security
ALTER TABLE screenshare_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view sessions for tickets they created or are assigned to
CREATE POLICY "Users can view screenshare sessions for their tickets" ON screenshare_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = screenshare_sessions.ticket_id
      AND (
        -- User is the creator of the ticket
        tickets.created_by IN (
          SELECT id FROM profiles WHERE auth_id = (select auth.uid())
        )
        OR
        -- User is assigned to the ticket
        tickets.assigned_to IN (
          SELECT id FROM profiles WHERE auth_id = (select auth.uid())
        )
      )
    )
  );

-- Users can create sessions for tickets they created or are assigned to
CREATE POLICY "Users can create screenshare sessions for their tickets" ON screenshare_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = screenshare_sessions.ticket_id
      AND (
        -- User is the creator of the ticket
        tickets.created_by IN (
          SELECT id FROM profiles WHERE auth_id = (select auth.uid())
        )
        OR
        -- User is assigned to the ticket
        tickets.assigned_to IN (
          SELECT id FROM profiles WHERE auth_id = (select auth.uid())
        )
      )
    )
    AND
    -- User must be the publisher or subscriber of the session
    (
      publisher_id IN (
        SELECT id FROM profiles WHERE auth_id = (select auth.uid())
      )
      OR
      subscriber_id IN (
        SELECT id FROM profiles WHERE auth_id = (select auth.uid())
      )
    )
  );

-- Users can update sessions they're involved in
CREATE POLICY "Users can update screenshare sessions they're involved in" ON screenshare_sessions
  FOR UPDATE USING (
    publisher_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
    OR
    subscriber_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
  );

-- Users can delete sessions they're involved in
CREATE POLICY "Users can delete screenshare sessions they're involved in" ON screenshare_sessions
  FOR DELETE USING (
    publisher_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
    OR
    subscriber_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
  );

-- Enable realtime for screenshare_sessions table
ALTER publication supabase_realtime ADD TABLE screenshare_sessions;

-- Create a trigger function to broadcast screenshare session changes
-- screenshare-sessions-{ticket_id}: For sessions in a specific ticket (only creator and assignee receive)
CREATE OR REPLACE FUNCTION public.broadcast_screenshare_session_changes()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle INSERT events (new sessions)
  IF TG_OP = 'INSERT' THEN
    PERFORM realtime.broadcast_changes(
      'screenshare-sessions-' || NEW.ticket_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
    RETURN NEW;
  END IF;

  -- Handle UPDATE events (session status changes, etc.)
  IF TG_OP = 'UPDATE' THEN
    PERFORM realtime.broadcast_changes(
      'screenshare-sessions-' || NEW.ticket_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
    RETURN NEW;
  END IF;

  -- Handle DELETE events (session deletion)
  IF TG_OP = 'DELETE' THEN
    PERFORM realtime.broadcast_changes(
      'screenshare-sessions-' || OLD.ticket_id::text,
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

-- Create a trigger to execute the function on screenshare session changes
CREATE TRIGGER handle_screenshare_session_changes
AFTER INSERT OR UPDATE OR DELETE
ON public.screenshare_sessions
FOR EACH ROW
EXECUTE FUNCTION broadcast_screenshare_session_changes();

-- Create Realtime Authorization policies for broadcast channels
-- Allow authenticated users to subscribe to specific ticket screenshare session channels
-- Users can only subscribe to channels for tickets they created or are assigned to
CREATE POLICY "Users can subscribe to their ticket screenshare session broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'screenshare-sessions-%'
  AND (
    -- User is the creator of the ticket
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id::text = REPLACE(realtime.topic(), 'screenshare-sessions-', '')
      AND tickets.created_by IN (
        SELECT id FROM profiles WHERE auth_id = (select auth.uid())
      )
    )
    OR
    -- User is assigned to the ticket
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id::text = REPLACE(realtime.topic(), 'screenshare-sessions-', '')
      AND tickets.assigned_to IN (
        SELECT id FROM profiles WHERE auth_id = (select auth.uid())
      )
    )
  )
);
