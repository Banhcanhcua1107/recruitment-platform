-- Recruitment management compatibility migration for the current sqlv2 schema.
-- Run this AFTER your existing base schema in sqlv2.sql.
-- This migration keeps jobs.description / jobs.requirements as JSONB
-- and only adds the employer-side tables + columns needed by the HR module.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.employers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.employers
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS industry JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS company_size TEXT,
  ADD COLUMN IF NOT EXISTS company_description TEXT;

CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  resume_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS employer_id UUID REFERENCES public.employers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_employer_id ON public.jobs(employer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON public.candidates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id_created_at ON public.activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_job_id_created_at ON public.applications(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON public.applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);

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
      'interview',
      'hired'
    )
  );

CREATE OR REPLACE FUNCTION public.sync_recruitment_directory_from_profile_sqlv2()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'hr' THEN
    INSERT INTO public.employers (id, company_name, email, password_hash)
    VALUES (
      NEW.id,
      'Chưa cập nhật tên công ty',
      COALESCE(NEW.email, 'company@example.com'),
      NULL
    )
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email;
  ELSIF NEW.role = 'candidate' THEN
    INSERT INTO public.candidates (id, full_name, email, phone, resume_url)
    VALUES (
      NEW.id,
      COALESCE(NEW.full_name, split_part(COALESCE(NEW.email, 'candidate@example.com'), '@', 1)),
      COALESCE(NEW.email, 'candidate@example.com'),
      NULL,
      NULL
    )
    ON CONFLICT (id) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          email = EXCLUDED.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_recruitment_directory_from_profile_sqlv2 ON public.profiles;
CREATE TRIGGER trigger_sync_recruitment_directory_from_profile_sqlv2
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_recruitment_directory_from_profile_sqlv2();

INSERT INTO public.employers (id, company_name, email, password_hash)
SELECT
  id,
  'Chưa cập nhật tên công ty',
  COALESCE(email, 'company@example.com'),
  NULL
FROM public.profiles
WHERE role = 'hr'
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

UPDATE public.employers AS e
SET company_name = 'Chưa cập nhật tên công ty'
FROM public.profiles AS p
WHERE p.id = e.id
  AND p.role = 'hr'
  AND (
    e.company_name = COALESCE(p.full_name, '')
    OR e.company_name = split_part(COALESCE(p.email, ''), '@', 1)
    OR e.company_name = 'Nhà tuyển dụng'
  );

INSERT INTO public.candidates (id, full_name, email, phone, resume_url)
SELECT
  id,
  COALESCE(full_name, split_part(COALESCE(email, 'candidate@example.com'), '@', 1)),
  COALESCE(email, 'candidate@example.com'),
  NULL,
  NULL
FROM public.profiles
WHERE role = 'candidate'
ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      email = EXCLUDED.email;

ALTER TABLE public.employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employers can view own employer row" ON public.employers;
CREATE POLICY "Employers can view own employer row"
ON public.employers
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Employers can manage own employer row" ON public.employers;
CREATE POLICY "Employers can manage own employer row"
ON public.employers
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Candidates can view own candidate row" ON public.candidates;
CREATE POLICY "Candidates can view own candidate row"
ON public.candidates
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Candidates can manage own candidate row" ON public.candidates;
CREATE POLICY "Candidates can manage own candidate row"
ON public.candidates
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Employers can view candidates in their pipeline" ON public.candidates;
CREATE POLICY "Employers can view candidates in their pipeline"
ON public.candidates
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.candidate_id = candidates.id
      AND j.employer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Employers can view own jobs" ON public.jobs;
CREATE POLICY "Employers can view own jobs"
ON public.jobs
FOR SELECT
USING (employer_id = auth.uid());

DROP POLICY IF EXISTS "Employers can insert own jobs" ON public.jobs;
CREATE POLICY "Employers can insert own jobs"
ON public.jobs
FOR INSERT
WITH CHECK (employer_id = auth.uid());

DROP POLICY IF EXISTS "Employers can update own jobs" ON public.jobs;
CREATE POLICY "Employers can update own jobs"
ON public.jobs
FOR UPDATE
USING (employer_id = auth.uid())
WITH CHECK (employer_id = auth.uid());

DROP POLICY IF EXISTS "Employers can read applications for own jobs" ON public.applications;
CREATE POLICY "Employers can read applications for own jobs"
ON public.applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs
    WHERE jobs.id = applications.job_id
      AND jobs.employer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Employers can update applications for own jobs" ON public.applications;
CREATE POLICY "Employers can update applications for own jobs"
ON public.applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs
    WHERE jobs.id = applications.job_id
      AND jobs.employer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.jobs
    WHERE jobs.id = applications.job_id
      AND jobs.employer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Employers can view own activity logs" ON public.activity_logs;
CREATE POLICY "Employers can view own activity logs"
ON public.activity_logs
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Employers can insert own activity logs" ON public.activity_logs;
CREATE POLICY "Employers can insert own activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (user_id = auth.uid());
