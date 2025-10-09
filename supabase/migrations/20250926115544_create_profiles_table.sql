-- Create user_type enum
CREATE TYPE user_type AS ENUM ('customer', 'engineer');

-- Create profiles table
CREATE TABLE profiles (
  id UUID NOT NULL PRIMARY KEY,
  auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type user_type NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  github_username TEXT,
  specialties TEXT[] DEFAULT '{}',
  extension_installed_at TIMESTAMP WITH TIME ZONE,
  extension_installed_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on auth_id to ensure one profile per auth user
ALTER TABLE profiles ADD CONSTRAINT profiles_auth_id_unique UNIQUE (auth_id);

-- Create unique constraint on github_username to prevent duplicates (when not null)
ALTER TABLE profiles ADD CONSTRAINT profiles_github_username_unique UNIQUE (github_username);

-- Create index on email for faster lookups
CREATE INDEX profiles_email_idx ON profiles (email);

-- Create index on type for faster filtering
CREATE INDEX profiles_type_idx ON profiles (type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read all profiles
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

-- Users can only create/update their own profile
CREATE POLICY "Users can create their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = auth_id);

-- Only allow users to delete their own profile
CREATE POLICY "Users can delete their own profile" ON profiles
  FOR DELETE USING (auth.uid() = auth_id);

ALTER publication supabase_realtime ADD TABLE profiles;