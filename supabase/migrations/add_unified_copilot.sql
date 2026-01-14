-- ============================================================
-- UNIFIED CO-PILOT DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. Create unified sessions table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS co_pilot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Context
  context TEXT NOT NULL CHECK (context IN ('live_coaching', 'practice', 'real_call_analysis')),
  capture_method TEXT CHECK (capture_method IN ('tab_audio', 'recall_bot', 'vapi', 'upload')),
  status TEXT NOT NULL DEFAULT 'starting' CHECK (status IN ('starting', 'active', 'analyzing', 'completed', 'failed')),

  -- Source-specific
  meeting_url TEXT,
  challenge_id TEXT,
  persona_id TEXT,
  uploaded_file_url TEXT,

  -- Transcript & Analysis
  transcript TEXT,
  key_info JSONB DEFAULT '{}',
  analysis JSONB,

  -- Script Progress
  script_progress DECIMAL DEFAULT 0,
  current_section TEXT,
  sections_covered TEXT[] DEFAULT '{}',

  -- Gamification
  xp_earned INTEGER DEFAULT 0,
  xp_breakdown JSONB,
  objectives_completed TEXT[] DEFAULT '{}',
  bonus_objectives_completed TEXT[] DEFAULT '{}',
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),

  -- Timestamps
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. Create unified suggestions table (realtime enabled)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS co_pilot_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES co_pilot_sessions(id) ON DELETE CASCADE,

  -- Content
  context TEXT NOT NULL CHECK (context IN ('live_coaching', 'practice', 'real_call_analysis')),
  type TEXT NOT NULL CHECK (type IN ('question', 'tip', 'objection', 'positive', 'alert', 'transition', 'stats')),
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. Indexes for performance
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_user ON co_pilot_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_status ON co_pilot_sessions(status);
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_context ON co_pilot_sessions(context);
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_created ON co_pilot_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_suggestions_session ON co_pilot_suggestions(session_id);
CREATE INDEX IF NOT EXISTS idx_copilot_suggestions_created ON co_pilot_suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_suggestions_type ON co_pilot_suggestions(type);

-- ------------------------------------------------------------
-- 4. Enable realtime for suggestions
-- ------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE co_pilot_suggestions;

-- ------------------------------------------------------------
-- 5. Backward compatibility views
-- ------------------------------------------------------------

-- View for coaching sessions (maps to old table structure)
CREATE OR REPLACE VIEW coaching_sessions_unified AS
SELECT
  id,
  user_id,
  meeting_url,
  status,
  transcript,
  analysis,
  overall_score,
  duration_seconds,
  ended_at,
  created_at,
  updated_at
FROM co_pilot_sessions
WHERE context = 'live_coaching';

-- View for practice sessions (maps to old table structure)
CREATE OR REPLACE VIEW practice_sessions_unified AS
SELECT
  id,
  user_id,
  challenge_id,
  persona_id,
  'medium' as difficulty,  -- Default
  status,
  started_at,
  ended_at,
  duration_seconds,
  transcript,
  analysis,
  overall_score,
  objectives_completed,
  bonus_objectives_completed,
  xp_earned,
  xp_breakdown,
  created_at,
  updated_at
FROM co_pilot_sessions
WHERE context = 'practice';

-- ------------------------------------------------------------
-- 6. Update trigger for updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_copilot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS copilot_sessions_updated ON co_pilot_sessions;
CREATE TRIGGER copilot_sessions_updated
  BEFORE UPDATE ON co_pilot_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_copilot_updated_at();

-- ------------------------------------------------------------
-- 7. RLS Policies
-- ------------------------------------------------------------
ALTER TABLE co_pilot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_pilot_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions"
  ON co_pilot_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON co_pilot_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON co_pilot_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON co_pilot_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Users can view suggestions for their sessions
CREATE POLICY "Users can view session suggestions"
  ON co_pilot_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM co_pilot_sessions
      WHERE co_pilot_sessions.id = co_pilot_suggestions.session_id
      AND co_pilot_sessions.user_id = auth.uid()
    )
  );

-- Service role can insert suggestions (from API routes)
CREATE POLICY "Service role can insert suggestions"
  ON co_pilot_suggestions FOR INSERT
  WITH CHECK (true);

-- Service role can update suggestions (for feedback)
CREATE POLICY "Service role can update suggestions"
  ON co_pilot_suggestions FOR UPDATE
  USING (true);

-- ------------------------------------------------------------
-- 8. Grant permissions
-- ------------------------------------------------------------
GRANT ALL ON co_pilot_sessions TO authenticated;
GRANT ALL ON co_pilot_suggestions TO authenticated;
GRANT ALL ON co_pilot_sessions TO service_role;
GRANT ALL ON co_pilot_suggestions TO service_role;

-- Grant access to views
GRANT SELECT ON coaching_sessions_unified TO authenticated;
GRANT SELECT ON practice_sessions_unified TO authenticated;

-- ------------------------------------------------------------
-- 9. Add users table columns for XP tracking (if not exists)
-- ------------------------------------------------------------
DO $$
BEGIN
  -- Add total_xp column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'total_xp'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_xp INTEGER DEFAULT 0;
  END IF;

  -- Add level column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN level INTEGER DEFAULT 1;
  END IF;

  -- Add streak column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'current_streak'
  ) THEN
    ALTER TABLE profiles ADD COLUMN current_streak INTEGER DEFAULT 0;
  END IF;

  -- Add last_practice_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_practice_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_practice_at TIMESTAMPTZ;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 10. Helper function to calculate user level from XP
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_level(total_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
  thresholds INTEGER[] := ARRAY[0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100, 10500];
  i INTEGER;
BEGIN
  FOR i IN REVERSE array_upper(thresholds, 1)..1 LOOP
    IF total_xp >= thresholds[i] THEN
      RETURN i;
    END IF;
  END LOOP;
  RETURN 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ------------------------------------------------------------
-- 11. Function to update user XP after session completion
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_user_xp_after_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when session is completed and has XP
  IF NEW.status = 'completed' AND NEW.xp_earned > 0 AND
     (OLD.status IS NULL OR OLD.status != 'completed') THEN

    UPDATE profiles
    SET
      total_xp = COALESCE(total_xp, 0) + NEW.xp_earned,
      level = calculate_level(COALESCE(total_xp, 0) + NEW.xp_earned),
      last_practice_at = CASE WHEN NEW.context = 'practice' THEN NOW() ELSE last_practice_at END
    WHERE id = NEW.user_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_xp_on_session_complete ON co_pilot_sessions;
CREATE TRIGGER update_xp_on_session_complete
  AFTER UPDATE ON co_pilot_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_xp_after_session();
