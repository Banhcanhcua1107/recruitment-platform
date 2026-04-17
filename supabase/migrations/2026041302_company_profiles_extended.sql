CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document JSONB NOT NULL DEFAULT '{"meta":{"version":1},"sections":[]}'::jsonb,
  company_name TEXT,
  company_overview TEXT,
  email TEXT,
  website TEXT,
  phone TEXT,
  logo_url TEXT,
  cover_url TEXT,
  location TEXT,
  industry JSONB NOT NULL DEFAULT '[]'::jsonb,
  company_size TEXT,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  culture JSONB NOT NULL DEFAULT '[]'::jsonb,
  vision TEXT,
  mission TEXT,
  company_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS company_overview TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS culture JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vision TEXT,
  ADD COLUMN IF NOT EXISTS mission TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_company_profiles_user'
      AND conrelid = 'public.company_profiles'::regclass
  ) THEN
    ALTER TABLE public.company_profiles
      ADD CONSTRAINT unique_company_profiles_user UNIQUE (user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_company_profiles_user_id
  ON public.company_profiles (user_id);

CREATE OR REPLACE FUNCTION public.update_company_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_company_profile_timestamp ON public.company_profiles;
CREATE TRIGGER trigger_update_company_profile_timestamp
  BEFORE UPDATE ON public.company_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_company_profile_timestamp();

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employers can view own company profile document" ON public.company_profiles;
CREATE POLICY "Employers can view own company profile document"
ON public.company_profiles
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Employers can insert own company profile document" ON public.company_profiles;
CREATE POLICY "Employers can insert own company profile document"
ON public.company_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Employers can update own company profile document" ON public.company_profiles;
CREATE POLICY "Employers can update own company profile document"
ON public.company_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Employers can delete own company profile document" ON public.company_profiles;
CREATE POLICY "Employers can delete own company profile document"
ON public.company_profiles
FOR DELETE
USING (auth.uid() = user_id);

INSERT INTO public.company_profiles (
  user_id,
  company_name,
  company_overview,
  email,
  logo_url,
  cover_url,
  location,
  industry,
  company_size,
  company_description
)
SELECT
  e.id,
  e.company_name,
  e.company_description,
  e.email,
  e.logo_url,
  e.cover_url,
  e.location,
  COALESCE(e.industry, '[]'::jsonb),
  e.company_size,
  e.company_description
FROM public.employers AS e
ON CONFLICT (user_id) DO NOTHING;
