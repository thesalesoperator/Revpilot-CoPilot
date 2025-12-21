-- Add Call Recordings Table for AI Call Analysis
-- Run this in your Supabase SQL Editor

-- Call recordings table
CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'uploading', -- 'uploading', 'transcribing', 'analyzing', 'completed', 'failed'
  error_message TEXT,
  transcript TEXT,
  analysis JSONB, -- Structured AI feedback
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_recordings_user_id ON call_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_status ON call_recordings(status);
CREATE INDEX IF NOT EXISTS idx_call_recordings_created_at ON call_recordings(created_at);

-- RLS
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own call recordings" ON call_recordings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own call recordings" ON call_recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own call recordings" ON call_recordings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own call recordings" ON call_recordings
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_call_recordings_updated_at
  BEFORE UPDATE ON call_recordings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for call recordings (run separately in Supabase Dashboard > Storage)
-- Bucket name: call-recordings
-- Public: false
-- File size limit: 25MB
-- Allowed MIME types: audio/mpeg, audio/mp4, audio/wav, audio/x-m4a, audio/webm, video/mp4, video/webm
