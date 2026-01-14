-- Add Metrics Tracking Tables Migration
-- Run this in your Supabase SQL Editor if you don't have metrics tracking yet

-- Metric definitions table (which metrics user wants to track)
CREATE TABLE IF NOT EXISTS tracked_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL DEFAULT 'number', -- 'number', 'percentage', 'currency'
  tracking_frequency TEXT NOT NULL DEFAULT 'weekly', -- 'weekly', 'monthly'
  reminder_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metric entries table (logged values)
CREATE TABLE IF NOT EXISTS metric_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES tracked_metrics(id) ON DELETE CASCADE,
  value DECIMAL(15, 2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for metrics
CREATE INDEX IF NOT EXISTS idx_tracked_metrics_user_id ON tracked_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_metric_entries_user_id ON metric_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_metric_entries_metric_id ON metric_entries(metric_id);
CREATE INDEX IF NOT EXISTS idx_metric_entries_period ON metric_entries(period_start, period_end);

-- RLS for metrics tables
ALTER TABLE tracked_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_entries ENABLE ROW LEVEL SECURITY;

-- Tracked metrics policies
CREATE POLICY "Users can view own tracked metrics" ON tracked_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracked metrics" ON tracked_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tracked metrics" ON tracked_metrics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tracked metrics" ON tracked_metrics
  FOR DELETE USING (auth.uid() = user_id);

-- Metric entries policies
CREATE POLICY "Users can view own metric entries" ON metric_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metric entries" ON metric_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metric entries" ON metric_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own metric entries" ON metric_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for tracked_metrics updated_at (only if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_tracked_metrics_updated_at
      BEFORE UPDATE ON tracked_metrics
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- Trigger already exists, ignore
END $$;
