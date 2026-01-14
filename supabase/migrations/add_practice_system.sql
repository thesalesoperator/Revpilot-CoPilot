-- Practice System Migration
-- Enables gamified AI practice calls with Vapi

-- ============================================
-- TABLE 1: Practice Sessions
-- Tracks each user's practice call attempt
-- ============================================
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Challenge/scenario reference (hardcoded IDs from frontend)
  challenge_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),

  -- Vapi call tracking
  vapi_call_id TEXT,
  phone_number TEXT,

  -- Session state
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connecting', 'active', 'ended', 'analyzing', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,

  -- Transcript and analysis
  transcript TEXT,
  analysis JSONB,

  -- Scoring (reuses CallAnalysis structure)
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  objectives_completed TEXT[] DEFAULT '{}',
  bonus_objectives_completed TEXT[] DEFAULT '{}',

  -- XP earned for this session
  xp_earned INTEGER DEFAULT 0,
  xp_breakdown JSONB DEFAULT '{}',

  -- Metadata
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE 2: User Practice Stats
-- Tracks gamification progress per user
-- ============================================
CREATE TABLE IF NOT EXISTS user_practice_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- XP and Leveling
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  current_rank TEXT DEFAULT 'Bronze I',

  -- Streaks
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_practice_date DATE,

  -- Aggregate stats
  total_sessions INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,

  -- Per-difficulty completions
  easy_completed INTEGER DEFAULT 0,
  medium_completed INTEGER DEFAULT 0,
  hard_completed INTEGER DEFAULT 0,
  expert_completed INTEGER DEFAULT 0,

  -- Best scores per challenge (JSONB: { "challenge_id": { score, date } })
  best_scores JSONB DEFAULT '{}',

  -- Daily challenge tracking (resets daily)
  daily_challenges_completed TEXT[] DEFAULT '{}',
  daily_challenges_date DATE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE 3: Practice Leaderboard (Materialized View approach)
-- Weekly/monthly leaderboard snapshots
-- ============================================
CREATE TABLE IF NOT EXISTS practice_leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'all_time')),
  period_start DATE NOT NULL,

  -- Stats for this period
  xp_earned INTEGER DEFAULT 0,
  sessions_completed INTEGER DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0,

  -- Ranking
  rank INTEGER,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, period_type, period_start)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_status ON practice_sessions(status);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_challenge_id ON practice_sessions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_created_at ON practice_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_vapi_call_id ON practice_sessions(vapi_call_id);

