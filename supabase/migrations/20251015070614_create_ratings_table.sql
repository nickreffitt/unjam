-- Create ratings table
-- Stores ratings for completed tickets (customer rates engineer, engineer rates customer)
CREATE TABLE ratings (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  rating_for UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 500),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_ticket
    FOREIGN KEY (ticket_id)
    REFERENCES tickets(id)
    ON DELETE CASCADE,
  CONSTRAINT ratings_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES profiles(id)
    ON DELETE CASCADE,
  CONSTRAINT ratings_rating_for_fkey
    FOREIGN KEY (rating_for)
    REFERENCES profiles(id)
    ON DELETE CASCADE
);

-- Create unique index on ticket_id to prevent duplicate ratings for same ticket
CREATE UNIQUE INDEX ratings_ticket_id_idx ON ratings (ticket_id);

-- Create index on created_by for filtering ratings by creator
CREATE INDEX ratings_created_by_idx ON ratings (created_by);

-- Create index on rating_for for filtering ratings by rated user
CREATE INDEX ratings_rating_for_idx ON ratings (rating_for);

-- Create index on created_at for sorting by date
CREATE INDEX ratings_created_at_idx ON ratings (created_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON ratings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read ratings they created
CREATE POLICY "Users can read ratings they created" ON ratings
  FOR SELECT USING (
    created_by IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );

-- Users can read ratings for them (ratings they received)
CREATE POLICY "Users can read ratings for them" ON ratings
  FOR SELECT USING (
    rating_for IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );

-- Users can create ratings for tickets they are involved in
-- (Either as creator or assignee of the ticket)
CREATE POLICY "Users can create ratings for their tickets" ON ratings
  FOR INSERT WITH CHECK (
    created_by IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
    AND ticket_id IN (
      SELECT id FROM tickets
      WHERE created_by IN (
        SELECT id FROM profiles WHERE auth_id = auth.uid()
      )
      OR assigned_to IN (
        SELECT id FROM profiles WHERE auth_id = auth.uid()
      )
    )
  );

-- Users can update ratings they created
CREATE POLICY "Users can update their own ratings" ON ratings
  FOR UPDATE USING (
    created_by IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );

-- Enable realtime for ratings table
ALTER publication supabase_realtime ADD TABLE ratings;
