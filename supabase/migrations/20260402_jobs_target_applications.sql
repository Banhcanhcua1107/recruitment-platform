-- Manual target application count for employer planning.
-- Informational only: this does not enforce or block candidate submissions.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS target_applications INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.jobs'::regclass
      AND conname = 'jobs_target_applications_positive_check'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_target_applications_positive_check
      CHECK (target_applications IS NULL OR target_applications > 0);
  END IF;
END $$;
