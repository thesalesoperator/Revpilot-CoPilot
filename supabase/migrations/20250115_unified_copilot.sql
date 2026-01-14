-- ============================================================
-- UNIFIED CO-PILOT DATABASE SCHEMA
-- ============================================================

-- ------------------------------------------------------------
-- 1. Create unified sessions table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS co_pilot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),

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
  overall_score INTEGER,

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
CREATE INDEX idx_copilot_sessions_user ON co_pilot_sessions(user_id);
CREATE INDEX idx_copilot_sessions_status ON co_pilot_sessions(status);
CREATE INDEX idx_copilot_sessions_context ON co_pilot_sessions(context);
CREATE INDEX idx_copilot_suggestions_session ON co_pilot_suggestions(session_id);
CREATE INDEX idx_copilot_suggestions_created ON co_pilot_suggestions(created_at DESC);

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

-- Users can view suggestions for their sessions
CREATE POLICY "Users can view session suggestions"
  ON co_pilot_suggestions FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM co_pilot_sessions WHERE user_id = auth.uid()
    )
  );

-- Service role can do anything (for API routes)
CREATE POLICY "Service role full access sessions"
  ON co_pilot_sessions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access suggestions"
  ON co_pilot_suggestions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
