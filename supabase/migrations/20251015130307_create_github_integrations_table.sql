-- Create github_integrations table
-- Stores GitHub OAuth tokens for authenticated customers
CREATE TABLE github_integrations (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE,
  github_access_token TEXT NOT NULL,
  github_username TEXT NOT NULL,
  github_user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT github_integrations_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE
);

-- Create unique index on customer_id to ensure one GitHub integration per customer
CREATE UNIQUE INDEX github_integrations_customer_id_idx ON github_integrations (customer_id);

-- Create index on github_username for faster lookups
CREATE INDEX github_integrations_github_username_idx ON github_integrations (github_username);

-- Create index on github_user_id for faster lookups
CREATE INDEX github_integrations_github_user_id_idx ON github_integrations (github_user_id);

-- Create updated_at trigger
CREATE TRIGGER update_github_integrations_updated_at BEFORE UPDATE ON github_integrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE github_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Customers can view their own GitHub integration
CREATE POLICY "Customers can view their own GitHub integration" ON github_integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = github_integrations.customer_id
      AND profiles.auth_id = auth.uid()
      AND profiles.type = 'customer'
    )
  );

-- Customers can insert their own GitHub integration
CREATE POLICY "Customers can insert their own GitHub integration" ON github_integrations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = customer_id
      AND profiles.auth_id = auth.uid()
      AND profiles.type = 'customer'
    )
  );

-- Customers can update their own GitHub integration
CREATE POLICY "Customers can update their own GitHub integration" ON github_integrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = github_integrations.customer_id
      AND profiles.auth_id = auth.uid()
      AND profiles.type = 'customer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = customer_id
      AND profiles.auth_id = auth.uid()
      AND profiles.type = 'customer'
    )
  );

-- Customers can delete their own GitHub integration
CREATE POLICY "Customers can delete their own GitHub integration" ON github_integrations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = github_integrations.customer_id
      AND profiles.auth_id = auth.uid()
      AND profiles.type = 'customer'
    )
  );

-- Enable realtime for github_integrations table
ALTER publication supabase_realtime ADD TABLE github_integrations;

-- Create a trigger function to broadcast GitHub integration changes
CREATE OR REPLACE FUNCTION public.broadcast_github_integration_changes()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle INSERT events
  IF TG_OP = 'INSERT' THEN
    PERFORM realtime.broadcast_changes(
      'github-integration-' || NEW.customer_id::text,
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
      'github-integration-' || NEW.customer_id::text,
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
      'github-integration-' || OLD.customer_id::text,
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

-- Create a trigger to execute the function on GitHub integration changes
CREATE TRIGGER handle_github_integration_changes
AFTER INSERT OR UPDATE OR DELETE
ON public.github_integrations
FOR EACH ROW
EXECUTE FUNCTION broadcast_github_integration_changes();

-- Create Realtime Authorization policy for broadcast channel
-- Allow customers to subscribe to their own GitHub integration broadcasts
CREATE POLICY "Customers can subscribe to their GitHub integration broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'github-integration-%'
);
