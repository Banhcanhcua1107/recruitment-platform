# TalentFlow Project - Comprehensive Documentation (Confluence Style)

> **Dự án**: Nền tảng tuyển dụng thông minh TalentFlow  
> **Phiên bản**: 1.0.0  
> **Cập nhật**: 2026-03-05  
> **Chủ sở hữu**: TalentFlow Team / NPC001 AI Agent

---

## 🏗️ 1. Architecture Overview (Kiến trúc Tổng quan)

Hệ thống được thiết kế theo kiến trúc **với trọng tâm là AI (AI-First)**, kết hợp sức mạnh của Cloud (Next.js + Supabase) và Local AI Services (FastAPI + Ollama/RapidOCR).

### Sơ đồ luồng (Architecture Flow)
- **Frontend**: Next.js 16 (App Router), TailwindCSS 4, Framer Motion.
- **Primary API**: Next.js API Routes (Serverless).
- **AI Backend**: FastAPI (Python) phục vụ các tác vụ nặng như OCR, Extraction.
- **Database**: Supabase (PostgreSQL) + Prisma ORM.

---

## 📝 2. AI & OCR Implementation (Xử lý CV & Trích xuất)

### Quy trình xử lý CV (Resume Processing Pipeline)
1. **Upload**: PDF/Image được đẩy lên Supabase Storage.
2. **OCR Service (FastAPI)**:
    - Sử dụng **RapidOCR** (Local) để trích xuất text kèm tọa độ (Bbox).
    - **Vietnamize**: Sửa lỗi font tiếng Việt, chuẩn hóa ký tự đặc biệt.
3. **Parse & Structure**:
    - Chuyển `Bbox` text thành `Normalized JSON`.
    - Phân tích layout (Headers, Columns, Lists) để gom nhóm dữ liệu.
4. **CV Builder**:
    - Dữ liệu OCR được mapping vào editor để người dùng chỉnh sửa trực tiếp.

---

## 📊 3. Database Design (Thiết kế Cơ sở dữ liệu)

Sử dụng mô hình **Flexible JSON Schema** để hỗ trợ mọi mẫu CV mà không cần thay đổi cấu trúc bảng.

- **Tables**:
    - `templates`: Định nghĩa `structure_schema` (các block Cần có).
    - `resumes`: Lưu `resume_data` dưới dạng `JSONB` (nội dung thực tế).
    - `candidate_profiles`: Thông tin cá nhân, kỹ năng, định hướng nghề nghiệp.
- **Auth**: Tích hợp Supabase Auth với RLS (Row Level Security) đảm bảo bảo mật dữ liệu người dùng.

---

## ✨ 4. AI Job Recommendation (Hệ thống Gợi ý Việc làm)

Hệ thống phân tích hồ sơ ứng viên để tìm ra top 6 việc làm phù hợp nhất.

### Logic hoạt động
- **Gemini API (Google)**: Sử dụng model `gemini-2.0-flash-lite` để ranking dựa trên Text Similarity & Semantic Matching.
- **Fallback Rule**: Khi API quá tải (Rate-limit 429), hệ thống tự động chuyển sang **Local Keyword Matching** để đảm bảo dịch vụ không bị gián đoạn.
- **Dataset**: 50 việc làm thực tế được aggregate và chuẩn hóa.

---

## 🔔 5. Notification System (Hệ thống Thông báo)

Hệ thống thông báo thời gian thực giúp ứng viên không bỏ lỡ cơ hội.

- **Công nghệ**: Supabase Realtime (WebSockets) + Lucide Icons.
- **Tính năng**:
    - Thông báo khi có việc làm mới phù hợp.
    - Cập nhật khi nhà tuyển dụng xem hồ sơ.
    - Animation mượt mà với Framer Motion.

---

## 🚀 6. Technology Stack (Công nghệ sử dụng)

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TailwindCSS 4 |
| **Backend** | API Routes (TS), FastAPI (Python) |
| **Database** | PostgreSQL (Supabase), Prisma |
| **AI/ML** | Gemini API, RapidOCR, Ollama |
| **Animation** | Framer Motion |

---

## 🛠️ 7. Development Guidelines

1. **Clean Code**: Tuân thủ nguyên tắc Clean Code và SOLID.
2. **AI-First**: Mọi tính năng mới nên được xem xét khả năng tích hợp AI.
3. **Vietnamese First**: Ưu tiên trải nghiệm và ngôn ngữ tiếng Việt (Tiêu chuẩn quốc gia).
