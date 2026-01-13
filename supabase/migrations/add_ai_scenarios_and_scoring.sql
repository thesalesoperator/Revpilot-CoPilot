-- AI Scenarios & Unified Scoring System Migration
-- Enables users to create AI practice scenarios from real coaching calls
-- and provides unified scoring across live calls and practice sessions

-- ============================================
-- TABLE 1: AI Scenarios
-- Custom practice scenarios created from real calls
-- ============================================
CREATE TABLE IF NOT EXISTS ai_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Source coaching session this scenario was created from
  source_session_id UUID REFERENCES coaching_sessions(id) ON DELETE SET NULL,

  -- Scenario metadata
  name TEXT NOT NULL,
  description TEXT,

  -- Prospect persona details (extracted from real call)
  prospect_name TEXT,
  prospect_title TEXT,
  prospect_company TEXT,
  prospect_personality TEXT,  -- AI-generated personality description

  -- Call context (extracted from real call analysis)
  anchor_problem JSONB,        -- { problem, category, severity }
  pain_points TEXT[],          -- Array of identified pain points
  objections TEXT[],           -- Array of objections raised during call
  buying_signals TEXT[],       -- Any positive signals detected

  -- Areas for improvement (from post-call analysis)
  improvement_areas TEXT[],    -- What the user should practice
  missed_opportunities TEXT[], -- Things they could have done better

  -- AI configuration
  system_prompt TEXT NOT NULL, -- Full system prompt for AI persona
  first_message TEXT,          -- Opening message from AI
  voice_id TEXT DEFAULT '21m00Tcm4TlvDq8ikWAM', -- ElevenLabs voice ID

  -- Status management
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),

  -- Performance tracking
  attempts_count INTEGER DEFAULT 0,
  best_score INTEGER CHECK (best_score >= 0 AND best_score <= 100),
  average_score DECIMAL(5,2),
  last_attempted_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE 2: Scenario Attempts
-- Tracks each attempt at an AI scenario
-- ============================================
CREATE TABLE IF NOT EXISTS scenario_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID NOT NULL REFERENCES ai_scenarios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Vapi call tracking
  vapi_call_id TEXT,

  -- Session state
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connecting', 'active', 'ended', 'analyzing', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,

  -- Transcript and analysis
  transcript TEXT,

  -- Unified Scoring (100 points total)
  total_score INTEGER CHECK (total_score >= 0 AND total_score <= 100),
  score_breakdown JSONB,  -- { discovery: 25, objection_handling: 25, value_articulation: 20, call_control: 15, close_execution: 15 }

  -- Improvement tracking
  improvements_made TEXT[],        -- Which improvement areas were addressed
  remaining_improvements TEXT[],   -- What still needs work
  compared_to_source JSONB,        -- Comparison with original call performance

  -- Detailed analysis
  analysis JSONB,  -- Full AI analysis similar to practice sessions

  -- XP earned
  xp_earned INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ALTER: Add unified scoring to coaching_sessions
-- ============================================
ALTER TABLE coaching_sessions
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS prospect_name TEXT,
  ADD COLUMN IF NOT EXISTS prospect_company TEXT,
  ADD COLUMN IF NOT EXISTS anchor_problem JSONB,
  ADD COLUMN IF NOT EXISTS pain_points TEXT[],
  ADD COLUMN IF NOT EXISTS objections_detected TEXT[],
  ADD COLUMN IF NOT EXISTS improvement_areas TEXT[],
  ADD COLUMN IF NOT EXISTS call_type TEXT DEFAULT 'live';

-- ============================================
-- ALTER: Add unified scoring to practice_sessions
-- ============================================
ALTER TABLE practice_sessions
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS scenario_id UUID REFERENCES ai_scenarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_custom_scenario BOOLEAN DEFAULT FALSE;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ai_scenarios_user_id ON ai_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_scenarios_status ON ai_scenarios(status);
CREATE INDEX IF NOT EXISTS idx_ai_scenarios_source_session ON ai_scenarios(source_session_id);
CREATE INDEX IF NOT EXISTS idx_ai_scenarios_created_at ON ai_scenarios(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scenario_attempts_scenario_id ON scenario_attempts(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_attempts_user_id ON scenario_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_scenario_attempts_status ON scenario_attempts(status);
CREATE INDEX IF NOT EXISTS idx_scenario_attempts_created_at ON scenario_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenario_attempts_vapi_call_id ON scenario_attempts(vapi_call_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE ai_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_attempts ENABLE ROW LEVEL SECURITY;

-- AI Scenarios: Users can only access their own
CREATE POLICY "Users can view own ai scenarios" ON ai_scenarios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own ai scenarios" ON ai_scenarios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai scenarios" ON ai_scenarios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai scenarios" ON ai_scenarios
  FOR DELETE USING (auth.uid() = user_id);

-- Scenario Attempts: Users can only access their own
CREATE POLICY "Users can view own scenario attempts" ON scenario_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scenario attempts" ON scenario_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scenario attempts" ON scenario_attempts
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS: Update timestamps
-- ============================================
CREATE TRIGGER update_ai_scenarios_updated_at
  BEFORE UPDATE ON ai_scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenario_attempts_updated_at
  BEFORE UPDATE ON scenario_attempts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Update scenario stats after attempt
-- ============================================
CREATE OR REPLACE FUNCTION update_scenario_stats_after_attempt()
RETURNS TRIGGER AS $$
DECLARE
  avg_score DECIMAL(5,2);
BEGIN
  -- Only trigger when attempt is completed with a score
  IF NEW.status != 'completed' OR NEW.total_score IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate new average score
  SELECT AVG(total_score) INTO avg_score
  FROM scenario_attempts
  WHERE scenario_id = NEW.scenario_id
    AND status = 'completed'
    AND total_score IS NOT NULL;

  -- Update scenario stats
  UPDATE ai_scenarios
  SET
    attempts_count = attempts_count + 1,
    best_score = GREATEST(COALESCE(best_score, 0), NEW.total_score),
    average_score = avg_score,
    last_attempted_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.scenario_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_scenario_attempt_completed
  AFTER UPDATE ON scenario_attempts
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION update_scenario_stats_after_attempt();

-- ============================================
-- FUNCTION: Check active scenarios limit (max 5)
-- ============================================
CREATE OR REPLACE FUNCTION check_active_scenarios_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Count active scenarios for this user
  SELECT COUNT(*) INTO active_count
  FROM ai_scenarios
  WHERE user_id = NEW.user_id
    AND status = 'active';

  -- If trying to create/activate beyond limit, raise error
  IF active_count >= 5 AND NEW.status = 'active' THEN
    RAISE EXCEPTION 'Maximum of 5 active AI scenarios allowed. Please archive an existing scenario first.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_active_scenarios_limit
  BEFORE INSERT OR UPDATE ON ai_scenarios
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION check_active_scenarios_limit();

-- ============================================
-- GRANTS
-- ============================================
GRANT ALL ON ai_scenarios TO authenticated;
GRANT ALL ON scenario_attempts TO authenticated;
GRANT ALL ON ai_scenarios TO service_role;
GRANT ALL ON scenario_attempts TO service_role;
