# CV Builder — Database Design

> **Stack**: PostgreSQL (Supabase) · Prisma ORM  
> **Ngày**: 2026-02-25  
> **Tác giả**: NPC001 AI Agent

---

## Tổng quan kiến trúc

```
templates  ──(1:N)──  resumes
  └─ structure_schema (JSONB)     └─ resume_data (JSONB)
     Định nghĩa các blocks           Nội dung người dùng nhập
     ↕ map theo block_id ↕
```

**Nguyên tắc thiết kế:**

- Không tạo mỗi mẫu một bảng riêng
- Dùng `JSONB` để linh hoạt với mọi loại CV
- `structure_schema` định nghĩa _cấu trúc_, `resume_data` lưu _nội dung_
- Frontend map hai cột này theo `block_id` để render

---

## 1. SQL Schema (Supabase PostgreSQL)

```sql
-- =====================================================
-- CV BUILDER DATABASE SCHEMA
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TABLE: templates ────────────────────────────────
CREATE TABLE public.templates (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name             TEXT NOT NULL,
    thumbnail_url    TEXT,
    category         TEXT DEFAULT 'general',     -- 'tech' | 'creative' | 'general'
    is_premium       BOOLEAN DEFAULT FALSE,
    default_styling  JSONB NOT NULL DEFAULT '{}', -- Font, màu, spacing mặc định
    structure_schema JSONB NOT NULL DEFAULT '[]', -- Định nghĩa các blocks của template
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: resumes ──────────────────────────────────
CREATE TABLE public.resumes (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id      UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    title            TEXT NOT NULL DEFAULT 'Untitled CV',
    resume_data      JSONB NOT NULL DEFAULT '[]', -- Nội dung từng block (quan trọng nhất)
    current_styling  JSONB NOT NULL DEFAULT '{}', -- Override theme của user
    is_public        BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────
CREATE INDEX idx_resumes_user_id     ON public.resumes(user_id);
CREATE INDEX idx_resumes_template_id ON public.resumes(template_id);
CREATE INDEX idx_resumes_data        ON public.resumes  USING GIN(resume_data);
CREATE INDEX idx_templates_structure ON public.templates USING GIN(structure_schema);

-- ─── AUTO-UPDATE updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_templates_updated_at
    BEFORE UPDATE ON public.templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_resumes_updated_at
    BEFORE UPDATE ON public.resumes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ROW LEVEL SECURITY ──────────────────────────────
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes   ENABLE ROW LEVEL SECURITY;

-- Templates: mọi người đọc được, chỉ admin ghi
CREATE POLICY "templates_public_read"
    ON public.templates FOR SELECT USING (TRUE);

-- Resumes: user chỉ thấy CV của chính mình
CREATE POLICY "resumes_owner_all"
    ON public.resumes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```

---

## 2. Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Template {
  id              String   @id @default(uuid()) @db.Uuid
  name            String
  thumbnailUrl    String?  @map("thumbnail_url")
  category        String   @default("general")
  isPremium       Boolean  @default(false) @map("is_premium")
  defaultStyling  Json     @default("{}") @map("default_styling") @db.JsonB
  structureSchema Json     @default("[]") @map("structure_schema") @db.JsonB
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime @updatedAt      @map("updated_at") @db.Timestamptz

  resumes Resume[]

  @@map("templates")
}

