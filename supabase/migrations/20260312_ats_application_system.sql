-- ATS application system extension for the current recruitment-platform schema.
-- Run this AFTER:
--   1. sqlv2.sql
--   2. 20260311_recruitment_sqlv2_compat.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS cover_letter TEXT,
  ADD COLUMN IF NOT EXISTS cv_file_path TEXT,
  ADD COLUMN IF NOT EXISTS cv_file_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

CREATE INDEX IF NOT EXISTS idx_applications_updated_at ON public.applications(updated_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applications_updated_at ON public.applications;
CREATE TRIGGER trg_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.applications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (
    status IN (
      'pending',
      'viewed',
      'interviewing',
      'offered',
      'rejected',
      'new',
      'applied',
      'reviewing',
      'interview',
      'offer',
      'hired'
    )
  );

CREATE TABLE IF NOT EXISTS public.application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_application_events_application_id_created_at
  ON public.application_events(application_id, created_at DESC);

ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Candidates can view own application events" ON public.application_events;
CREATE POLICY "Candidates can view own application events"
ON public.application_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.applications
    WHERE applications.id = application_events.application_id
      AND applications.candidate_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Employers can view application events for own jobs" ON public.application_events;
CREATE POLICY "Employers can view application events for own jobs"
ON public.application_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.applications
    JOIN public.jobs ON jobs.id = applications.job_id
    WHERE applications.id = application_events.application_id
      AND jobs.employer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Candidates can insert own application events" ON public.application_events;
CREATE POLICY "Candidates can insert own application events"
ON public.application_events
FOR INSERT
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.applications
    WHERE applications.id = application_events.application_id
      AND applications.candidate_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Employers can insert application events for own jobs" ON public.application_events;
CREATE POLICY "Employers can insert application events for own jobs"
ON public.application_events
FOR INSERT
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.applications
    JOIN public.jobs ON jobs.id = applications.job_id
    WHERE applications.id = application_events.application_id
      AND jobs.employer_id = auth.uid()
  )
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cv_uploads',
  'cv_uploads',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Candidates can upload own cv files" ON storage.objects;
CREATE POLICY "Candidates can upload own cv files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cv_uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Candidates can read own cv files" ON storage.objects;
CREATE POLICY "Candidates can read own cv files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cv_uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Candidates can update own cv files" ON storage.objects;
CREATE POLICY "Candidates can update own cv files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cv_uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'cv_uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Candidates can delete own cv files" ON storage.objects;
CREATE POLICY "Candidates can delete own cv files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cv_uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
