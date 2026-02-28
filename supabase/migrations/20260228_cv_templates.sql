-- =====================================================
-- CV BUILDER: TEMPLATES & RESUMES SCHEMA + SEED DATA
-- Ngày: 2026-02-28
-- Mẫu CV: F8 Green Modern (theo mẫu f8.edu.vn)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TABLE: templates ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.templates (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name             TEXT NOT NULL,
    thumbnail_url    TEXT,
    category         TEXT DEFAULT 'general',
    is_premium       BOOLEAN DEFAULT FALSE,
    default_styling  JSONB NOT NULL DEFAULT '{}',
    structure_schema JSONB NOT NULL DEFAULT '[]',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: resumes ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.resumes (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id      UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    title            TEXT NOT NULL DEFAULT 'Untitled CV',
    resume_data      JSONB NOT NULL DEFAULT '[]',
    current_styling  JSONB NOT NULL DEFAULT '{}',
    is_public        BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_resumes_user_id     ON public.resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_template_id ON public.resumes(template_id);
CREATE INDEX IF NOT EXISTS idx_resumes_data        ON public.resumes USING GIN(resume_data);
CREATE INDEX IF NOT EXISTS idx_templates_structure  ON public.templates USING GIN(structure_schema);

-- ─── AUTO-UPDATE updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_templates_updated_at'
  ) THEN
    CREATE TRIGGER trg_templates_updated_at
      BEFORE UPDATE ON public.templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_resumes_updated_at'
  ) THEN
    CREATE TRIGGER trg_resumes_updated_at
      BEFORE UPDATE ON public.resumes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ─── ROW LEVEL SECURITY ──────────────────────────────
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes   ENABLE ROW LEVEL SECURITY;

-- Templates: ai cũng đọc được, chỉ admin ghi
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'templates_public_read' AND tablename = 'templates'
  ) THEN
    CREATE POLICY "templates_public_read"
      ON public.templates FOR SELECT USING (TRUE);
  END IF;
END $$;

-- Resumes: user chỉ thấy CV của chính mình
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'resumes_owner_all' AND tablename = 'resumes'
  ) THEN
    CREATE POLICY "resumes_owner_all"
      ON public.resumes FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- =====================================================
-- SEED: F8 Green Modern Template
-- Mẫu CV giống hình f8.edu.vn (3 trang)
-- =====================================================

