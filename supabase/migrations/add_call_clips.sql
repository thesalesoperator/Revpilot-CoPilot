-- Call Clips System Migration
-- Allows users to create and share clips from their sales calls

-- ============================================
-- TABLE 1: Call Clips
-- ============================================
CREATE TABLE IF NOT EXISTS call_clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_recording_id UUID REFERENCES call_recordings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  transcript_excerpt TEXT NOT NULL,
  -- Optional timestamp range (in seconds) for calls with timing data
  start_time INTEGER,
  end_time INTEGER,
  -- Categorization
  category TEXT CHECK (category IN ('objection_handling', 'closing', 'discovery', 'rapport', 'value_prop', 'negotiation', 'other')),
  tags TEXT[] DEFAULT '{}',
  -- Sharing settings
  is_shared BOOLEAN DEFAULT FALSE,
  shared_at TIMESTAMP WITH TIME ZONE,
  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE 2: Clip Likes
-- ============================================
CREATE TABLE IF NOT EXISTS clip_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID NOT NULL REFERENCES call_clips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clip_id, user_id)
);

-- ============================================
-- TABLE 3: Clip Comments
-- ============================================
CREATE TABLE IF NOT EXISTS clip_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID NOT NULL REFERENCES call_clips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE 4: Clip Saves (Bookmarks)
-- ============================================
CREATE TABLE IF NOT EXISTS clip_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID NOT NULL REFERENCES call_clips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clip_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_call_clips_user_id ON call_clips(user_id);
CREATE INDEX IF NOT EXISTS idx_call_clips_call_recording_id ON call_clips(call_recording_id);
CREATE INDEX IF NOT EXISTS idx_call_clips_category ON call_clips(category);
CREATE INDEX IF NOT EXISTS idx_call_clips_is_shared ON call_clips(is_shared) WHERE is_shared = TRUE;
CREATE INDEX IF NOT EXISTS idx_call_clips_shared_at ON call_clips(shared_at DESC) WHERE is_shared = TRUE;
CREATE INDEX IF NOT EXISTS idx_call_clips_like_count ON call_clips(like_count DESC) WHERE is_shared = TRUE;
CREATE INDEX IF NOT EXISTS idx_clip_likes_clip_id ON clip_likes(clip_id);
CREATE INDEX IF NOT EXISTS idx_clip_likes_user_id ON clip_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_clip_comments_clip_id ON clip_comments(clip_id);
CREATE INDEX IF NOT EXISTS idx_clip_saves_user_id ON clip_saves(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE call_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_saves ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: call_clips
-- ============================================
-- Users can view their own clips or shared clips
CREATE POLICY "Users can view own or shared clips" ON call_clips
  FOR SELECT USING (user_id = auth.uid() OR is_shared = TRUE);

-- Users can create their own clips
CREATE POLICY "Users can create clips" ON call_clips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own clips
CREATE POLICY "Users can update own clips" ON call_clips
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own clips
CREATE POLICY "Users can delete own clips" ON call_clips
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: clip_likes
-- ============================================
CREATE POLICY "Anyone can view clip likes" ON clip_likes
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can like clips" ON clip_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike clips" ON clip_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: clip_comments
-- ============================================
CREATE POLICY "Anyone can view clip comments" ON clip_comments
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can comment on clips" ON clip_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON clip_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON clip_comments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: clip_saves
-- ============================================
CREATE POLICY "Users can view own saves" ON clip_saves
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save clips" ON clip_saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave clips" ON clip_saves
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER: Update like count
-- ============================================
CREATE OR REPLACE FUNCTION update_clip_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE call_clips SET like_count = like_count + 1 WHERE id = NEW.clip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE call_clips SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.clip_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_clip_like_change
  AFTER INSERT OR DELETE ON clip_likes
  FOR EACH ROW EXECUTE FUNCTION update_clip_like_count();

-- ============================================
-- TRIGGER: Update comment count
-- ============================================
CREATE OR REPLACE FUNCTION update_clip_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE call_clips SET comment_count = comment_count + 1 WHERE id = NEW.clip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE call_clips SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.clip_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_clip_comment_change
  AFTER INSERT OR DELETE ON clip_comments
  FOR EACH ROW EXECUTE FUNCTION update_clip_comment_count();

-- ============================================
-- TRIGGER: Update save count
-- ============================================
CREATE OR REPLACE FUNCTION update_clip_save_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE call_clips SET save_count = save_count + 1 WHERE id = NEW.clip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE call_clips SET save_count = GREATEST(0, save_count - 1) WHERE id = OLD.clip_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_clip_save_change
  AFTER INSERT OR DELETE ON clip_saves
  FOR EACH ROW EXECUTE FUNCTION update_clip_save_count();

-- ============================================
-- TRIGGER: Update updated_at
-- ============================================
CREATE TRIGGER update_call_clips_updated_at
  BEFORE UPDATE ON call_clips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clip_comments_updated_at
  BEFORE UPDATE ON clip_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: Set shared_at when sharing
-- ============================================
CREATE OR REPLACE FUNCTION set_clip_shared_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_shared = TRUE AND (OLD.is_shared = FALSE OR OLD.is_shared IS NULL) THEN
    NEW.shared_at = NOW();
  ELSIF NEW.is_shared = FALSE THEN
    NEW.shared_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_clip_share_change
  BEFORE UPDATE ON call_clips
  FOR EACH ROW EXECUTE FUNCTION set_clip_shared_at();
