-- Real-time Coaching Tables for RevPilot
-- Run this in your Supabase SQL Editor

-- Coaching Sessions table
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meeting_url TEXT NOT NULL,
  meeting_id TEXT,
  bot_id TEXT,
  status TEXT DEFAULT 'starting' CHECK (status IN ('starting', 'bot_joining', 'active', 'ended', 'error')),
  transcript TEXT,
  analysis JSONB,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  duration_seconds INTEGER,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coaching Suggestions table (real-time updates)
CREATE TABLE IF NOT EXISTS coaching_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('question', 'tip', 'objection', 'positive', 'alert', 'stats')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user_id ON coaching_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_status ON coaching_sessions(status);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_bot_id ON coaching_sessions(bot_id);
CREATE INDEX IF NOT EXISTS idx_coaching_suggestions_session_id ON coaching_suggestions(session_id);
CREATE INDEX IF NOT EXISTS idx_coaching_suggestions_created_at ON coaching_suggestions(created_at DESC);

-- Enable RLS
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coaching_sessions
CREATE POLICY "Users can view their own coaching sessions"
  ON coaching_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own coaching sessions"
  ON coaching_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coaching sessions"
  ON coaching_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for coaching_suggestions (read via session ownership)
CREATE POLICY "Users can view suggestions for their sessions"
  ON coaching_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coaching_sessions
      WHERE coaching_sessions.id = coaching_suggestions.session_id
      AND coaching_sessions.user_id = auth.uid()
    )
  );

-- Service role can insert suggestions (from webhook)
CREATE POLICY "Service role can insert suggestions"
  ON coaching_suggestions FOR INSERT
  WITH CHECK (true);

-- Enable Realtime for coaching_suggestions
ALTER PUBLICATION supabase_realtime ADD TABLE coaching_suggestions;

-- Grant permissions
GRANT ALL ON coaching_sessions TO authenticated;
GRANT ALL ON coaching_suggestions TO authenticated;
GRANT ALL ON coaching_sessions TO service_role;
GRANT ALL ON coaching_suggestions TO service_role;
