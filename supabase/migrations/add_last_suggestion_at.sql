-- Add last_suggestion_at column for rate limiting in serverless environment
-- Run this in your Supabase SQL Editor

-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coaching_sessions'
    AND column_name = 'last_suggestion_at'
  ) THEN
    ALTER TABLE coaching_sessions
    ADD COLUMN last_suggestion_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_last_suggestion_at
ON coaching_sessions(last_suggestion_at);
