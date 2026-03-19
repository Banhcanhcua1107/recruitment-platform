-- Rollback only jobs created by:
--   supabase/seed/jobbsql_banhcanhcuah2l.sql
-- Target account:
--   banhcanhcuah2l@gmail.com

DO $$
DECLARE
  target_employer_id UUID;
  deleted_count INTEGER := 0;
BEGIN
  SELECT e.id
  INTO target_employer_id
  FROM public.employers e
  WHERE e.email = 'banhcanhcuah2l@gmail.com'
  LIMIT 1;

  IF target_employer_id IS NULL THEN
    RAISE EXCEPTION 'Khong tim thay employers voi email banhcanhcuah2l@gmail.com';
  END IF;

  DELETE FROM public.jobs j
  WHERE j.employer_id = target_employer_id
    AND COALESCE(j.raw->>'seed_key', '') = 'jobbsql_banhcanhcuah2l';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % jobs with seed_key=jobbsql_banhcanhcuah2l for employer %', deleted_count, target_employer_id;
END $$;
