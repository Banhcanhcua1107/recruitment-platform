-- Candidate profile, application snapshot, and recruiter public search support.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS introduction TEXT,
  ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS work_experience TEXT,
  ADD COLUMN IF NOT EXISTS education TEXT,
  ADD COLUMN IF NOT EXISTS cv_file_path TEXT,
  ADD COLUMN IF NOT EXISTS cv_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_visibility BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_profile_visibility
  ON public.candidate_profiles(profile_visibility);

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_skills
  ON public.candidate_profiles
  USING GIN (skills);

INSERT INTO public.candidate_profiles (
  user_id,
  full_name,
  avatar_url,
  email,
  phone,
  introduction,
  skills,
  work_experience,
  education,
  cv_file_path,
  cv_url,
  profile_visibility
)
SELECT
  p.id,
  COALESCE(NULLIF(p.full_name, ''), split_part(COALESCE(p.email, 'candidate@example.com'), '@', 1)),
  p.avatar_url,
  COALESCE(p.email, ''),
  COALESCE(c.phone, ''),
  '',
  ARRAY[]::TEXT[],
  '',
  '',
  NULL,
  c.resume_url,
  false
FROM public.profiles AS p
LEFT JOIN public.candidates AS c
  ON c.id = p.id
WHERE p.role = 'candidate'
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.candidate_profiles AS cp
SET
  full_name = COALESCE(
    NULLIF(cp.full_name, ''),
    NULLIF(p.full_name, ''),
    split_part(COALESCE(p.email, 'candidate@example.com'), '@', 1)
  ),
  avatar_url = COALESCE(cp.avatar_url, p.avatar_url),
  email = COALESCE(NULLIF(cp.email, ''), p.email, c.email, ''),
  phone = COALESCE(NULLIF(cp.phone, ''), c.phone, ''),
  cv_url = COALESCE(NULLIF(cp.cv_url, ''), c.resume_url)
FROM public.profiles AS p
LEFT JOIN public.candidates AS c
  ON c.id = p.id
WHERE p.id = cp.user_id;

ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view public candidate profiles" ON public.candidate_profiles;
CREATE POLICY "Authenticated users can view public candidate profiles"
ON public.candidate_profiles
FOR SELECT
TO authenticated
USING (profile_visibility = true);

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS introduction TEXT,
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ DEFAULT timezone('utc', now());

UPDATE public.applications AS a
SET
  full_name = COALESCE(
    NULLIF(a.full_name, ''),
    c.full_name,
    p.full_name,
    split_part(COALESCE(p.email, 'candidate@example.com'), '@', 1)
  ),
  email = COALESCE(NULLIF(a.email, ''), c.email, p.email),
  phone = COALESCE(NULLIF(a.phone, ''), c.phone),
  introduction = COALESCE(
    NULLIF(a.introduction, ''),
    NULLIF(a.cover_letter, ''),
    'Application submitted via TalentFlow.'
  ),
  applied_at = COALESCE(a.applied_at, a.created_at, timezone('utc', now())),
  cv_file_url = COALESCE(
    NULLIF(a.cv_file_url, ''),
    CASE
      WHEN COALESCE(a.cv_file_path, '') <> '' THEN '/api/applications/' || a.id || '/cv'
      ELSE NULL
    END
  )
FROM public.profiles AS p
LEFT JOIN public.candidates AS c
  ON c.id = p.id
WHERE p.id = a.candidate_id;

CREATE INDEX IF NOT EXISTS idx_applications_applied_at
  ON public.applications(applied_at DESC);

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_full_name_required;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_full_name_required
  CHECK (char_length(btrim(COALESCE(full_name, ''))) > 0)
  NOT VALID;

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_contact_required;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_contact_required
  CHECK (
    NULLIF(btrim(COALESCE(email, '')), '') IS NOT NULL
    OR NULLIF(btrim(COALESCE(phone, '')), '') IS NOT NULL
  )
  NOT VALID;

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_introduction_required;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_introduction_required
  CHECK (char_length(btrim(COALESCE(introduction, ''))) > 0)
  NOT VALID;

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_cv_required;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_cv_required
  CHECK (
    NULLIF(btrim(COALESCE(cv_file_path, '')), '') IS NOT NULL
    OR NULLIF(btrim(COALESCE(cv_file_url, '')), '') IS NOT NULL
  )
  NOT VALID;
