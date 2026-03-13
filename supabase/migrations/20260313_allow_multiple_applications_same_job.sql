-- Allow candidates to apply to the same job multiple times.
-- This migration removes any unique constraint/index that enforces one application per (candidate_id, job_id).

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.applications'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%candidate_id%'
      AND pg_get_constraintdef(oid) ILIKE '%job_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

DO $$
DECLARE
  idx RECORD;
BEGIN
  FOR idx IN
    SELECT schemaname, indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'applications'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
      AND indexdef ILIKE '%candidate_id%'
      AND indexdef ILIKE '%job_id%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I.%I', idx.schemaname, idx.indexname);
  END LOOP;
END $$;
