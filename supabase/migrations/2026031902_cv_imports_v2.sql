CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'cv_document_status'
  ) THEN
    CREATE TYPE public.cv_document_status AS ENUM (
      'uploaded',
      'queued',
      'normalizing',
      'rendering_preview',
      'ocr_running',
      'layout_running',
      'vl_running',
      'parsing_structured',
      'persisting',
      'ready',
      'partial_ready',
      'failed',
      'retrying'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'cv_document_type'
  ) THEN
    CREATE TYPE public.cv_document_type AS ENUM (
      'unknown',
      'cv',
      'non_cv_document'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'cv_failure_stage'
  ) THEN
    CREATE TYPE public.cv_failure_stage AS ENUM (
      'upload',
      'queue',
      'normalize',
      'render_preview',
      'ocr',
      'layout',
      'classification',
      'vl',
      'parse_structured',
      'persist',
      'export'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'cv_artifact_kind'
  ) THEN
    CREATE TYPE public.cv_artifact_kind AS ENUM (
      'original_file',
      'normalized_source',
      'preview_page',
      'preview_pdf',
      'thumbnail_page',
      'markdown_pages',
      'ocr_raw',
      'layout_raw',
      'vl_raw',
      'parser_raw',
      'normalized_json',
      'export_pdf'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'cv_artifact_status'
  ) THEN
    CREATE TYPE public.cv_artifact_status AS ENUM (
      'pending',
      'ready',
      'stale',
      'failed'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'editable_cv_status'
  ) THEN
    CREATE TYPE public.editable_cv_status AS ENUM (
      'draft',
      'ready',
      'partial_ready',
      'saving',
      'failed'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'compose_strategy'
  ) THEN
    CREATE TYPE public.compose_strategy AS ENUM (
      'plain_text',
      'multiline_join',
      'bullet_list',
      'date_range',
      'contact_pair',
      'title_subtitle'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'parse_strategy'
  ) THEN
    CREATE TYPE public.parse_strategy AS ENUM (
      'plain_text',
      'multiline_join',
      'bullet_list',
      'date_range',
      'contact_pair',
      'title_subtitle'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.cv_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.cv_document_status NOT NULL DEFAULT 'uploaded',
  document_type public.cv_document_type NOT NULL DEFAULT 'unknown',
  classification_confidence NUMERIC(5,4),
  classification_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_required BOOLEAN NOT NULL DEFAULT FALSE,
  review_reason_code TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_sha256 TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  page_count INTEGER,
  raw_text TEXT,
  parsed_json JSONB,
  failure_stage public.cv_failure_stage,
  failure_code TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  job_id TEXT,
  processing_lock_token TEXT,
  last_heartbeat_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  queued_at TIMESTAMPTZ,
  processing_started_at TIMESTAMPTZ,
  processing_finished_at TIMESTAMPTZ,
  queue_wait_ms BIGINT,
  total_processing_ms BIGINT,
  stage_durations JSONB NOT NULL DEFAULT '{}'::jsonb,
  pipeline_version TEXT NOT NULL DEFAULT 'v2',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cv_document_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.cv_documents(id) ON DELETE CASCADE,
  artifact_key TEXT NOT NULL UNIQUE,
  kind public.cv_artifact_kind NOT NULL,
  status public.cv_artifact_status NOT NULL DEFAULT 'ready',
  page_number INTEGER,
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size BIGINT,
  sha256 TEXT,
  source_stage public.cv_failure_stage,
  producer_model TEXT,
  producer_version TEXT,
  prompt_version TEXT,
  input_fingerprint TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cv_document_stage_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.cv_documents(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL,
  page_number INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_ms BIGINT,
  queue_wait_ms BIGINT,
  error_code TEXT,
  error_message TEXT,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cv_document_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.cv_documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  canonical_width_px INTEGER NOT NULL,
  canonical_height_px INTEGER NOT NULL,
  background_artifact_id UUID REFERENCES public.cv_document_artifacts(id) ON DELETE SET NULL,
  thumbnail_artifact_id UUID REFERENCES public.cv_document_artifacts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, page_number)
);

