# Kiến trúc Hệ thống AI - Recruitment Platform

> Tài liệu mô tả chi tiết luồng hoạt động của **FastAPI Backend**, **Gợi ý chỉnh sửa nội dung CV**, **Gợi ý công ty phù hợp**, và **PaddleOCR (RapidOCR)**.

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [FastAPI Backend (ai-service)](#2-fastapi-backend-ai-service)
3. [Luồng gợi ý chỉnh sửa nội dung CV](#3-luồng-gợi-ý-chỉnh-sửa-nội-dung-cv)
4. [Luồng gợi ý công ty phù hợp](#4-luồng-gợi-ý-công-ty-phù-hợp)
5. [Luồng PaddleOCR (RapidOCR)](#5-luồng-paddleocr-rapidocr)
6. [Bảng tổng hợp công nghệ](#6-bảng-tổng-hợp-công-nghệ)

---

## 1. Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Frontend (Port 3000)                 │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ CV Builder    │  │ Job Recommend│  │ Company Suggest    │    │
│  │ (OCR Upload)  │  │ Dashboard    │  │ (AI Career Advisor)│    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘    │
│         │                  │                    │                │
│  Server Actions      API Route             Server Action        │
│  (ai-actions.ts)  (/api/recommend-jobs)  (ai-actions.ts)       │
└─────────┼──────────────────┼────────────────────┼───────────────┘
          │                  │                    │
          ▼                  ▼                    ▼
┌─────────────────┐  ┌─────────────┐   ┌─────────────────┐
│ FastAPI Backend  │  │ Ollama LLM  │   │ Ollama LLM      │
│ (Port 8000)     │  │ qwen3:4b    │   │ qwen3:4b        │
│                  │  │ (Ranking)   │   │ (Company Suggest)│
│ • /parse-cv      │  └─────────────┘   └─────────────────┘
│ • /match-job     │
│ • /ocr/upload    │
│                  │
│  Ollama Models:  │
│  • qwen3-vl:4b   │
│  • qwen3:4b      │
│  • RapidOCR(ONNX)│
└──────────────────┘
```

**Stack chính:**
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend AI**: FastAPI (Python) chạy trên port 8000
- **LLM Local**: Ollama (qwen3:4b cho text, qwen3-vl:4b cho vision/OCR)
- **OCR Engine**: RapidOCR (PP-OCRv4 qua ONNX Runtime)
- **Database**: Supabase (PostgreSQL)

---

## 2. FastAPI Backend (ai-service)

### 2.1 Cấu trúc thư mục

```
ai-service/
├── main.py                 # FastAPI app, định nghĩa endpoints
├── models.py               # Pydantic models (request/response)
├── requirements.txt        # Dependencies
└── services/
    ├── cv_parser.py        # Trích xuất & cấu trúc hóa CV
    ├── job_matcher.py      # So khớp CV ↔ JD (semantic scoring)
    └── ocr_service.py      # RapidOCR pipeline + Vietnamese correction
```

### 2.2 Khởi động

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Khi khởi động, app kiểm tra kết nối Ollama tại `http://localhost:11434`.

### 2.3 Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| `GET` | `/health` | Kiểm tra service đang hoạt động |
| `POST` | `/parse-cv` | Upload PDF/Image → trả về CV cấu trúc hóa (JSON) |
| `POST` | `/match-job` | So khớp CV text ↔ Job Description → % phù hợp |
| `POST` | `/ocr/upload` | Upload file → bounding boxes cho mỗi vùng text |

### 2.4 Luồng `/parse-cv`

```
┌─────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────┐
│ Upload   │────▶│ Validate     │────▶│ Extract Text  │────▶│ Structure│
│ PDF/Image│     │ • Type check │     │ (pdfplumber)  │     │ (regex + │
│ ≤10MB    │     │ • Size check │     │               │     │ heuristic│
└─────────┘     └──────────────┘     │ Nếu <30 từ:   │     │ sections)│
                                      │ ──────────────│     └────┬─────┘
                                      │ Fallback      │          │
                                      │ Ollama OCR    │          ▼
                                      │ (qwen3-vl:4b) │     ParsedCV
                                      └───────────────┘     (JSON)
```

**Chi tiết pipeline:**

1. **Validate**: Kiểm tra content-type (PDF, JPEG, PNG, WebP), kích thước ≤ 10MB
2. **Text Extraction (Primary)**: Dùng `pdfplumber` trích xuất text từ PDF có text selectable
3. **Fallback OCR**: Nếu text < 30 từ (PDF scan/ảnh) → gửi mỗi trang qua Ollama `qwen3-vl:4b`
   - PDF → render ảnh PNG (scale 2x) qua `pypdfium2`
   - Ảnh → base64 encode → gửi Ollama `/api/chat` với prompt "transcribe ALL text"
4. **Structuring**: Regex + heuristic nhận diện sections:
   - Header → `full_name`, `contact` (email, phone, LinkedIn)
   - Summary, Experience, Education, Skills, Projects, Certifications, Languages
   - Hỗ trợ cả tiêu đề tiếng Việt và tiếng Anh

**Response model**: `ParsedCV` gồm `full_name`, `contact`, `summary`, `skills[]`, `experience[]`, `education[]`, `projects[]`, `certifications[]`, `languages[]`, `raw_text`.

### 2.5 Luồng `/match-job`

```
┌──────────┐     ┌──────────────────┐     ┌───────────────┐
│ cv_text + │────▶│ Ollama qwen3:4b  │────▶│ Parse JSON    │
│ job_desc   │     │ prompt: đánh giá │     │ {"score": 75} │
└──────────┘     │ phù hợp 0-100    │     └───────┬───────┘
                  └──────────────────┘             │
                                                    ▼
                  ┌──────────────────┐     ┌───────────────┐
                  │ Keyword Gap      │────▶│ Response      │
                  │ Analysis (Python)│     │ • match_%     │
                  │ cv ∩ jd, jd - cv │     │ • missing_kw  │
                  └──────────────────┘     │ • common_kw   │
                                            └───────────────┘
```

1. **Semantic Scoring**: Gửi CV text (1500 ký tự) + JD (1500 ký tự) tới Ollama, yêu cầu trả JSON `{"score": 0-100}`
2. **Score Parsing**: Thử JSON strict → regex patterns (`score: 75`, `75/100`, `75%`) → last number [10-99]
3. **Keyword Analysis**: Tokenize text, loại bỏ stopwords (EN + VI), tính `missing = jd_keywords - cv_keywords` và `common = jd_keywords ∩ cv_keywords`

---

## 3. Luồng gợi ý chỉnh sửa nội dung CV

### 3.1 Tổng quan

Khi user đang chỉnh sửa CV trong CV Builder, hệ thống AI sẽ gợi ý viết lại nội dung chuyên nghiệp hơn cho từng section (Summary, Experience, Projects, Awards...).

### 3.2 Luồng hoạt động

```
┌──────────────────────────────────────────────────────────────────────┐
│                     CV Builder (Frontend)                            │
│                                                                      │
│  1. User chọn nội dung cần tối ưu                                    │
│     ↓                                                                │
│  2. Click "Tối ưu bằng AI"                                           │
│     ↓                                                                │
│  3. Server Action: optimizeCVContent()                                │
│     ┌────────────────────────────────────────────┐                   │
│     │ a. detectLanguage(text) → "vi" | "en"      │                   │
│     │    (kiểm tra dấu tiếng Việt)               │                   │
│     │                                             │                   │
│     │ b. detectFormat(text)                       │                   │
│     │    → "list"  (nhiều bullet -)               │                   │
│     │    → "paragraph" (≥2 câu / dài >80 ký tự)  │                   │
│     │    → "short" (câu ngắn)                     │                   │
│     │                                             │                   │
│     │ c. buildSystemPrompt(lang, format)          │                   │
│     │    → Chèn FORMAT_RULE phù hợp              │                   │
│     │                                             │                   │
│     │ d. buildUserPrompt(section, field, text)    │                   │
│     │    → Thêm hint theo loại section            │                   │
│     │    (summary, experience, project, award)    │                   │
│     │                                             │                   │
│     │ e. callOllama(system, user, prefill, temp)  │                   │
│     │    → Gửi tới Ollama qwen3:4b               │                   │
│     │    → Prefill = "- " nếu list format         │                   │
│     └────────────────────┬───────────────────────┘                   │
│                          ↓                                            │
│     ┌────────────────────────────────────────────┐                   │
│     │ f. extractOutput(raw, lang)                 │                   │
│     │    → Xóa <think>...</think> blocks          │                   │
│     │    → Xóa markdown code fences               │                   │
│     │    → Xóa reasoning lines (English)          │                   │
│     │    → Xóa trailing notes/advice              │                   │
│     │                                             │                   │
│     │ g. isTooSimilar(original, suggestion)       │                   │
│     │    → Sørensen–Dice bigram similarity        │                   │
│     │    → Nếu >80% giống → retry temp=0.9       │                   │
│     └────────────────────┬───────────────────────┘                   │
│                          ↓                                            │
│  4. Hiển thị gợi ý → User chọn Apply hoặc Discard                   │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.3 Chi tiết kỹ thuật

**File chính:**
- `src/app/actions/ai-actions.ts` — Server Action `optimizeCVContent()`
- `src/app/actions/ai-config.ts` — System Prompts (VI + EN)

**Detect Language**:
```
Kiểm tra regex Vietnamese diacritics → "vi" nếu có, "en" nếu không
[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹ...] → "vi"
```

**Detect Format**:
| Điều kiện | Kết quả |
|-----------|---------|
| >50% dòng bắt đầu bằng `- ` / `• ` / `1. ` | `"list"` |
| ≥2 kết thúc câu (`.!?`) hoặc dòng dài >80 ký tự | `"paragraph"` |
| Còn lại | `"short"` |

**System Prompt** (ví dụ tiếng Việt, format list):
```
Bạn là công cụ VIẾT LẠI nội dung CV chuyên sâu.
QUY TẮC:
1. CHỈ TRẢ VỀ TỐI ĐA 5-6 GẠCH ĐẦU DÒNG
2. TUYỆT ĐỐI KHÔNG lặp lại ý tưởng
3. Mỗi dòng PHẢI bắt đầu bằng ĐỘNG TỪ MẠNH
4. THÊM SỐ LIỆU giả định hợp lý
5. KHÔNG giải thích quy trình suy nghĩ
...
ĐỊNH DẠNG: Trả về danh sách bullet points (dùng dấu -)
```

**Section Hints** (gợi ý theo loại section):
| Section | Hint (VI) |
|---------|-----------|
| `summary` | Viết lại giới thiệu bản thân, nêu bật giá trị cốt lõi |
| `experience_list` | Dùng động từ mạnh, thêm số liệu, tập trung thành tựu |
| `project_list` | Làm rõ vai trò cá nhân, nêu kết quả, đề cập tech stack |
| `award_list` | Nêu rõ ý nghĩa và giá trị của giải thưởng |

**Ollama Config**:
- Model: `qwen3:4b`
- Temperature: `0.2` (giảm sáng tạo thừa)
- `num_predict`: `500` (giới hạn độ dài)
- `top_p`: `0.5`
- Stop sequences: `["Okay", "Note:", "Lưu ý:", "Wait", "Hmm", "\n\n\n"]`
- `think: false` (tắt extended-thinking của Qwen3)

**Post-processing `extractOutput()`**:
1. Xóa `<think>...</think>` blocks
2. Xóa markdown code fences
3. Phát hiện và loại bỏ reasoning block tiếng Anh (bắt đầu bằng "Okay", "Let me", "First,", ...)
4. Xóa trailing notes ("Note:", "Lưu ý:", "Tip:", ...)

**Retry Logic**:
- Sau khi nhận output, kiểm tra Sørensen–Dice bigram similarity với input gốc
- Nếu >80% giống → retry với temperature=0.9 (tăng sáng tạo)

---

## 4. Luồng gợi ý công ty phù hợp

### 4.1 Tổng quan

Hệ thống phân tích CV/profile của ứng viên và gợi ý công ty phù hợp thông qua 2 pipeline:
- **Pipeline A**: Gợi ý công ty trực tiếp (Server Action `suggestCompanies()`)
- **Pipeline B**: Gợi ý trong luồng Recommend Jobs (qua `rankJobsWithGemini()`)

### 4.2 Pipeline A — Server Action `suggestCompanies()`

```
┌────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ CV Text     │────▶│ detectLanguage() │────▶│ Build Prompt    │
│ + Location  │     │ → "vi" | "en"   │     │ Career Advisor  │
│ (optional)  │     └──────────────────┘     │ role            │
└────────────┘                                └────────┬────────┘
                                                        │
                    ┌──────────────────┐                │
                    │ Ollama qwen3:4b  │◀───────────────┘
                    │ Analyze CV →     │
                    │ 5 companies JSON │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────────────────┐
                    │ Parse JSON Response           │
                    │ [{ name, reason, website }]   │
                    │ Fallback: raw text as reason   │
                    └──────────────────────────────┘
```

**File**: `src/app/actions/ai-actions.ts` → `suggestCompanies()`

**System Prompt** (tiếng Việt):
```
Bạn là career advisor giàu kinh nghiệm tại Việt Nam.
Phân tích CV và gợi ý 5 công ty phù hợp dựa trên kỹ năng và kinh nghiệm.
Trả về JSON:
[{ "name": "Tên công ty", "reason": "Lý do phù hợp", "website": "url" }]
```

**Response format**:
```json
[
  { "name": "FPT Software", "reason": "Phù hợp kỹ năng React/TypeScript, môi trường outsourcing lớn", "website": "https://fpt-software.com" },
  { "name": "VNG Corporation", "reason": "Công ty công nghệ hàng đầu VN, có nhiều sản phẩm React-based" }
]
```

### 4.3 Pipeline B — Job Recommendation (Hybrid)

```
┌──────────────────────────────────────────────────────────────────────┐
│                    POST /api/recommend-jobs                          │
│                                                                      │
│  ┌─────────────────────┐                                             │
│  │ 1. Resolve Text      │                                             │
│  │ • Request body?      │                                             │
│  │ • Supabase profile?  │                                             │
│  │ • Latest CV content? │                                             │
│  └──────────┬──────────┘                                             │
│             ▼                                                        │
│  ┌─────────────────────┐                                             │
│  │ 2. Load All Jobs     │ ← getAllJobs() từ JSON data                │
│  └──────────┬──────────┘                                             │
│             ▼                                                        │
│  ┌──────────────────────────────────────────────────┐                │
│  │ 3. Pre-Filter (Local Pipeline)                    │                │
│  │                                                    │                │
│  │  extractProfile(text) → CandidateProfile           │                │
│  │  ┌──────────────────────────────────┐              │                │
│  │  │ • desired_roles (regex patterns) │              │                │
│  │  │ • hard_skills (tokenization)     │              │                │
│  │  │ • soft_skills (pattern matching) │              │                │
│  │  │ • locations (city extraction)    │              │                │
│  │  │ • experience_years (regex)       │              │                │
│  │  └──────────────────────────────────┘              │                │
│  │                                                    │                │
│  │  hardFilterJobs() → loại bỏ jobs không liên quan   │                │
│  │  ┌──────────────────────────────────┐              │                │
│  │  │ • IT candidate + Non-IT job → ❌ │              │                │
│  │  │ • Non-IT candidate + IT job → ❌ │              │                │
│  │  │ • Candidate 1yr + Senior job → ❌│              │                │
│  │  │ • Location mismatch → penalty   │              │                │
│  │  └──────────────────────────────────┘              │                │
│  │                                                    │                │
│  │  scoreAndRank() → chấm điểm top 30                │                │
│  │  ┌──────────────────────────────────┐              │                │
│  │  │ WEIGHTS:                         │              │                │
│  │  │  60% Skill Match                 │              │                │
│  │  │  25% Role Similarity             │              │                │
│  │  │  10% Experience Fit              │              │                │
│  │  │   5% Location Fit               │              │                │
│  │  └──────────────────────────────────┘              │                │
│  └──────────────────────────┬───────────────────────┘                │
│                              ▼                                        │
│  ┌──────────────────────────────────────────────────┐                │
│  │ 4. Ollama Re-ranking (rankJobsWithGemini)         │                │
│  │                                                    │                │
│  │  Gửi top 30 jobs (compact) + candidate text       │                │
│  │  tới Ollama qwen3:4b                               │                │
│  │                                                    │                │
│  │  AI phân tích:                                     │                │
│  │  • candidateSummary (tóm tắt ứng viên)            │                │
│  │  • suggestedRoles (5-8 vai trò phù hợp)          │                │
│  │  • suggestedCompanies (5-8 công ty phù hợp)  ◀── │ GỢI Ý CÔNG TY │
│  │  • recommendations (top K jobs + matchScore)       │                │
│  │                                                    │                │
│  │  Fallback: Nếu Ollama lỗi → dùng kết quả local   │                │
│  └──────────────────────────┬───────────────────────┘                │
│                              ▼                                        │
│  ┌──────────────────────────────────────────────────┐                │
│  │ 5. Cache to Supabase                              │                │
│  │  • upsert vào bảng job_recommendations            │                │
│  │  • Lưu: items, candidate_summary,                 │                │
│  │    suggested_roles, suggested_companies            │                │
│  └──────────────────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.4 Chi tiết Scoring

**Skill Match (60%)**:
- Tokenize CV skills + Job requirements
- Kiểm tra exact token match + synonym matching + substring trong full text
- `score = matchedSkills / totalCandidateSkills`

**Role Similarity (25%)**:
- Map ứng viên vào domains: frontend, backend, fullstack, mobile, devops, data, qa, embedded, ba, security, designer
- Kiểm tra domain overlap giữa candidate và job
- Fullstack bonus: match thêm frontend + backend keywords

**Experience Fit (10%)**:
- Parse job requirement: "2 - 3 Năm" → min=2, max=3
- Candidate trong range → 1.0, vượt range → 0.8, dưới min → giảm 0.3/năm

**Location Fit (5%)**:
- Normalize city names (HCM, HN, Đà Nẵng, ...)
- "Toàn quốc" / "Remote" → luôn match
- City aliases: "HCM" = "TPHCM" = "SG" = "Sài Gòn" = "Hồ Chí Minh"

### 4.5 Fit Level

| Score | Fit Level |
|-------|-----------|
| ≥ 70% | Excellent (High) |
| ≥ 50% | Good (High) |
| ≥ 30% | Fair (Medium) |
| < 30% | Poor (Low) |

---

## 5. Luồng PaddleOCR (RapidOCR)

### 5.1 Tổng quan

Hệ thống sử dụng **RapidOCR** (PP-OCRv4 chạy qua ONNX Runtime) thay vì PaddleOCR gốc, do PaddlePaddle không có wheel cho Python ≥3.12. RapidOCR chạy cùng model PP-OCR nhưng qua ONNX — tương thích mọi Python version.

### 5.2 Luồng hoạt động

```
┌──────────────────────────────────────────────────────────────────────┐
│                      Frontend (CV Builder)                            │
│                                                                      │
│  ┌──────────────────┐                                                │
│  │ OCRUploadZone     │  Drag & Drop or Click to upload               │
│  │ • PDF, JPG, PNG   │  Validate: type + size ≤ 10MB                │
│  │ • WebP, DOCX      │                                               │
│  └────────┬─────────┘                                                │
│           │ onFileSelected(file)                                      │
│           ▼                                                          │
│  ┌──────────────────┐                                                │
│  │ POST /ocr/upload  │  FormData with file                           │
│  │ → FastAPI Backend │                                               │
│  └────────┬─────────┘                                                │
└───────────┼──────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (ai-service)                       │
│                                                                      │
│  ┌──────────────────────────────────────────────────┐                │
│  │ STEP 1: File Normalization                        │                │
│  │                                                    │                │
│  │  ┌─────────┐                                      │                │
│  │  │ Image?   │──▶ PIL.Image.open() → RGB           │                │
│  │  │ (JPG/PNG)│                                      │                │
│  │  └─────────┘                                      │                │
│  │  ┌─────────┐                                      │                │
│  │  │ PDF?     │──▶ PyMuPDF (fitz)                   │                │
│  │  │          │   render mỗi trang @ 200 DPI → Image│                │
│  │  └─────────┘                                      │                │
│  │  ┌─────────┐                                      │                │
│  │  │ DOCX?    │──▶ LibreOffice (soffice --headless) │                │
│  │  │          │   DOCX → PDF → PyMuPDF → Images     │                │
│  │  └─────────┘                                      │                │
│  │                                                    │                │
│  │  Output: list[PIL.Image] (1 image per page)       │                │
│  └──────────────────────────┬───────────────────────┘                │
│                              ▼                                        │
│  ┌──────────────────────────────────────────────────┐                │
│  │ STEP 2: RapidOCR Text Detection                   │                │
│  │                                                    │                │
│  │  PIL.Image → numpy array                           │                │
│  │  RapidOCR.predict(np_array)                        │                │
│  │                                                    │                │
│  │  Output per block:                                 │                │
│  │  ┌─────────────────────────────────────────┐      │                │
│  │  │ bbox: [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]│      │                │
│  │  │ text: "Kinh nghiem lam viec"             │      │                │
│  │  │ confidence: 0.9234                       │      │                │
│  │  └─────────────────────────────────────────┘      │                │
│  │                                                    │                │
│  │  Sort: top-to-bottom, left-to-right (reading order)│                │
│  └──────────────────────────┬───────────────────────┘                │
│                              ▼                                        │
│  ┌──────────────────────────────────────────────────┐                │
│  │ STEP 3: Vietnamese Text Normalization              │                │
│  │                                                    │                │
│  │  a. Rule-based corrections (_VI_CORRECTIONS)       │                │
│  │     "Kinh nghiem" → "Kinh nghiệm"                 │                │
│  │     "Ho Chi Minh" → "Hồ Chí Minh"                 │                │
│  │     "ky nang"     → "kỹ năng"                      │                │
│  │     ... (70+ patterns)                             │                │
│  │                                                    │                │
│  │  b. LLM-based correction (Ollama qwen3:4b)        │                │
│  │     Batch all blocks → numbered lines              │                │
│  │     "1. Kinh nghiem\n2. Ky nang\n..."             │                │
│  │     → LLM fixes diacritics                         │                │
│  │     → Parse numbered response back                 │                │
│  │     → Update blocks in-place                       │                │
│  │     (Fail silently nếu Ollama unavailable)         │                │
│  └──────────────────────────┬───────────────────────┘                │
│                              ▼                                        │
│  ┌──────────────────────────────────────────────────┐                │
│  │ STEP 4: Coordinate Normalization                   │                │
│  │                                                    │                │
│  │  bbox (pixels) → rect (0-100%)                     │                │
│  │                                                    │                │
│  │  rect_x = (x_min / img_width) * 100               │                │
│  │  rect_y = (y_min / img_height) * 100               │                │
│  │  rect_w = ((x_max - x_min) / img_width) * 100     │                │
│  │  rect_h = ((y_max - y_min) / img_height) * 100     │                │
│  │                                                    │                │
│  │  → Frontend sử dụng % để overlay lên canvas        │                │
│  └──────────────────────────────────────────────────┘                │
│                                                                      │
│  Response: OCRUploadResponse                                         │
│  {                                                                   │
│    success: true,                                                    │
│    page_count: 2,                                                    │
│    total_blocks: 45,                                                 │
│    pages: [                                                          │
│      {                                                               │
│        page: 1,                                                      │
│        image_width: 1654, image_height: 2339,                        │
│        blocks: [                                                     │
│          {                                                           │
│            text: "Nguyễn Văn A",                                     │
│            bbox: [[100,50],[400,50],[400,90],[100,90]],               │
│            confidence: 0.95,                                         │
│            rect: { x: 6.05, y: 2.14, width: 18.14, height: 1.71 }  │
│          },                                                          │
│          ...                                                         │
│        ]                                                             │
│      }                                                               │
│    ],                                                                │
│    elapsed_seconds: 1.234                                            │
│  }                                                                   │
└──────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Frontend (Render Results)                       │
│                                                                      │
│  ┌──────────────────────────────────────────────────┐                │
│  │ AdvancedOCRWorkspace / OriginalLayoutWorkspace    │                │
│  │                                                    │                │
│  │  • Render ảnh gốc (hoặc PDF page)                 │                │
│  │  • Overlay bounding boxes (dùng rect %)            │                │
│  │  • User click block → chỉnh sửa text              │                │
│  │  • Confidence shown per block                      │                │
│  │  • Export → fill vào CV Builder form                │                │
│  └──────────────────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.3 Vietnamese Correction 2 lớp

**Lớp 1 — Rule-based** (`_VI_CORRECTIONS`):
- 70+ regex patterns cho từ/cụm từ phổ biến trong CV
- Chạy ngay khi OCR xong, không cần network
- Ví dụ: `"Kinh nghiem"` → `"Kinh nghiệm"`, `"cong ty"` → `"công ty"`

**Lớp 2 — LLM-based** (`_correct_vietnamese_with_llm`):
- Gộp tất cả blocks thành danh sách đánh số
- Gửi batch tới Ollama qwen3:4b với prompt chuyên biệt
- LLM sửa dấu, lỗi chính tả, spacing
- Quy tắc: giữ nguyên ý nghĩa, không thêm thông tin mới, giữ số/email/URL
- Timeout: 90s, fail silently nếu Ollama không khả dụng

### 5.4 Frontend OCR Components

| Component | Vai trò |
|-----------|---------|
| `OCRUploadZone` | Drag & drop upload, validate file type/size |
| `ScanningOverlay` | Animation khi đang OCR |
| `AdvancedOCRWorkspace` | Workspace mapping OCR blocks → CV form fields |
| `OriginalLayoutWorkspace` | Hiển thị layout gốc với bounding box overlay |
| `CVDraftPreview` | Preview dữ liệu đã parse trước khi import |
| `OCRPreviewModal` | Modal xem trước kết quả OCR |

---

## 6. Bảng tổng hợp công nghệ

| Thành phần | Công nghệ | Model/Engine | Mục đích |
|------------|-----------|-------------|----------|
| CV Parsing (text) | pdfplumber | — | Trích xuất text từ PDF digital |
| CV Parsing (scan) | Ollama | qwen3-vl:4b | OCR multimodal cho PDF scan/ảnh |
| Text Detection (OCR) | RapidOCR | PP-OCRv4 (ONNX) | Phát hiện vùng text + nhận dạng |
| Vietnamese Correction | Regex + Ollama | qwen3:4b | Sửa dấu tiếng Việt |
| Content Optimization | Ollama | qwen3:4b | Viết lại nội dung CV chuyên nghiệp |
| Job Matching | Ollama | qwen3:4b | Chấm điểm CV ↔ JD (0-100%) |
| Job Ranking (LLM) | Ollama | qwen3:4b | Re-rank top jobs + gợi ý |
| Job Scoring (local) | TypeScript | — | Hard filter + weighted scoring |
| Company Suggestion | Ollama | qwen3:4b | Phân tích CV → gợi ý 5 công ty |
| PDF Rendering | PyMuPDF (fitz) | — | PDF → Images (200 DPI) |
| DOCX Conversion | LibreOffice | soffice --headless | DOCX → PDF |
| Image Processing | Pillow (PIL) | — | Image normalization |
| Database | Supabase | PostgreSQL | Cache recommendations, profiles |

---

> **Ghi chú**: Tất cả LLM calls đều sử dụng Ollama local (không gọi API cloud). Đây là thiết kế có chủ đích để đảm bảo privacy dữ liệu CV và giảm chi phí. Cần chạy `ollama serve` và pull các model trước khi sử dụng:
> ```bash
> ollama pull qwen3:4b
> ollama pull qwen3-vl:4b
> ```
