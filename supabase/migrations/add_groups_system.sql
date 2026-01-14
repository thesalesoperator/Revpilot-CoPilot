-- Groups System Migration
-- Adds groups and group memberships

-- ============================================
-- TABLE 1: Groups
-- ============================================
CREATE TABLE IF NOT EXISTS community_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_private BOOLEAN DEFAULT FALSE,
  member_count INTEGER DEFAULT 1,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE 2: Group Memberships
-- ============================================
CREATE TABLE IF NOT EXISTS group_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_community_groups_creator ON community_groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_community_groups_name ON community_groups(name);
CREATE INDEX IF NOT EXISTS idx_community_groups_member_count ON community_groups(member_count DESC);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON group_memberships(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: community_groups
-- ============================================
-- Anyone can view public groups
CREATE POLICY "Anyone can view public groups" ON community_groups
  FOR SELECT USING (is_private = FALSE OR creator_id = auth.uid() OR
    EXISTS (SELECT 1 FROM group_memberships WHERE group_id = id AND user_id = auth.uid()));

-- Any user can create a group
CREATE POLICY "Users can create groups" ON community_groups
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Only creator can update group
CREATE POLICY "Creator can update group" ON community_groups
  FOR UPDATE USING (auth.uid() = creator_id);

-- Only creator can delete group
CREATE POLICY "Creator can delete group" ON community_groups
  FOR DELETE USING (auth.uid() = creator_id);

-- ============================================
-- RLS POLICIES: group_memberships
-- ============================================
-- Members can view memberships of their groups
CREATE POLICY "Members can view group memberships" ON group_memberships
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM group_memberships gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM community_groups g WHERE g.id = group_id AND g.is_private = FALSE)
  );

-- Users can join groups (insert their own membership)
CREATE POLICY "Users can join groups" ON group_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can leave groups (delete their own membership)
CREATE POLICY "Users can leave groups" ON group_memberships
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER: Update member count on join/leave
-- ============================================
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_groups SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_group_membership_change
  AFTER INSERT OR DELETE ON group_memberships
  FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- ============================================
-- TRIGGER: Auto-add creator as admin member
-- ============================================
CREATE OR REPLACE FUNCTION add_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO group_memberships (group_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_group_created
  AFTER INSERT ON community_groups
  FOR EACH ROW EXECUTE FUNCTION add_creator_as_admin();

-- ============================================
-- TRIGGER: Update updated_at
-- ============================================
CREATE TRIGGER update_community_groups_updated_at
  BEFORE UPDATE ON community_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Seed some example groups
-- ============================================
-- Note: These are commented out - uncomment to seed
-- INSERT INTO community_groups (name, description, creator_id, is_private) VALUES
-- ('Enterprise Sales Pros', 'Strategies and tactics for closing enterprise deals', 'YOUR_USER_ID', FALSE),
-- ('Cold Calling Champions', 'Master the art of cold calling', 'YOUR_USER_ID', FALSE),
-- ('SaaS Sales Masterminds', 'For SaaS sales professionals', 'YOUR_USER_ID', FALSE);
