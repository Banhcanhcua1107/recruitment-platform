-- Ensure legacy profiles table exists for downstream recruitment migrations.
-- This is required in environments where non-timestamped schema context files
-- are skipped by Supabase migration runner.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role TEXT,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc', now());

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
