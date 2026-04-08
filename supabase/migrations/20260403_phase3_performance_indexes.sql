DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'status'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'is_public_visible'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'posted_date'
  ) THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_jobs_public_listing
      ON public.jobs(status, is_public_visible, posted_date DESC)
      WHERE employer_id IS NOT NULL
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'employer_id'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'posted_date'
  ) THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_jobs_employer_posted_date
      ON public.jobs(employer_id, posted_date DESC)
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'saved_jobs'
  ) THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_created_at
      ON public.saved_jobs(user_id, created_at DESC)
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'job_recommendations'
  ) THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_job_recommendations_updated_at
      ON public.job_recommendations(updated_at DESC)
    ';
  END IF;
END $$;
