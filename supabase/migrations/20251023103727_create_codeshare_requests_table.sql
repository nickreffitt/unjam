-- Create codeshare_status enum
CREATE TYPE codeshare_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'expired'
);

-- Create codeshare_requests table
CREATE TABLE codeshare_requests (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status codeshare_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX codeshare_requests_sender_id_idx ON codeshare_requests (sender_id);
CREATE INDEX codeshare_requests_receiver_id_idx ON codeshare_requests (receiver_id);
CREATE INDEX codeshare_requests_status_idx ON codeshare_requests (status);
CREATE INDEX codeshare_requests_created_at_idx ON codeshare_requests (created_at DESC);
CREATE INDEX codeshare_requests_expires_at_idx ON codeshare_requests (expires_at);

-- Create composite indexes for active request queries
CREATE INDEX codeshare_requests_sender_status_expires_idx ON codeshare_requests (sender_id, status, expires_at) WHERE status IN ('pending', 'accepted', 'expired');
CREATE INDEX codeshare_requests_receiver_status_expires_idx ON codeshare_requests (receiver_id, status, expires_at) WHERE status IN ('pending', 'accepted', 'expired');

-- Create updated_at trigger
CREATE TRIGGER update_codeshare_requests_updated_at BEFORE UPDATE ON codeshare_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE codeshare_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view requests they sent or received
CREATE POLICY "Users can view their codeshare requests" ON codeshare_requests
  FOR SELECT USING (
    sender_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
    OR
    receiver_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
  );

-- Users can create requests as sender
CREATE POLICY "Users can create codeshare requests" ON codeshare_requests
  FOR INSERT WITH CHECK (
    -- User must be the sender of the request
    sender_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
  );

-- Users can update requests they sent or received
CREATE POLICY "Users can update codeshare requests they're involved in" ON codeshare_requests
  FOR UPDATE USING (
    sender_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
    OR
    receiver_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
  );

-- Users can delete requests they sent
CREATE POLICY "Users can delete codeshare requests they sent" ON codeshare_requests
  FOR DELETE USING (
    sender_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
  );

-- Enable realtime for codeshare_requests table
ALTER publication supabase_realtime ADD TABLE codeshare_requests;

-- Create a trigger function to broadcast codeshare request changes
-- Broadcasts to both sender and receiver specific channels
CREATE OR REPLACE FUNCTION public.broadcast_codeshare_request_changes()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle INSERT events (new requests)
  IF TG_OP = 'INSERT' THEN
    -- Broadcast to sender's channel
    PERFORM realtime.broadcast_changes(
      'codeshare-requests-' || NEW.sender_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
    -- Broadcast to receiver's channel
    PERFORM realtime.broadcast_changes(
      'codeshare-requests-' || NEW.receiver_id::text,
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
    -- Broadcast to sender's channel
    PERFORM realtime.broadcast_changes(
      'codeshare-requests-' || NEW.sender_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
    -- Broadcast to receiver's channel
    PERFORM realtime.broadcast_changes(
      'codeshare-requests-' || NEW.receiver_id::text,
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
    -- Broadcast to sender's channel
    PERFORM realtime.broadcast_changes(
      'codeshare-requests-' || OLD.sender_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
    -- Broadcast to receiver's channel
    PERFORM realtime.broadcast_changes(
      'codeshare-requests-' || OLD.receiver_id::text,
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

-- Create a trigger to execute the function on codeshare request changes
CREATE TRIGGER handle_codeshare_request_changes
AFTER INSERT OR UPDATE OR DELETE
ON public.codeshare_requests
FOR EACH ROW
EXECUTE FUNCTION broadcast_codeshare_request_changes();

-- Create Realtime Authorization policies for broadcast channels
-- Allow authenticated users to subscribe to their own codeshare request channels
CREATE POLICY "Users can subscribe to their codeshare request broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'codeshare-requests-%'
  AND
  -- User can only subscribe to their own channel (based on their profile ID)
  REPLACE(realtime.topic(), 'codeshare-requests-', '') IN (
    SELECT id::text FROM profiles WHERE auth_id = (select auth.uid())
  )
);
