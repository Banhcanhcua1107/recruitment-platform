-- Professional candidate profile fields for standalone profile page.

ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS work_experiences JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS educations JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.candidate_profiles
SET
  headline = COALESCE(headline, ''),
  location = COALESCE(location, ''),
  work_experiences = COALESCE(work_experiences, '[]'::jsonb),
  educations = COALESCE(educations, '[]'::jsonb);

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_headline
  ON public.candidate_profiles USING GIN (to_tsvector('simple', COALESCE(headline, '')));

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_location
  ON public.candidate_profiles (location);
