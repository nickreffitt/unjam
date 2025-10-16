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
-- Users can only view their own GitHub integration
CREATE POLICY "Users can view their own GitHub integration" ON github_integrations
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );

-- Users can insert their own GitHub integration
CREATE POLICY "Users can create their own GitHub integration" ON github_integrations
  FOR INSERT WITH CHECK (
    customer_id IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );

-- Users can update their own GitHub integration
CREATE POLICY "Users can update their own GitHub integration" ON github_integrations
  FOR UPDATE USING (
    customer_id IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );

-- Users can delete their own GitHub integration
CREATE POLICY "Users can delete their own GitHub integration" ON github_integrations
  FOR DELETE USING (
    customer_id IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );

-- Enable realtime for github_integrations table
ALTER publication supabase_realtime ADD TABLE github_integrations;
