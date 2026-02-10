-- Migration: Add authentication and promoted tracks support
-- This file creates the necessary tables and policies for admin authentication
-- and promoted tracks functionality

-- 1. Create admins table to track admin users
CREATE TABLE IF NOT EXISTS admins (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Create promoted_tracks table to persist track promotions
CREATE TABLE IF NOT EXISTS promoted_tracks (
  id BIGSERIAL PRIMARY KEY,
  track_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(track_id)
);

-- 3. Add Row Level Security (RLS) policies

-- Enable RLS on admins table
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read admins (to check if user is admin)
CREATE POLICY "Allow read access to admins table"
  ON admins FOR SELECT
  TO authenticated, anon
  USING (true);

-- Enable RLS on promoted_tracks table
ALTER TABLE promoted_tracks ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read promoted tracks (to display them)
CREATE POLICY "Allow read access to promoted tracks"
  ON promoted_tracks FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy: Only admins can insert promoted tracks
CREATE POLICY "Only admins can promote tracks"
  ON promoted_tracks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- Policy: Only admins can delete promoted tracks
CREATE POLICY "Only admins can unpromote tracks"
  ON promoted_tracks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);
CREATE INDEX IF NOT EXISTS idx_promoted_tracks_track_id ON promoted_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_promoted_tracks_created_by ON promoted_tracks(created_by);

-- 5. Add a helper function to check if a user is an admin (optional)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins WHERE admins.user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- INSTRUCTIONS:
-- After running this migration, you need to manually add admin users:
-- 
-- 1. Create a user account through Supabase Auth
-- 2. Get their user_id from the auth.users table
-- 3. Insert them into the admins table:
--    INSERT INTO admins (user_id) VALUES ('their-uuid-here');
