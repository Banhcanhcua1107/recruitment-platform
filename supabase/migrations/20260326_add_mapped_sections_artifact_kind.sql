DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'cv_artifact_kind'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'mapped_sections'
      AND enumtypid = 'public.cv_artifact_kind'::regtype
  ) THEN
    ALTER TYPE public.cv_artifact_kind ADD VALUE 'mapped_sections';
  END IF;
END $$;
