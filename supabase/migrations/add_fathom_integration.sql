-- Add Fathom Integration Support
-- Run this in your Supabase SQL Editor

-- Add fathom_api_key to profiles table (encrypted storage recommended in production)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fathom_api_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fathom_connected_at TIMESTAMP WITH TIME ZONE;

-- Note: In production, consider using Supabase Vault for storing API keys securely
-- For now, we store it in the profiles table which is protected by RLS
