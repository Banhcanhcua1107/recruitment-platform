-- Public visibility switch for jobs.
-- Run after recruitment compatibility migrations.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS is_public_visible BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_jobs_public_visibility
  ON public.jobs(is_public_visible);

UPDATE public.jobs
SET is_public_visible = CASE
  WHEN employer_id IS NULL THEN false
  ELSE true
END
WHERE is_public_visible IS DISTINCT FROM CASE
  WHEN employer_id IS NULL THEN false
  ELSE true
END;
