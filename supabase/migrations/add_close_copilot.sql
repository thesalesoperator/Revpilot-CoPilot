-- Close CRM Co-Pilot Database Schema
-- Adds tables for the Close.com Chrome extension feature

-- =============================================
-- Keywords table - stores keyword-to-video mappings
-- =============================================
CREATE TABLE IF NOT EXISTS close_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  video_title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  description TEXT,
  highlight_color TEXT DEFAULT '#5eead4',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique keywords per user (or per org if org-level)
  CONSTRAINT unique_keyword_per_user UNIQUE (user_id, keyword)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_close_keywords_user ON close_keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_close_keywords_org ON close_keywords(organization_id);
CREATE INDEX IF NOT EXISTS idx_close_keywords_active ON close_keywords(is_active);

-- =============================================
-- Chat history table - stores AI chat conversations
-- =============================================
CREATE TABLE IF NOT EXISTS close_chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  page_context TEXT, -- Current Close.com page URL or context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_close_chat_session ON close_chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_close_chat_user ON close_chat_history(user_id);

-- =============================================
-- Usage analytics table - track extension usage
-- =============================================
CREATE TABLE IF NOT EXISTS close_usage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'chat', 'keyword_highlight', 'video_view', 'session_start', 'session_end'
  event_data JSONB DEFAULT '{}',
  page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_close_analytics_user ON close_usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_close_analytics_type ON close_usage_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_close_analytics_date ON close_usage_analytics(created_at);

-- =============================================
-- Row Level Security Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE close_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_usage_analytics ENABLE ROW LEVEL SECURITY;

-- Keywords policies
CREATE POLICY "Users can view their own keywords"
  ON close_keywords FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own keywords"
  ON close_keywords FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keywords"
  ON close_keywords FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own keywords"
  ON close_keywords FOR DELETE
  USING (auth.uid() = user_id);

-- Org members can view org-level keywords
CREATE POLICY "Org members can view org keywords"
  ON close_keywords FOR SELECT
  USING (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = close_keywords.organization_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Chat history policies
CREATE POLICY "Users can view their own chat history"
  ON close_chat_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
  ON close_chat_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Analytics policies
CREATE POLICY "Users can view their own analytics"
  ON close_usage_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics"
  ON close_usage_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Triggers for updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_close_keywords_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_close_keywords_updated_at
  BEFORE UPDATE ON close_keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_close_keywords_updated_at();
