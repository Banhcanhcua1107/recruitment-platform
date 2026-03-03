-- Migration: Recreate jobs table with real_jobs_data.json schema
-- Uses TEXT primary key (UUID strings) instead of BIGINT
-- Adds all fields from the real dataset + raw JSONB backup column

-- ──────────────────────────────────────────────
-- 1. Drop dependent tables & old jobs table
-- ──────────────────────────────────────────────
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.saved_jobs CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;

-- ──────────────────────────────────────────────
-- 2. Create new jobs table (UUID text PK)
-- ──────────────────────────────────────────────
CREATE TABLE public.jobs (
  id            TEXT PRIMARY KEY,                            -- UUID string from JSON
  title         TEXT NOT NULL,
  company_name  TEXT NOT NULL,
  logo_url      TEXT,
  cover_url     TEXT,
  salary        TEXT,
  location      TEXT,
  posted_date   TEXT,                                        -- raw string, not a date
  source_url    TEXT,
  description   JSONB DEFAULT '[]'::JSONB,                   -- string[]
  requirements  JSONB DEFAULT '[]'::JSONB,                   -- string[]
  benefits      JSONB DEFAULT '[]'::JSONB,                   -- string[]
  industry      JSONB DEFAULT '[]'::JSONB,                   -- string[]
  experience_level TEXT,
  level         TEXT,
  employment_type  TEXT,
  deadline      TEXT,
  education_level  TEXT,
  age_range     TEXT,
  full_address  TEXT,
  raw           JSONB,                                       -- full original object
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────
-- 3. Indexes for search / filter
-- ──────────────────────────────────────────────
CREATE INDEX idx_jobs_title    ON public.jobs USING gin (to_tsvector('simple', coalesce(title, '')));
CREATE INDEX idx_jobs_company  ON public.jobs USING gin (to_tsvector('simple', coalesce(company_name, '')));
CREATE INDEX idx_jobs_location ON public.jobs (location);
CREATE INDEX idx_jobs_level    ON public.jobs (level);
CREATE INDEX idx_jobs_industry ON public.jobs USING gin (industry);

-- ──────────────────────────────────────────────
-- 4. Recreate dependent tables with TEXT FK
-- ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.applications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id       TEXT REFERENCES public.jobs(id) NOT NULL,
  candidate_id UUID REFERENCES auth.users(id) NOT NULL,
  status       TEXT CHECK (status IN ('pending', 'viewed', 'interviewing', 'offered', 'rejected')) DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.saved_jobs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id) NOT NULL,
  job_id     TEXT REFERENCES public.jobs(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- ──────────────────────────────────────────────
-- 5. RLS
-- ──────────────────────────────────────────────
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- Jobs: public read
CREATE POLICY "Public jobs are viewable by everyone"
  ON public.jobs FOR SELECT USING (true);

-- Allow service-role / authenticated inserts for import script
CREATE POLICY "Service role can insert jobs"
  ON public.jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update jobs"
  ON public.jobs FOR UPDATE USING (true);

-- Applications
CREATE POLICY "Users can see their own applications"
  ON public.applications FOR SELECT USING (auth.uid() = candidate_id);
CREATE POLICY "Users can create applications"
  ON public.applications FOR INSERT WITH CHECK (auth.uid() = candidate_id);

-- Saved jobs
CREATE POLICY "Users can see their saved jobs"
  ON public.saved_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage saved jobs"
  ON public.saved_jobs FOR ALL USING (auth.uid() = user_id);