INSERT INTO public.templates (id, name, thumbnail_url, category, is_premium, default_styling, structure_schema)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'F8 Green Modern',
  NULL,
  'tech',
  FALSE,
  -- ─── default_styling ───────────────────────────────
  '{
    "colors": {
      "primary": "#4CAF50",
      "secondary": "#388E3C",
      "text": "#333333",
      "background": "#FFFFFF",
      "accent": "#66BB6A",
      "sectionTitle": "#4CAF50",
      "border": "#E0E0E0"
    },
    "fonts": {
      "heading": "Manrope",
      "body": "Manrope"
    },
    "spacing": 4,
    "layout": {
      "type": "single-column",
      "headerStyle": "left-aligned-with-photo",
      "sectionDivider": "green-circle-icon"
    }
  }'::jsonb,

  -- ─── structure_schema ──────────────────────────────
  '[
    {
      "block_id": "header",
      "block_type": "header",
      "label": "Thông tin cơ bản",
      "is_required": true,
      "icon": "person",
      "fields": [
        { "key": "fullName", "label": "Họ và tên", "type": "text", "required": true },
        { "key": "title", "label": "Chức danh / Vị trí ứng tuyển", "type": "text", "required": true },
        { "key": "avatarUrl", "label": "Ảnh đại diện", "type": "image", "required": false }
      ]
    },
    {
      "block_id": "personal_info",
      "block_type": "personal_info",
      "label": "Thông tin liên hệ",
      "is_required": true,
      "icon": "contact_page",
      "fields": [
        { "key": "fullName", "label": "Tên", "type": "text", "required": false },
        { "key": "dob", "label": "Ngày sinh", "type": "text", "required": false },
        { "key": "phone", "label": "Điện thoại", "type": "tel", "required": false },
        { "key": "email", "label": "Email", "type": "email", "required": true },
        { "key": "address", "label": "Địa chỉ", "type": "text", "required": false }
      ]
    },
    {
      "block_id": "summary",
      "block_type": "rich_text",
      "label": "Giới thiệu chung (Overview)",
      "is_required": false,
      "icon": "article",
      "fields": [
        { "key": "content", "label": "Nội dung", "type": "richtext", "required": false }
      ]
    },
    {
      "block_id": "experience_list",
      "block_type": "list",
      "label": "Kinh nghiệm làm việc",
      "is_required": false,
      "icon": "work",
      "item_fields": [
        { "key": "company", "label": "Công ty", "type": "text", "required": true },
        { "key": "position", "label": "Vị trí", "type": "text", "required": true },
        { "key": "startDate", "label": "Bắt đầu", "type": "month", "required": true },
        { "key": "endDate", "label": "Kết thúc", "type": "month", "required": false },
        { "key": "isCurrent", "label": "Hiện tại", "type": "boolean", "required": false },
        { "key": "description", "label": "Mô tả công việc", "type": "richtext", "required": false }
      ]
    },
    {
      "block_id": "education_list",
      "block_type": "list",
      "label": "Học vấn",
      "is_required": false,
      "icon": "school",
      "item_fields": [
        { "key": "institution", "label": "Trường / Cơ sở đào tạo", "type": "text", "required": true },
        { "key": "degree", "label": "Chuyên ngành", "type": "text", "required": true },
        { "key": "gpa", "label": "Xếp loại / GPA", "type": "text", "required": false },
        { "key": "startDate", "label": "Niên khoá bắt đầu", "type": "year", "required": false },
        { "key": "endDate", "label": "Tốt nghiệp", "type": "year", "required": false }
      ]
    },
    {
      "block_id": "skill_list",
      "block_type": "tag_list",
      "label": "Kỹ năng",
      "is_required": false,
      "icon": "psychology",
      "item_fields": [
        { "key": "category", "label": "Nhóm (Main/Other)", "type": "select", "options": ["Main", "Other"], "required": false },
        { "key": "name", "label": "Kỹ năng", "type": "text", "required": true },
        { "key": "level", "label": "Mức độ", "type": "select", "options": ["Beginner", "Intermediate", "Advanced", "Expert"] }
      ]
    },
    {
      "block_id": "award_list",
      "block_type": "list",
      "label": "Giải thưởng",
      "is_required": false,
      "icon": "emoji_events",
      "item_fields": [
        { "key": "title", "label": "Tên giải thưởng", "type": "text", "required": true },
        { "key": "date", "label": "Thời gian", "type": "month", "required": false },
        { "key": "issuer", "label": "Đơn vị trao giải", "type": "text", "required": false },
        { "key": "description", "label": "Mô tả", "type": "richtext", "required": false }
      ]
    },
    {
      "block_id": "project_list",
      "block_type": "list",
      "label": "Dự án",
      "is_required": false,
      "icon": "folder_open",
      "item_fields": [
        { "key": "name", "label": "Tên dự án", "type": "text", "required": true },
        { "key": "startDate", "label": "Bắt đầu", "type": "month", "required": false },
        { "key": "endDate", "label": "Kết thúc", "type": "month", "required": false },
        { "key": "customer", "label": "Khách hàng (Client)", "type": "text", "required": false },
        { "key": "description", "label": "Mô tả dự án", "type": "richtext", "required": false },
        { "key": "teamSize", "label": "Số thành viên", "type": "text", "required": false },
        { "key": "position", "label": "Vị trí / Vai trò", "type": "text", "required": false },
        { "key": "responsibilities", "label": "Trách nhiệm", "type": "richtext", "required": false },
        { "key": "technologies", "label": "Công nghệ sử dụng", "type": "richtext", "required": false }
      ]
    }
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  default_styling = EXCLUDED.default_styling,
  structure_schema = EXCLUDED.structure_schema,
  updated_at = NOW();
