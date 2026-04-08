-- Source editor multi-format versioning
-- TODO: adjust to your project if you keep cv_documents in a custom schema.

CREATE TABLE IF NOT EXISTS public.document_file_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.cv_documents(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'word', 'image')),
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  source text NOT NULL CHECK (source IN ('upload', 'pipeline', 'edit')),
  based_on_version_id uuid NULL REFERENCES public.document_file_versions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  content_type text NOT NULL,
  size_bytes bigint NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS document_file_versions_doc_version_idx
  ON public.document_file_versions(document_id, version_number);

ALTER TABLE public.cv_documents
  ADD COLUMN IF NOT EXISTS source_file_version_id uuid NULL REFERENCES public.document_file_versions(id),
  ADD COLUMN IF NOT EXISTS latest_file_version_id uuid NULL REFERENCES public.document_file_versions(id),
  ADD COLUMN IF NOT EXISTS last_parsed_version_id uuid NULL REFERENCES public.document_file_versions(id),
  ADD COLUMN IF NOT EXISTS file_updated_after_parse boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reparse_recommended boolean NOT NULL DEFAULT false;