CREATE TABLE IF NOT EXISTS public.cv_ocr_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.cv_documents(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.cv_document_pages(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  confidence NUMERIC(5,4),
  bbox_px JSONB NOT NULL,
  bbox_normalized JSONB NOT NULL,
  polygon_px JSONB,
  type TEXT NOT NULL,
  editable BOOLEAN NOT NULL DEFAULT TRUE,
  layout_group_id TEXT,
  sequence INTEGER NOT NULL,
  suggested_json_path TEXT,
  suggested_mapping_role TEXT,
  suggested_compose_strategy public.compose_strategy,
  suggested_parse_strategy public.parse_strategy,
  mapping_confidence NUMERIC(5,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cv_layout_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.cv_documents(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.cv_document_pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  bbox_px JSONB NOT NULL,
  bbox_normalized JSONB NOT NULL,
  order_index INTEGER NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.editable_cvs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.cv_documents(id) ON DELETE CASCADE,
  status public.editable_cv_status NOT NULL DEFAULT 'draft',
  parsed_json JSONB NOT NULL,
  updated_json JSONB NOT NULL,
  current_version_number INTEGER NOT NULL DEFAULT 1,
  autosave_revision INTEGER NOT NULL DEFAULT 0,
  last_client_mutation_id TEXT,
  last_saved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.editable_cv_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  editable_cv_id UUID NOT NULL REFERENCES public.editable_cvs(id) ON DELETE CASCADE,
  document_page_id UUID NOT NULL REFERENCES public.cv_document_pages(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  canonical_width_px INTEGER NOT NULL,
  canonical_height_px INTEGER NOT NULL,
  background_artifact_id UUID NOT NULL REFERENCES public.cv_document_artifacts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(editable_cv_id, page_number)
);

CREATE TABLE IF NOT EXISTS public.editable_cv_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  editable_cv_id UUID NOT NULL REFERENCES public.editable_cvs(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.editable_cv_pages(id) ON DELETE CASCADE,
  source_ocr_block_id UUID REFERENCES public.cv_ocr_blocks(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  original_text TEXT,
  edited_text TEXT,
  confidence NUMERIC(5,4),
  bbox_px JSONB NOT NULL,
  bbox_normalized JSONB NOT NULL,
  style_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  asset_artifact_id UUID REFERENCES public.cv_document_artifacts(id) ON DELETE SET NULL,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  sequence INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.editable_cv_block_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  editable_cv_id UUID NOT NULL REFERENCES public.editable_cvs(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES public.editable_cv_blocks(id) ON DELETE CASCADE,
  json_path TEXT NOT NULL,
  mapping_role TEXT NOT NULL,
  compose_strategy public.compose_strategy NOT NULL,
  parse_strategy public.parse_strategy NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  confidence NUMERIC(5,4),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(block_id, json_path, mapping_role, sequence)
);

CREATE TABLE IF NOT EXISTS public.editable_cv_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  editable_cv_id UUID NOT NULL REFERENCES public.editable_cvs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot_updated_json JSONB NOT NULL,
  snapshot_blocks JSONB NOT NULL,
  snapshot_sync_map JSONB NOT NULL,
  change_summary TEXT,
  restored_from_version_id UUID REFERENCES public.editable_cv_versions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(editable_cv_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.editable_cv_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  editable_cv_id UUID NOT NULL REFERENCES public.editable_cvs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  artifact_id UUID NOT NULL REFERENCES public.cv_document_artifacts(id) ON DELETE RESTRICT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cv_documents_user_created_at
  ON public.cv_documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cv_documents_status
  ON public.cv_documents(status);
CREATE INDEX IF NOT EXISTS idx_cv_documents_file_sha256
  ON public.cv_documents(file_sha256);
CREATE INDEX IF NOT EXISTS idx_cv_document_artifacts_document_id
  ON public.cv_document_artifacts(document_id);
CREATE INDEX IF NOT EXISTS idx_cv_document_stage_runs_document_started
  ON public.cv_document_stage_runs(document_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cv_document_stage_runs_job_stage_attempt
  ON public.cv_document_stage_runs(job_id, stage_name, attempt);
CREATE INDEX IF NOT EXISTS idx_cv_ocr_blocks_document_page_sequence
  ON public.cv_ocr_blocks(document_id, page_id, sequence);
CREATE INDEX IF NOT EXISTS idx_cv_layout_blocks_document_page_order
  ON public.cv_layout_blocks(document_id, page_id, order_index);
CREATE INDEX IF NOT EXISTS idx_editable_cvs_user_updated_at
  ON public.editable_cvs(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_editable_cv_blocks_editable_page_sequence
  ON public.editable_cv_blocks(editable_cv_id, page_id, sequence);
CREATE INDEX IF NOT EXISTS idx_editable_cv_block_mappings_editable_json_path
  ON public.editable_cv_block_mappings(editable_cv_id, json_path);

ALTER TABLE public.cv_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_document_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_document_stage_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_ocr_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_layout_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editable_cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editable_cv_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editable_cv_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editable_cv_block_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editable_cv_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editable_cv_exports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cv_documents' AND policyname = 'cv_documents_owner_all'
  ) THEN
    CREATE POLICY "cv_documents_owner_all"
      ON public.cv_documents
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cv_document_artifacts' AND policyname = 'cv_document_artifacts_owner_read'
  ) THEN
    CREATE POLICY "cv_document_artifacts_owner_read"
      ON public.cv_document_artifacts
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.cv_documents d
          WHERE d.id = document_id AND d.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cv_document_stage_runs' AND policyname = 'cv_document_stage_runs_owner_read'
  ) THEN
    CREATE POLICY "cv_document_stage_runs_owner_read"
      ON public.cv_document_stage_runs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.cv_documents d
          WHERE d.id = document_id AND d.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cv_document_pages' AND policyname = 'cv_document_pages_owner_read'
  ) THEN
    CREATE POLICY "cv_document_pages_owner_read"
      ON public.cv_document_pages
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.cv_documents d
          WHERE d.id = document_id AND d.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cv_ocr_blocks' AND policyname = 'cv_ocr_blocks_owner_read'
  ) THEN
    CREATE POLICY "cv_ocr_blocks_owner_read"
      ON public.cv_ocr_blocks
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.cv_documents d
          WHERE d.id = document_id AND d.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cv_layout_blocks' AND policyname = 'cv_layout_blocks_owner_read'
  ) THEN
    CREATE POLICY "cv_layout_blocks_owner_read"
      ON public.cv_layout_blocks
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.cv_documents d
          WHERE d.id = document_id AND d.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'editable_cvs' AND policyname = 'editable_cvs_owner_all'
  ) THEN
    CREATE POLICY "editable_cvs_owner_all"
      ON public.editable_cvs
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'editable_cv_pages' AND policyname = 'editable_cv_pages_owner_read'
  ) THEN
    CREATE POLICY "editable_cv_pages_owner_read"
      ON public.editable_cv_pages
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.editable_cvs e
          WHERE e.id = editable_cv_id AND e.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'editable_cv_blocks' AND policyname = 'editable_cv_blocks_owner_all'
  ) THEN
    CREATE POLICY "editable_cv_blocks_owner_all"
      ON public.editable_cv_blocks
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.editable_cvs e
          WHERE e.id = editable_cv_id AND e.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.editable_cvs e
          WHERE e.id = editable_cv_id AND e.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'editable_cv_block_mappings' AND policyname = 'editable_cv_block_mappings_owner_all'
  ) THEN
    CREATE POLICY "editable_cv_block_mappings_owner_all"
      ON public.editable_cv_block_mappings
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.editable_cvs e
          WHERE e.id = editable_cv_id AND e.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.editable_cvs e
          WHERE e.id = editable_cv_id AND e.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'editable_cv_versions' AND policyname = 'editable_cv_versions_owner_read'
  ) THEN
    CREATE POLICY "editable_cv_versions_owner_read"
      ON public.editable_cv_versions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.editable_cvs e
          WHERE e.id = editable_cv_id AND e.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'editable_cv_exports' AND policyname = 'editable_cv_exports_owner_read'
  ) THEN
    CREATE POLICY "editable_cv_exports_owner_read"
      ON public.editable_cv_exports
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.editable_cvs e
          WHERE e.id = editable_cv_id AND e.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cv_documents_updated_at'
  ) THEN
    CREATE TRIGGER trg_cv_documents_updated_at
      BEFORE UPDATE ON public.cv_documents
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cv_document_artifacts_updated_at'
  ) THEN
    CREATE TRIGGER trg_cv_document_artifacts_updated_at
      BEFORE UPDATE ON public.cv_document_artifacts
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cv_document_pages_updated_at'
  ) THEN
    CREATE TRIGGER trg_cv_document_pages_updated_at
      BEFORE UPDATE ON public.cv_document_pages
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cv_ocr_blocks_updated_at'
  ) THEN
    CREATE TRIGGER trg_cv_ocr_blocks_updated_at
      BEFORE UPDATE ON public.cv_ocr_blocks
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cv_layout_blocks_updated_at'
  ) THEN
    CREATE TRIGGER trg_cv_layout_blocks_updated_at
      BEFORE UPDATE ON public.cv_layout_blocks
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_editable_cvs_updated_at'
  ) THEN
    CREATE TRIGGER trg_editable_cvs_updated_at
      BEFORE UPDATE ON public.editable_cvs
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_editable_cv_pages_updated_at'
  ) THEN
    CREATE TRIGGER trg_editable_cv_pages_updated_at
      BEFORE UPDATE ON public.editable_cv_pages
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_editable_cv_blocks_updated_at'
  ) THEN
    CREATE TRIGGER trg_editable_cv_blocks_updated_at
      BEFORE UPDATE ON public.editable_cv_blocks
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_editable_cv_block_mappings_updated_at'
  ) THEN
    CREATE TRIGGER trg_editable_cv_block_mappings_updated_at
      BEFORE UPDATE ON public.editable_cv_block_mappings
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('cv-originals', 'cv-originals', FALSE, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('cv-previews', 'cv-previews', FALSE, 52428800, ARRAY['application/pdf', 'image/png', 'image/jpeg']),
  ('cv-assets', 'cv-assets', FALSE, 52428800, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('cv-exports', 'cv-exports', FALSE, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
