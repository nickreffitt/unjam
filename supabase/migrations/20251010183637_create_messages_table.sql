-- Create messages table
CREATE TABLE messages (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX messages_ticket_id_idx ON messages (ticket_id);
CREATE INDEX messages_sender_id_idx ON messages (sender_id);
CREATE INDEX messages_receiver_id_idx ON messages (receiver_id);
CREATE INDEX messages_created_at_idx ON messages (created_at DESC);

-- Create composite index for ticket message queries (ticket_id + created_at)
CREATE INDEX messages_ticket_id_created_at_idx ON messages (ticket_id, created_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view messages for tickets they created or are assigned to
CREATE POLICY "Users can view messages for their tickets" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = messages.ticket_id
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

-- Users can create messages for tickets they created or are assigned to
CREATE POLICY "Users can create messages for their tickets" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = messages.ticket_id
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

-- Consolidated UPDATE policy (combines messages sent + messages received)
CREATE POLICY "Consolidated: Update messages" ON messages
  FOR UPDATE USING (
    -- Users can update messages they sent (for marking as read)
    sender_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
    OR
    -- Users can update messages they received (for marking as read)
    receiver_id IN (
      SELECT id FROM profiles WHERE auth_id = (select auth.uid())
    )
  );

-- Enable realtime for messages table
ALTER publication supabase_realtime ADD TABLE messages;

-- Create a trigger function to broadcast message changes
-- chat-{ticket_id}: For messages in a specific ticket (only creator and assignee receive)
CREATE OR REPLACE FUNCTION public.broadcast_message_changes()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle INSERT events (new messages)
  IF TG_OP = 'INSERT' THEN
    PERFORM realtime.broadcast_changes(
      'chat-' || NEW.ticket_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
    RETURN NEW;
  END IF;

  -- Handle UPDATE events (message read status, etc.)
  IF TG_OP = 'UPDATE' THEN
    PERFORM realtime.broadcast_changes(
      'chat-' || NEW.ticket_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
    RETURN NEW;
  END IF;

  -- Handle DELETE events (if needed in future)
  IF TG_OP = 'DELETE' THEN
    PERFORM realtime.broadcast_changes(
      'chat-' || OLD.ticket_id::text,
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

-- Create a trigger to execute the function on message changes
CREATE TRIGGER handle_message_changes
AFTER INSERT OR UPDATE OR DELETE
ON public.messages
FOR EACH ROW
EXECUTE FUNCTION broadcast_message_changes();

-- Create Realtime Authorization policies for broadcast channels
-- Allow authenticated users to subscribe to specific ticket message channels
-- Users can only subscribe to channels for tickets they created or are assigned to
CREATE POLICY "Users can subscribe to their ticket chat broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'chat-%'
  AND (
    -- User is the creator of the ticket
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id::text = REPLACE(realtime.topic(), 'chat-', '')
      AND tickets.created_by IN (
        SELECT id FROM profiles WHERE auth_id = (select auth.uid())
      )
    )
    OR
    -- User is assigned to the ticket
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id::text = REPLACE(realtime.topic(), 'chat-', '')
      AND tickets.assigned_to IN (
        SELECT id FROM profiles WHERE auth_id = (select auth.uid())
      )
    )
  )
);