CREATE INDEX IF NOT EXISTS idx_user_practice_stats_user_id ON user_practice_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_practice_stats_total_xp ON user_practice_stats(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_practice_stats_current_level ON user_practice_stats(current_level DESC);

CREATE INDEX IF NOT EXISTS idx_practice_leaderboard_period ON practice_leaderboard(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_practice_leaderboard_xp ON practice_leaderboard(xp_earned DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_practice_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_leaderboard ENABLE ROW LEVEL SECURITY;

-- Practice Sessions: Users can only access their own
CREATE POLICY "Users can view own practice sessions" ON practice_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own practice sessions" ON practice_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own practice sessions" ON practice_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- User Practice Stats: Users can view their own, but see others on leaderboard
CREATE POLICY "Users can view own practice stats" ON user_practice_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice stats" ON user_practice_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own practice stats" ON user_practice_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Leaderboard: Everyone can view
CREATE POLICY "Anyone can view leaderboard" ON practice_leaderboard
  FOR SELECT USING (TRUE);

-- Only system can insert/update leaderboard (via service role)
CREATE POLICY "System can manage leaderboard" ON practice_leaderboard
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- TRIGGER: Update updated_at
-- ============================================
CREATE TRIGGER update_practice_sessions_updated_at
  BEFORE UPDATE ON practice_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_practice_stats_updated_at
  BEFORE UPDATE ON user_practice_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Calculate level from XP
-- ============================================
CREATE OR REPLACE FUNCTION calculate_level_from_xp(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Level formula: Each level requires progressively more XP
  -- Level 1: 0 XP, Level 2: 100 XP, Level 3: 300 XP, Level 4: 600 XP, etc.
  -- Formula: level = floor(sqrt(xp / 50)) + 1
  RETURN GREATEST(1, FLOOR(SQRT(xp::FLOAT / 50)) + 1)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FUNCTION: Calculate rank from level
-- ============================================
CREATE OR REPLACE FUNCTION calculate_rank_from_level(level INTEGER)
RETURNS TEXT AS $$
DECLARE
  rank_tier TEXT;
  rank_division INTEGER;
BEGIN
  -- Rank tiers: Bronze (1-5), Silver (6-10), Gold (11-15), Platinum (16-20), Diamond (21-25), Master (26+)
  -- Each tier has 5 divisions (I-V)
  IF level <= 5 THEN
    rank_tier := 'Bronze';
    rank_division := level;
  ELSIF level <= 10 THEN
    rank_tier := 'Silver';
    rank_division := level - 5;
  ELSIF level <= 15 THEN
    rank_tier := 'Gold';
    rank_division := level - 10;
  ELSIF level <= 20 THEN
    rank_tier := 'Platinum';
    rank_division := level - 15;
  ELSIF level <= 25 THEN
    rank_tier := 'Diamond';
    rank_division := level - 20;
  ELSE
    rank_tier := 'Master';
    rank_division := LEAST(level - 25, 5);
  END IF;

  -- Convert division number to Roman numeral
  RETURN rank_tier || ' ' ||
    CASE rank_division
      WHEN 1 THEN 'I'
      WHEN 2 THEN 'II'
      WHEN 3 THEN 'III'
      WHEN 4 THEN 'IV'
      WHEN 5 THEN 'V'
      ELSE 'V'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FUNCTION: Update user stats after practice session
-- ============================================
CREATE OR REPLACE FUNCTION update_user_practice_stats_after_session()
RETURNS TRIGGER AS $$
DECLARE
  today DATE := CURRENT_DATE;
  yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  user_stats user_practice_stats%ROWTYPE;
  new_streak INTEGER;
  new_xp INTEGER;
  new_level INTEGER;
  new_rank TEXT;
BEGIN
  -- Only trigger when session is completed with XP
  IF NEW.status != 'completed' OR NEW.xp_earned IS NULL OR NEW.xp_earned = 0 THEN
    RETURN NEW;
  END IF;

  -- Get or create user stats
  SELECT * INTO user_stats FROM user_practice_stats WHERE user_id = NEW.user_id;

  IF NOT FOUND THEN
    -- Create new stats record
    INSERT INTO user_practice_stats (user_id, last_practice_date)
    VALUES (NEW.user_id, today)
    RETURNING * INTO user_stats;
  END IF;

  -- Calculate streak
  IF user_stats.last_practice_date = today THEN
    -- Already practiced today, keep streak
    new_streak := user_stats.current_streak;
  ELSIF user_stats.last_practice_date = yesterday THEN
    -- Practiced yesterday, increment streak
    new_streak := user_stats.current_streak + 1;
  ELSE
    -- Streak broken, start new
    new_streak := 1;
  END IF;

  -- Calculate new XP and level
  new_xp := user_stats.total_xp + NEW.xp_earned;
  new_level := calculate_level_from_xp(new_xp);
  new_rank := calculate_rank_from_level(new_level);

  -- Update stats
  UPDATE user_practice_stats
  SET
    total_xp = new_xp,
    current_level = new_level,
    current_rank = new_rank,
    current_streak = new_streak,
    longest_streak = GREATEST(user_stats.longest_streak, new_streak),
    last_practice_date = today,
    total_sessions = user_stats.total_sessions + 1,
    total_duration_seconds = user_stats.total_duration_seconds + COALESCE(NEW.duration_seconds, 0),
    challenges_completed = user_stats.challenges_completed + 1,
    easy_completed = CASE WHEN NEW.difficulty = 'easy' THEN user_stats.easy_completed + 1 ELSE user_stats.easy_completed END,
    medium_completed = CASE WHEN NEW.difficulty = 'medium' THEN user_stats.medium_completed + 1 ELSE user_stats.medium_completed END,
    hard_completed = CASE WHEN NEW.difficulty = 'hard' THEN user_stats.hard_completed + 1 ELSE user_stats.hard_completed END,
    expert_completed = CASE WHEN NEW.difficulty = 'expert' THEN user_stats.expert_completed + 1 ELSE user_stats.expert_completed END,
    best_scores = CASE
      WHEN (user_stats.best_scores->NEW.challenge_id->>'score')::INTEGER IS NULL
           OR (user_stats.best_scores->NEW.challenge_id->>'score')::INTEGER < NEW.overall_score
      THEN jsonb_set(
        COALESCE(user_stats.best_scores, '{}'::JSONB),
        ARRAY[NEW.challenge_id],
        jsonb_build_object('score', NEW.overall_score, 'date', today)
      )
      ELSE user_stats.best_scores
    END,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_practice_session_completed
  AFTER UPDATE ON practice_sessions
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION update_user_practice_stats_after_session();

-- ============================================
-- FUNCTION: Ensure user has practice stats record
-- ============================================
CREATE OR REPLACE FUNCTION ensure_user_practice_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_practice_stats (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_practice_session_created
  AFTER INSERT ON practice_sessions
  FOR EACH ROW EXECUTE FUNCTION ensure_user_practice_stats();
