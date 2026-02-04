-- =============================================
-- Profile Builder - Supabase Migration
-- =============================================
-- Run this in Supabase SQL Editor

-- Bảng chứa profile document (JSONB)
CREATE TABLE IF NOT EXISTS candidate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document JSONB NOT NULL DEFAULT '{"meta":{"version":1},"sections":[]}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_user_profile UNIQUE (user_id)
);

-- Index cho tìm kiếm
CREATE INDEX IF NOT EXISTS idx_candidate_profile_user ON candidate_profiles(user_id);

-- Trigger cập nhật updated_at
CREATE OR REPLACE FUNCTION update_candidate_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_candidate_profile_timestamp ON candidate_profiles;
CREATE TRIGGER trigger_update_candidate_profile_timestamp
  BEFORE UPDATE ON candidate_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_candidate_profile_timestamp();

-- =============================================
-- RLS Policies
-- =============================================

-- Enable RLS
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: User chỉ đọc profile của chính mình
DROP POLICY IF EXISTS "Users can view own profile" ON candidate_profiles;
CREATE POLICY "Users can view own profile"
  ON candidate_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: User chỉ insert profile của chính mình
DROP POLICY IF EXISTS "Users can insert own profile" ON candidate_profiles;
CREATE POLICY "Users can insert own profile"
  ON candidate_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: User chỉ update profile của chính mình
DROP POLICY IF EXISTS "Users can update own profile" ON candidate_profiles;
CREATE POLICY "Users can update own profile"
  ON candidate_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: User chỉ delete profile của chính mình
DROP POLICY IF EXISTS "Users can delete own profile" ON candidate_profiles;
CREATE POLICY "Users can delete own profile"
  ON candidate_profiles FOR DELETE
  USING (auth.uid() = user_id);
