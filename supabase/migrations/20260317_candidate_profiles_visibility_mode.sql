-- Migrate candidate profile visibility to explicit public/private mode.
-- Privacy-safe backfill:
--   true  -> public
--   false -> private
-- New profiles default to public.

DROP POLICY IF EXISTS "Authenticated users can view public candidate profiles" ON public.candidate_profiles;

DROP INDEX IF EXISTS public.idx_candidate_profiles_profile_visibility;

ALTER TABLE public.candidate_profiles
  ALTER COLUMN profile_visibility DROP DEFAULT;

ALTER TABLE public.candidate_profiles
  ALTER COLUMN profile_visibility TYPE TEXT
  USING (
    CASE
      WHEN profile_visibility IS TRUE THEN 'public'
      ELSE 'private'
    END
  );

UPDATE public.candidate_profiles
SET profile_visibility = 'public'
WHERE profile_visibility IS NULL OR btrim(profile_visibility) = '';

ALTER TABLE public.candidate_profiles
  ALTER COLUMN profile_visibility SET DEFAULT 'public',
  ALTER COLUMN profile_visibility SET NOT NULL;

ALTER TABLE public.candidate_profiles
  DROP CONSTRAINT IF EXISTS candidate_profiles_profile_visibility_check;

ALTER TABLE public.candidate_profiles
  ADD CONSTRAINT candidate_profiles_profile_visibility_check
  CHECK (profile_visibility IN ('public', 'private'));

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_profile_visibility
  ON public.candidate_profiles(profile_visibility);

CREATE POLICY "Authenticated users can view public candidate profiles"
ON public.candidate_profiles
FOR SELECT
TO authenticated
USING (profile_visibility = 'public');