model Resume {
  id             String   @id @default(uuid()) @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  templateId     String?  @map("template_id") @db.Uuid
  title          String   @default("Untitled CV")
  resumeData     Json     @default("[]") @map("resume_data") @db.JsonB
  currentStyling Json     @default("{}") @map("current_styling") @db.JsonB
  isPublic       Boolean  @default(false) @map("is_public")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime @updatedAt      @map("updated_at") @db.Timestamptz

  template Template? @relation(fields: [templateId], references: [id])

  @@index([userId])
  @@index([templateId])
  @@map("resumes")
}
```

---

## 3. JSON Mẫu: `structure_schema` (bảng `templates`)

> Frontend đọc cái này để biết cần render **những block gì** và **form nào**.

```json
[
  {
    "block_id": "header",
    "block_type": "header",
    "label": "Thông tin cá nhân",
    "is_required": true,
    "icon": "person",
    "fields": [
      {
        "key": "fullName",
        "label": "Họ tên",
        "type": "text",
        "required": true
      },
      {
        "key": "title",
        "label": "Chức danh",
        "type": "text",
        "required": true
      },
      {
        "key": "avatarUrl",
        "label": "Ảnh đại diện",
        "type": "image",
        "required": false
      }
    ]
  },
  {
    "block_id": "contact",
    "block_type": "personal_info",
    "label": "Liên hệ",
    "is_required": true,
    "icon": "contact_page",
    "fields": [
      { "key": "email", "label": "Email", "type": "email", "required": true },
      {
        "key": "phone",
        "label": "Điện thoại",
        "type": "tel",
        "required": false
      },
      {
        "key": "linkedin",
        "label": "LinkedIn",
        "type": "url",
        "required": false
      },
      { "key": "github", "label": "GitHub", "type": "url", "required": false },
      {
        "key": "address",
        "label": "Địa chỉ",
        "type": "text",
        "required": false
      }
    ]
  },
  {
    "block_id": "summary",
    "block_type": "rich_text",
    "label": "Giới thiệu bản thân",
    "is_required": false,
    "icon": "article",
    "fields": [
      {
        "key": "content",
        "label": "Nội dung",
        "type": "richtext",
        "required": false
      }
    ]
  },
  {
    "block_id": "experience",
    "block_type": "list",
    "label": "Kinh nghiệm làm việc",
    "is_required": false,
    "icon": "work",
    "item_fields": [
      {
        "key": "company",
        "label": "Công ty",
        "type": "text",
        "required": true
      },
      {
        "key": "position",
        "label": "Vị trí",
        "type": "text",
        "required": true
      },
      {
        "key": "startDate",
        "label": "Bắt đầu",
        "type": "month",
        "required": true
      },
      {
        "key": "endDate",
        "label": "Kết thúc",
        "type": "month",
        "required": false
      },
      {
        "key": "isCurrent",
        "label": "Hiện tại",
        "type": "boolean",
        "required": false
      },
      {
        "key": "description",
        "label": "Mô tả",
        "type": "richtext",
        "required": false
      }
    ]
  },
  {
    "block_id": "education",
    "block_type": "list",
    "label": "Học vấn",
    "is_required": false,
    "icon": "school",
    "item_fields": [
      {
        "key": "institution",
        "label": "Trường",
        "type": "text",
        "required": true
      },
      {
        "key": "degree",
        "label": "Chuyên ngành",
        "type": "text",
        "required": true
      },
      { "key": "gpa", "label": "GPA", "type": "text", "required": false },
      {
        "key": "startDate",
        "label": "Niên khoá",
        "type": "year",
        "required": false
      },
      {
        "key": "endDate",
        "label": "Tốt nghiệp",
        "type": "year",
        "required": false
      }
    ]
  },
  {
    "block_id": "skills",
    "block_type": "tag_list",
    "label": "Kỹ năng",
    "is_required": false,
    "icon": "psychology",
    "item_fields": [
      { "key": "name", "label": "Kỹ năng", "type": "text", "required": true },
      {
        "key": "level",
        "label": "Mức độ",
        "type": "select",
        "options": ["Beginner", "Intermediate", "Advanced", "Expert"]
      }
    ]
  }
]
```

---

## 4. JSON Mẫu: `resume_data` (bảng `resumes`)

> Nội dung thực tế người dùng nhập — map 1-1 với `structure_schema` theo `block_id`.

```json
[
  {
    "block_id": "header",
    "is_visible": true,
    "data": {
      "fullName": "Nguyễn Văn A",
      "title": "Senior Frontend Developer",
      "avatarUrl": "https://cdn.example.com/avatars/user-123.jpg"
    }
  },
  {
    "block_id": "contact",
    "is_visible": true,
    "data": {
      "email": "nguyenvana.dev@gmail.com",
      "phone": "+84 912 345 678",
      "linkedin": "linkedin.com/in/nguyenvana",
      "github": "github.com/nguyenvana",
      "address": "Hà Nội, Việt Nam"
    }
  },
  {
    "block_id": "summary",
    "is_visible": true,
    "data": {
      "content": "<p>Senior Frontend Developer với <strong>5+ năm kinh nghiệm</strong>, chuyên sâu React/Next.js. Đã ship 4 sản phẩm SaaS có <em>50k+ users</em>.</p>"
    }
  },
  {
    "block_id": "experience",
    "is_visible": true,
    "data": {
      "items": [
        {
          "id": "exp-001",
          "company": "TechCorp Vietnam",
          "position": "Senior Frontend Developer",
          "startDate": "2022-03",
          "endDate": null,
          "isCurrent": true,
          "description": "<ul><li>Dẫn dắt team 4 FE engineers xây dựng dashboard B2B</li><li>Tối ưu LCP từ 3.2s → 1.1s</li></ul>"
        },
        {
          "id": "exp-002",
          "company": "StartupABC",
          "position": "Frontend Developer",
          "startDate": "2019-06",
          "endDate": "2022-02",
          "isCurrent": false,
          "description": "<ul><li>Tích hợp Stripe payments, tăng conversion 22%</li></ul>"
        }
      ]
    }
  },
  {
    "block_id": "education",
    "is_visible": true,
    "data": {
      "items": [
        {
          "id": "edu-001",
          "institution": "Đại học Bách Khoa Hà Nội",
          "degree": "Kỹ sư Công nghệ Thông tin",
          "gpa": "3.6/4.0",
          "startDate": "2015",
          "endDate": "2019"
        }
      ]
    }
  },
  {
    "block_id": "skills",
    "is_visible": true,
    "data": {
      "items": [
        { "id": "sk-1", "name": "React.js", "level": "Expert" },
        { "id": "sk-2", "name": "Next.js", "level": "Expert" },
        { "id": "sk-3", "name": "TypeScript", "level": "Advanced" },
        { "id": "sk-4", "name": "Tailwind CSS", "level": "Advanced" },
        { "id": "sk-5", "name": "Node.js", "level": "Intermediate" }
      ]
    }
  }
]
```

---

## 5. Frontend: Cách Map và Render

```typescript
// types.ts — TypeScript interfaces tương ứng với schema

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'email' | 'url' | 'tel' | 'image' | 'richtext' | 'month' | 'year' | 'boolean' | 'select';
  required?: boolean;
  options?: string[];
}

