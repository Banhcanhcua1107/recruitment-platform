-- Add stable internal candidate codes for ATS operations and search.

CREATE TABLE IF NOT EXISTS public.candidate_code_sequences (
  sequence_year INTEGER PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE OR REPLACE FUNCTION public.generate_candidate_code(
  target_created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
)
RETURNS TEXT AS $$
DECLARE
  code_year INTEGER := EXTRACT(YEAR FROM COALESCE(target_created_at, timezone('utc', now())));
  next_value INTEGER;
BEGIN
  INSERT INTO public.candidate_code_sequences AS seq (
    sequence_year,
    last_value,
    updated_at
  )
  VALUES (code_year, 1, timezone('utc', now()))
  ON CONFLICT (sequence_year)
  DO UPDATE SET
    last_value = seq.last_value + 1,
    updated_at = timezone('utc', now())
  RETURNING last_value INTO next_value;

  RETURN format('CAND-%s-%s', code_year, lpad(next_value::text, 4, '0'));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.assign_candidate_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.candidate_code IS NULL OR btrim(NEW.candidate_code) = '' THEN
    NEW.candidate_code = public.generate_candidate_code(
      COALESCE(NEW.created_at, timezone('utc', now()))
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS candidate_code TEXT;

DO $$
DECLARE
  candidate_row RECORD;
BEGIN
  FOR candidate_row IN
    SELECT id, created_at
    FROM public.candidates
    WHERE candidate_code IS NULL OR btrim(candidate_code) = ''
    ORDER BY created_at ASC, id ASC
  LOOP
    UPDATE public.candidates
    SET candidate_code = public.generate_candidate_code(candidate_row.created_at)
    WHERE id = candidate_row.id;
  END LOOP;
END $$;

INSERT INTO public.candidate_code_sequences (
  sequence_year,
  last_value,
  updated_at
)
SELECT
  substring(candidate_code FROM 6 FOR 4)::INTEGER AS sequence_year,
  MAX(substring(candidate_code FROM 11 FOR 4)::INTEGER) AS last_value,
  timezone('utc', now()) AS updated_at
FROM public.candidates
WHERE candidate_code ~ '^CAND-[0-9]{4}-[0-9]{4}$'
GROUP BY 1
ON CONFLICT (sequence_year)
DO UPDATE SET
  last_value = GREATEST(public.candidate_code_sequences.last_value, EXCLUDED.last_value),
  updated_at = timezone('utc', now());

DROP TRIGGER IF EXISTS trigger_assign_candidate_code ON public.candidates;
CREATE TRIGGER trigger_assign_candidate_code
BEFORE INSERT ON public.candidates
FOR EACH ROW
EXECUTE FUNCTION public.assign_candidate_code();

ALTER TABLE public.candidates
  ALTER COLUMN candidate_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_candidate_code
  ON public.candidates(candidate_code);
