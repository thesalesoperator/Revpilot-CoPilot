-- Friends System Migration
-- Adds friend requests and friendships tables

-- ============================================
-- TABLE 1: Friend Requests
-- ============================================
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id),
  CHECK (from_user_id != to_user_id)
);

-- ============================================
-- TABLE 2: Friendships (Bidirectional)
-- When a request is accepted, we create two rows for easy querying
-- ============================================
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_friend_requests_from_user ON friend_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user ON friend_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: friend_requests
-- ============================================
-- Users can view requests they sent or received
CREATE POLICY "Users can view own friend requests" ON friend_requests
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Users can send friend requests (as from_user)
CREATE POLICY "Users can send friend requests" ON friend_requests
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Users can update requests sent to them (accept/decline)
CREATE POLICY "Users can respond to friend requests" ON friend_requests
  FOR UPDATE USING (auth.uid() = to_user_id);

-- Users can delete requests they sent or received
CREATE POLICY "Users can delete friend requests" ON friend_requests
  FOR DELETE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- ============================================
-- RLS POLICIES: friendships
-- ============================================
-- Users can view their own friendships
CREATE POLICY "Users can view own friendships" ON friendships
  FOR SELECT USING (auth.uid() = user_id);

-- Only system (via trigger) should insert friendships, but allow for the user involved
CREATE POLICY "Users can create friendships" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own friendships (unfriend)
CREATE POLICY "Users can delete own friendships" ON friendships
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER: Auto-create friendships when request accepted
-- ============================================
CREATE OR REPLACE FUNCTION handle_friend_request_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Create bidirectional friendship entries
    INSERT INTO friendships (user_id, friend_id)
    VALUES (NEW.from_user_id, NEW.to_user_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;

    INSERT INTO friendships (user_id, friend_id)
    VALUES (NEW.to_user_id, NEW.from_user_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;

    -- Update friend counts in user_profiles_extended
    UPDATE user_profiles_extended
    SET follower_count = follower_count + 1
    WHERE user_id IN (NEW.from_user_id, NEW.to_user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION handle_friend_request_accepted();

-- ============================================
-- TRIGGER: Clean up when friendship deleted
-- ============================================
CREATE OR REPLACE FUNCTION handle_friendship_deleted()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the reverse friendship
  DELETE FROM friendships
  WHERE user_id = OLD.friend_id AND friend_id = OLD.user_id;

  -- Update friend counts
  UPDATE user_profiles_extended
  SET follower_count = GREATEST(0, follower_count - 1)
  WHERE user_id IN (OLD.user_id, OLD.friend_id);

  -- Clean up any friend requests between these users
  DELETE FROM friend_requests
  WHERE (from_user_id = OLD.user_id AND to_user_id = OLD.friend_id)
     OR (from_user_id = OLD.friend_id AND to_user_id = OLD.user_id);

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_friendship_deleted
  AFTER DELETE ON friendships
  FOR EACH ROW EXECUTE FUNCTION handle_friendship_deleted();

-- ============================================
-- Add friend_count column to user_profiles_extended
-- ============================================
ALTER TABLE user_profiles_extended
ADD COLUMN IF NOT EXISTS friend_count INTEGER DEFAULT 0;

-- ============================================
-- TRIGGER: Update updated_at on friend_requests
-- ============================================
CREATE TRIGGER update_friend_requests_updated_at
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