interface BlockDef {
  block_id: string;
  block_type: 'header' | 'personal_info' | 'rich_text' | 'list' | 'tag_list';
  label: string;
  is_required: boolean;
  icon: string;
  fields?: FieldDef[];       // Cho các block đơn (header, contact, summary)
  item_fields?: FieldDef[];  // Cho các block dạng list (experience, education, skills)
}

interface ResumeBlock {
  block_id: string;
  is_visible: boolean;
  data: Record<string, unknown>;
}

// CVRenderer.tsx — Render CV từ template + resume data
function CVRenderer({ structureSchema, resumeData }: {
  structureSchema: BlockDef[];
  resumeData: ResumeBlock[];
}) {
  // Index resume data theo block_id để lookup O(1)
  const dataMap = Object.fromEntries(
    resumeData.map(block => [block.block_id, block])
  );

  return (
    <>
      {structureSchema.map(blockDef => {
        const blockData = dataMap[blockDef.block_id];
        if (!blockData?.is_visible) return null;

        switch (blockDef.block_type) {
          case 'header':       return <HeaderBlock      key={blockDef.block_id} schema={blockDef} data={blockData.data} />;
          case 'personal_info':return <ContactBlock     key={blockDef.block_id} schema={blockDef} data={blockData.data} />;
          case 'rich_text':    return <RichTextBlock    key={blockDef.block_id} data={blockData.data} />;
          case 'list':         return <ListBlock        key={blockDef.block_id} schema={blockDef} data={blockData.data} />;
          case 'tag_list':     return <TagListBlock     key={blockDef.block_id} schema={blockDef} data={blockData.data} />;
          default: return null;
        }
      })}
    </>
  );
}
```

---

## 6. Quyết định Thiết kế

| Quyết định                                           | Lý do                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `structure_schema` là **array** (có thứ tự)          | Đảm bảo thứ tự render đúng theo thiết kế template                                    |
| `resume_data` là **array**, tìm kiếm bằng `block_id` | Frontend build Map O(1), dễ sync với schema                                          |
| `block_type` tách biệt khỏi `block_id`               | Một type (`list`) dùng cho nhiều block (experience, education, projects)             |
| `item_fields` trong list blocks                      | Template tự định nghĩa fields → Frontend render form **dynamically**                 |
| `is_visible` trong mỗi block của `resume_data`       | User có thể ẩn/hiện block mà không mất dữ liệu                                       |
| GIN index cho JSONB                                  | Query nhanh theo nội dung bên trong JSON (`resume_data @> '{"block_id": "skills"}'`) |
| RLS theo `auth.uid()`                                | Supabase tự enforce ở database layer, không cần middleware                           |

---

## 7. Ví dụ Query Supabase TypeScript

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Lấy danh sách templates
const { data: templates } = await supabase
  .from("templates")
  .select(
    "id, name, thumbnail_url, category, default_styling, structure_schema",
  )
  .order("created_at", { ascending: false });

// Lấy resume của user hiện tại
const { data: resumes } = await supabase
  .from("resumes")
  .select("*, template:templates(name, structure_schema, default_styling)")
  .eq("user_id", userId)
  .order("updated_at", { ascending: false });

// Lưu resume_data (auto-save)
const { error } = await supabase
  .from("resumes")
  .update({ resume_data: blocks, current_styling: styling })
  .eq("id", resumeId);
```
