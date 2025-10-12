-- Create screenshare_status enum
CREATE TYPE screenshare_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'cancelled',
  'active',
  'ended'
);

-- Create screenshare_requests table
CREATE TABLE screenshare_requests (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status screenshare_status NOT NULL DEFAULT 'pending',
  auto_accept BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX screenshare_requests_ticket_id_idx ON screenshare_requests (ticket_id);
CREATE INDEX screenshare_requests_sender_id_idx ON screenshare_requests (sender_id);
CREATE INDEX screenshare_requests_receiver_id_idx ON screenshare_requests (receiver_id);
CREATE INDEX screenshare_requests_status_idx ON screenshare_requests (status);
CREATE INDEX screenshare_requests_created_at_idx ON screenshare_requests (created_at DESC);
CREATE INDEX screenshare_requests_expires_at_idx ON screenshare_requests (expires_at);

-- Create composite index for active request queries (ticket_id + status + expires_at)
CREATE INDEX screenshare_requests_ticket_status_expires_idx ON screenshare_requests (ticket_id, status, expires_at) WHERE status IN ('pending', 'accepted', 'active');

-- Create updated_at trigger
CREATE TRIGGER update_screenshare_requests_updated_at BEFORE UPDATE ON screenshare_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE screenshare_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view requests for tickets they created or are assigned to
CREATE POLICY "Users can view screenshare requests for their tickets" ON screenshare_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = screenshare_requests.ticket_id
      AND (
        -- User is the creator of the ticket
        tickets.created_by IN (
          SELECT id FROM profiles WHERE auth_id = auth.uid()
        )
        OR
        -- User is assigned to the ticket
        tickets.assigned_to IN (
          SELECT id FROM profiles WHERE auth_id = auth.uid()
        )
      )
    )
  );

-- Users can create requests for tickets they created or are assigned to
CREATE POLICY "Users can create screenshare requests for their tickets" ON screenshare_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = screenshare_requests.ticket_id
      AND (
        -- User is the creator of the ticket
        tickets.created_by IN (
          SELECT id FROM profiles WHERE auth_id = auth.uid()
        )
        OR
        -- User is assigned to the ticket
        tickets.assigned_to IN (
          SELECT id FROM profiles WHERE auth_id = auth.uid()
        )
      )
    )
    AND
    -- User must be the sender of the request
    sender_id IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );

-- Users can update requests they sent or received
CREATE POLICY "Users can update screenshare requests they're involved in" ON screenshare_requests
  FOR UPDATE USING (
    sender_id IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
    OR
    receiver_id IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );

-- Users can delete requests they sent
CREATE POLICY "Users can delete screenshare requests they sent" ON screenshare_requests
  FOR DELETE USING (
    sender_id IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );

-- Enable realtime for screenshare_requests table
ALTER publication supabase_realtime ADD TABLE screenshare_requests;

-- Create a trigger function to broadcast screenshare request changes
-- screenshare-requests-{ticket_id}: For requests in a specific ticket (only creator and assignee receive)
CREATE OR REPLACE FUNCTION public.broadcast_screenshare_request_changes()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle INSERT events (new requests)
  IF TG_OP = 'INSERT' THEN
    PERFORM realtime.broadcast_changes(
      'screenshare-requests-' || NEW.ticket_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
    RETURN NEW;
  END IF;

  -- Handle UPDATE events (request status changes, etc.)
  IF TG_OP = 'UPDATE' THEN
    PERFORM realtime.broadcast_changes(
      'screenshare-requests-' || NEW.ticket_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
    RETURN NEW;
  END IF;

  -- Handle DELETE events (request cancellation)
  IF TG_OP = 'DELETE' THEN
    PERFORM realtime.broadcast_changes(
      'screenshare-requests-' || OLD.ticket_id::text,
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

-- Create a trigger to execute the function on screenshare request changes
CREATE TRIGGER handle_screenshare_request_changes
AFTER INSERT OR UPDATE OR DELETE
ON public.screenshare_requests
FOR EACH ROW
EXECUTE FUNCTION broadcast_screenshare_request_changes();

-- Create Realtime Authorization policies for broadcast channels
-- Allow authenticated users to subscribe to specific ticket screenshare request channels
-- Users can only subscribe to channels for tickets they created or are assigned to
CREATE POLICY "Users can subscribe to their ticket screenshare request broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'screenshare-requests-%'
  AND (
    -- User is the creator of the ticket
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id::text = REPLACE(realtime.topic(), 'screenshare-requests-', '')
      AND tickets.created_by IN (
        SELECT id FROM profiles WHERE auth_id = auth.uid()
      )
    )
    OR
    -- User is assigned to the ticket
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id::text = REPLACE(realtime.topic(), 'screenshare-requests-', '')
      AND tickets.assigned_to IN (
        SELECT id FROM profiles WHERE auth_id = auth.uid()
      )
    )
  )
);
