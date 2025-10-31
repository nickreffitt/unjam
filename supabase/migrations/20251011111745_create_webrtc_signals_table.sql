-- Create webrtc_signal_type enum
CREATE TYPE webrtc_signal_type AS ENUM (
  'offer',
  'answer',
  'ice-candidate'
);

-- Create webrtc_signals table
CREATE TABLE webrtc_signals (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES screenshare_sessions(id) ON DELETE CASCADE,
  from_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type webrtc_signal_type NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX webrtc_signals_ticket_id_idx ON webrtc_signals (ticket_id);
CREATE INDEX webrtc_signals_session_id_idx ON webrtc_signals (session_id);
CREATE INDEX webrtc_signals_to_id_idx ON webrtc_signals (to_id);
CREATE INDEX webrtc_signals_created_at_idx ON webrtc_signals (created_at ASC);

-- Create composite index for unprocessed signal queries (session_id + to_id + processed)
CREATE INDEX webrtc_signals_session_to_unprocessed_idx ON webrtc_signals (session_id, to_id, processed) WHERE processed = FALSE;

-- Create updated_at trigger
CREATE TRIGGER update_webrtc_signals_updated_at BEFORE UPDATE ON webrtc_signals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE webrtc_signals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Consolidated SELECT policy (combines signals addressed to user + signals sent by user)
CREATE POLICY "Consolidated: View webrtc signals" ON webrtc_signals
  FOR SELECT USING (
    -- Users can view signals addressed to them
    to_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
    OR
    -- Users can view signals they sent
    from_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
  );

-- Users can create signals (from their own profile)
CREATE POLICY "Users can create signals" ON webrtc_signals
  FOR INSERT WITH CHECK (
    from_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
  );

-- Users can update signals addressed to them (for marking as processed)
CREATE POLICY "Users can update signals addressed to them" ON webrtc_signals
  FOR UPDATE USING (
    to_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
  );

-- Users can delete signals for sessions they're part of
CREATE POLICY "Users can delete signals for their sessions" ON webrtc_signals
  FOR DELETE USING (
    from_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
    OR
    to_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
  );

-- Enable realtime for webrtc_signals table
ALTER publication supabase_realtime ADD TABLE webrtc_signals;

-- Create a trigger function to broadcast signal changes
-- webrtc-signals-{ticket_id}: For signals in a specific ticket (only creator and assignee receive)
CREATE OR REPLACE FUNCTION public.broadcast_webrtc_signal_changes()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle INSERT events (new signals)
  IF TG_OP = 'INSERT' THEN
    PERFORM realtime.broadcast_changes(
      'webrtc-signals-' || NEW.ticket_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
    RETURN NEW;
  END IF;

  -- Handle UPDATE events (signal processed status, etc.)
  IF TG_OP = 'UPDATE' THEN
    PERFORM realtime.broadcast_changes(
      'webrtc-signals-' || NEW.ticket_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
    RETURN NEW;
  END IF;

  -- Handle DELETE events (cleanup)
  IF TG_OP = 'DELETE' THEN
    PERFORM realtime.broadcast_changes(
      'webrtc-signals-' || OLD.ticket_id::text,
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

-- Create a trigger to execute the function on signal changes
CREATE TRIGGER handle_webrtc_signal_changes
AFTER INSERT OR UPDATE OR DELETE
ON public.webrtc_signals
FOR EACH ROW
EXECUTE FUNCTION broadcast_webrtc_signal_changes();

-- Create Realtime Authorization policies for broadcast channels
-- Allow authenticated users to subscribe to specific ticket webrtc signal channels
-- Users can only subscribe to channels for tickets they created or are assigned to
CREATE POLICY "Users can subscribe to their ticket webrtc signal broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'webrtc-signals-%'
  AND (
    -- User is the creator of the ticket
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id::text = REPLACE(realtime.topic(), 'webrtc-signals-', '')
      AND tickets.created_by IN (
        SELECT id FROM profiles WHERE auth_id = (select auth.uid())
      )
    )
    OR
    -- User is assigned to the ticket
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id::text = REPLACE(realtime.topic(), 'webrtc-signals-', '')
      AND tickets.assigned_to IN (
        SELECT id FROM profiles WHERE auth_id = (select auth.uid())
      )
    )
  )
);
