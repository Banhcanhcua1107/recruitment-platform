# 📄 Tài Liệu Thiết Kế: Tính Năng Nâng Cao cho Smart CV Builder

> **Dự án**: Nền tảng Tuyển dụng Thông minh (Smart Recruitment Platform)  
> **Phiên bản**: 1.0  
> **Ngày cập nhật**: 04/02/2026

---

## 📑 Mục Lục

1. [Giới thiệu tổng quan](#1-giới-thiệu-tổng-quan)
2. [Tính năng 1: Phân tích CV từ PDF](#2-tính-năng-1-phân-tích-cv-từ-pdf)
3. [Tính năng 2: Gợi ý việc làm theo Semantic Search](#3-tính-năng-2-gợi-ý-việc-làm-theo-semantic-search)
4. [Tích hợp vào hệ thống](#4-tích-hợp-vào-hệ-thống)
5. [Giá trị dự án & Đánh giá học thuật](#5-giá-trị-dự-án--đánh-giá-học-thuật)

---

## 1. Giới Thiệu Tổng Quan

### 1.1 Bối Cảnh

Trong thị trường tuyển dụng hiện đại, ứng viên phải tạo nhiều phiên bản CV khác nhau cho từng vị trí. Nhà tuyển dụng phải xem xét hàng trăm hồ sơ để tìm ứng viên phù hợp. Cả hai bên đều tốn nhiều thời gian và công sức.

### 1.2 Giải Pháp Đề Xuất

Dự án này xây dựng hai tính năng quan trọng:

| Tính năng                            | Mô tả                                          | Người hưởng lợi           |
| ------------------------------------ | ---------------------------------------------- | ------------------------- |
| **Phân tích CV từ PDF**              | Tự động trích xuất thông tin từ CV có sẵn      | Ứng viên                  |
| **Gợi ý việc làm (Semantic Search)** | Đề xuất công việc phù hợp dựa trên nội dung CV | Ứng viên & Nhà tuyển dụng |

---

## 2. Tính Năng 1: Phân Tích CV từ PDF

### 2.1 Mục Đích

Cho phép ứng viên **upload CV đã có sẵn** (định dạng PDF), hệ thống sẽ **tự động trích xuất thông tin** và điền vào các trường trong CV Builder.

> **Lợi ích**: Giảm thời gian tạo CV từ 30+ phút xuống còn dưới 5 phút.

### 2.2 Yêu Cầu Chức Năng

#### Đầu vào (Input)

- File PDF (tối đa 10MB)
- Hỗ trợ 2 loại:
  - **PDF text-based**: PDF có thể copy text (machine-readable)
  - **PDF image-based**: PDF scan hoặc ảnh chụp

#### Thông tin cần trích xuất

- Thông tin cá nhân (họ tên, email, số điện thoại)
- Tóm tắt bản thân (Summary / Profile)
- Kinh nghiệm làm việc (Experience)
- Học vấn (Education)
- Kỹ năng (Skills)

#### Đầu ra (Output)

- Dữ liệu JSON chuẩn hóa theo schema của CV Builder
- Điền sẵn vào form chỉnh sửa

### 2.3 Kiến Trúc Kỹ Thuật

```
┌─────────────────────────────────────────────────────────────┐
│                  PIPELINE XỬ LÝ PDF                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [Upload PDF]                                              │
│        │                                                    │
│        ▼                                                    │
│   ┌───────────────────┐                                     │
│   │ Phát hiện loại PDF │                                    │
│   └─────────┬─────────┘                                     │
│             │                                               │
│     ┌───────┴───────┐                                       │
│     │               │                                       │
│     ▼               ▼                                       │
│ [Text-based]    [Image-based]                               │
│     │               │                                       │
│     ▼               ▼                                       │
│ pdfplumber     DeepSeek-OCR v3                              │
│     │               │                                       │
│     └───────┬───────┘                                       │
│             ▼                                               │
│   ┌───────────────────┐                                     │
│   │ Chuẩn hóa văn bản │                                     │
│   │ • Loại bỏ nhiễu   │                                     │
│   │ • Sửa lỗi format  │                                     │
│   └─────────┬─────────┘                                     │
│             ▼                                               │
│   ┌───────────────────┐                                     │
│   │ Nhận diện section │                                     │
│   │ • Tên, email, SĐT │                                     │
│   │ • Tiêu đề section │                                     │
│   │ • Bullet points   │                                     │
│   └─────────┬─────────┘                                     │
│             ▼                                               │
│   ┌───────────────────┐                                     │
│   │ Chuyển đổi JSON   │                                     │
│   │ → CVContent schema│                                     │
│   └─────────┬─────────┘                                     │
│             ▼                                               │
│   [CV Builder điền sẵn]                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 Công Nghệ Sử Dụng

| Thành phần      | Công nghệ             | Mục đích                         |
| --------------- | --------------------- | -------------------------------- |
| Trích xuất text | `pdfplumber` (Python) | Đọc text từ PDF machine-readable |
| OCR             | DeepSeek-OCR v3       | Xử lý PDF scan/ảnh               |
| API Layer       | FastAPI               | Cung cấp endpoint cho frontend   |
| Lưu trữ tạm     | Supabase Storage      | Lưu file PDF upload              |

### 2.5 Luồng Trải Nghiệm Người Dùng (UX Flow)

```
┌──────────────────────────────────────────────────────────────┐
│                    LUỒNG NGƯỜI DÙNG                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   [1] Bấm "Import từ PDF"                                    │
│         │                                                    │
│         ▼                                                    │
│   [2] Kéo thả hoặc chọn file PDF                             │
│         │                                                    │
│         ▼                                                    │
│   [3] Hiển thị "Đang phân tích..." (loading)                 │
│         │                                                    │
│         ▼                                                    │
│   [4] Preview: So sánh PDF gốc ↔ Dữ liệu trích xuất          │
│         │                                                    │
│         ▼                                                    │
│   [5] Xác nhận hoặc chỉnh sửa                                │
│         │                                                    │
│         ▼                                                    │
│   [6] Mở CV Builder với tất cả trường đã điền sẵn            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2.6 Ví Dụ Output JSON

```json
{
  "sections": [
    {
      "id": "sec-001",
      "type": "personal_info",
      "containerId": "main-column",
      "data": {
        "fullName": "Nguyễn Văn A",
        "email": "nguyenvana@email.com",
        "phone": "0912345678",
        "title": "Kỹ sư phần mềm"
      }
    },
    {
      "id": "sec-002",
      "type": "experience_list",
      "containerId": "main-column",
      "data": {
        "items": [
          {
            "company": "Công ty ABC",
            "position": "Senior Developer",
            "startDate": "2020-01",
            "endDate": "Hiện tại",
            "description": "• Phát triển hệ thống backend\n• Quản lý team 5 người"
          }
        ]
      }
    }
  ]
}
```

---

## 3. Tính Năng 2: Gợi Ý Việc Làm theo Semantic Search

### 3.1 Mục Đích

Sử dụng **AI Semantic Search** để so khớp nội dung CV với mô tả công việc (Job Description), từ đó:

- Gợi ý việc làm phù hợp cho ứng viên
- Gợi ý ứng viên phù hợp cho nhà tuyển dụng

> **Khác biệt so với tìm kiếm keyword**: Semantic Search hiểu **ý nghĩa** của văn bản, không chỉ so khớp từ khóa.

### 3.2 Nguyên Lý Hoạt Động

#### Semantic Search là gì?

Thay vì so khớp từ khóa (keyword matching), Semantic Search chuyển đổi văn bản thành **vector số** (embedding) đại diện cho ý nghĩa. Hai văn bản có ý nghĩa gần nhau sẽ có vector gần nhau trong không gian đa chiều.

```
Ví dụ:
"Lập trình viên Java"     → Vector A: [0.2, 0.8, 0.1, ...]
"Java Developer"          → Vector B: [0.2, 0.79, 0.11, ...]
"Nhân viên kế toán"       → Vector C: [0.9, 0.1, 0.3, ...]

→ Vector A và B gần nhau (cùng ý nghĩa)
→ Vector C xa hơn (khác lĩnh vực)
```

### 3.3 Kiến Trúc Kỹ Thuật

```
┌─────────────────────────────────────────────────────────────┐
│               PIPELINE SEMANTIC MATCHING                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [Nội dung CV]              [Mô tả công việc]              │
│        │                           │                        │
│        ▼                           ▼                        │
│   ┌─────────────────────────────────────────┐               │
│   │        Tiền xử lý văn bản               │               │
│   │  • Gộp các trường thành 1 đoạn text     │               │
│   │  • Chuẩn hóa thuật ngữ                  │               │
│   └─────────────────────────────────────────┘               │
│        │                           │                        │
│        ▼                           ▼                        │
│   ┌─────────────────────────────────────────┐               │
│   │      Mô hình Embedding                  │               │
│   │      (all-MiniLM-L6-v2)                 │               │
│   │  • Chuyển text → vector 384 chiều       │               │
│   └─────────────────────────────────────────┘               │
│        │                           │                        │
│        ▼                           ▼                        │
│   [Vector CV]              [Vector Job]                     │
│        │                           │                        │
│        └───────────┬───────────────┘                        │
│                    ▼                                        │
│   ┌─────────────────────────────────────────┐               │
│   │        Tính Cosine Similarity           │               │
│   │  Score = cos(CV_vector, Job_vector)     │               │
│   │  Kết quả: 0.0 → 1.0 (0% → 100%)         │               │
│   └─────────────────────────────────────────┘               │
│                    │                                        │
│                    ▼                                        │
│   ┌─────────────────────────────────────────┐               │
│   │        Xếp hạng & Hiển thị              │               │
│   │  • Top 10 kết quả phù hợp nhất          │               │
│   │  • Điểm match (%)                       │               │
│   └─────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Công Nghệ Sử Dụng

| Thành phần        | Công nghệ                 | Mô tả                                       |
| ----------------- | ------------------------- | ------------------------------------------- |
| Mô hình Embedding | `all-MiniLM-L6-v2`        | Mô hình nhẹ (~80MB), chạy được trên CPU     |
| Lưu trữ vector    | Supabase `pgvector`       | Extension PostgreSQL hỗ trợ vector          |
| Tìm kiếm vector   | PostgreSQL `<=>` operator | Toán tử cosine distance                     |
| API               | FastAPI                   | Endpoint `/match-jobs`, `/match-candidates` |

### 3.5 Cấu Trúc Database (Vector)

```sql
-- Bật extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Bảng lưu embedding của CV
CREATE TABLE cv_embeddings (
  id UUID PRIMARY KEY REFERENCES cv_profiles(id),
  embedding vector(384),  -- Vector 384 chiều
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bảng lưu embedding của Job
CREATE TABLE job_embeddings (
  id UUID PRIMARY KEY REFERENCES jobs(id),
  embedding vector(384),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Truy vấn tìm việc phù hợp nhất với CV
SELECT
  j.id,
  j.title,
  j.company,
  ROUND((1 - (cv.embedding <=> j.embedding)) * 100, 1) AS match_score
FROM cv_embeddings cv
CROSS JOIN job_embeddings j
WHERE cv.id = :candidate_id
ORDER BY cv.embedding <=> j.embedding  -- Sắp xếp theo khoảng cách
LIMIT 10;
```

### 3.6 Giao Diện Người Dùng

#### Cho Ứng Viên

```
┌──────────────────────────────────────────────────────┐
│            🎯 VIỆC LÀM PHÙ HỢP VỚI BẠN               │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  🏢 Senior React Developer - Công ty XYZ       │  │
│  │  📍 Hồ Chí Minh | 💰 $2000-3000                │  │
│  │  ██████████████░░░░ 87% phù hợp               │  │
│  │  [Xem chi tiết] [Ứng tuyển ngay]              │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  🏢 Full-stack Developer - Startup ABC         │  │
│  │  📍 Remote | 💰 $1500-2500                     │  │
│  │  ████████████░░░░░░ 72% phù hợp               │  │
│  │  [Xem chi tiết] [Ứng tuyển ngay]              │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### Cho Nhà Tuyển Dụng

```
┌──────────────────────────────────────────────────────┐
│     👥 ỨNG VIÊN PHÙ HỢP CHO: Senior Developer        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  #1  Nguyễn Văn A                                    │
│      5 năm kinh nghiệm | React, Node.js              │
│      ████████████████░░ 92% phù hợp                 │
│      [Xem CV] [Liên hệ]                              │
│  ──────────────────────────────────────────────────  │
│  #2  Trần Thị B                                      │
│      3 năm kinh nghiệm | Vue.js, Python              │
│      ██████████████░░░░ 85% phù hợp                 │
│      [Xem CV] [Liên hệ]                              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 3.7 Chi Tiết Điểm Phù Hợp (Tính Năng Nâng Cao)

```
┌──────────────────────────────────────────────────────┐
│           📊 PHÂN TÍCH ĐỘ PHÙ HỢP                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Điểm tổng thể: 78%                                  │
│                                                      │
│  ✅ Kỹ năng kỹ thuật:     85%  ████████░░           │
│  ✅ Kinh nghiệm:          90%  █████████░           │
│  ⚠️ Học vấn:              60%  ██████░░░░           │
│  ❌ Địa điểm:             50%  █████░░░░░           │
│                                                      │
│  💡 Gợi ý cải thiện:                                 │
│  • Thêm kỹ năng "Docker" vào CV                      │
│  • Bổ sung kinh nghiệm làm việc nhóm                 │
│  • Cân nhắc vị trí remote nếu có thể                 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 4. Tích Hợp Vào Hệ Thống

### 4.1 Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────────┐
│                    KIẾN TRÚC HỆ THỐNG                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────┐         ┌─────────────────┐           │
│   │   Next.js App   │◄───────►│  FastAPI Backend│           │
│   │   (Frontend)    │  REST   │  (AI Services)  │           │
│   └────────┬────────┘         └────────┬────────┘           │
│            │                           │                    │
│            │    ┌──────────────────────┤                    │
│            │    │                      │                    │
│            ▼    ▼                      ▼                    │
│   ┌─────────────────────────────────────────────┐           │
│   │               SUPABASE                      │           │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │           │
│   │  │   Auth   │  │ Database │  │ Storage  │   │           │
│   │  │          │  │+ pgvector│  │  (PDFs)  │   │           │
│   │  └──────────┘  └──────────┘  └──────────┘   │           │
│   └─────────────────────────────────────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Luồng Dữ Liệu: PDF → CV Builder

1. User upload PDF → Lưu vào **Supabase Storage**
2. Frontend gọi FastAPI `/parse-pdf` với URL file
3. FastAPI trích xuất text, trả về JSON
4. Frontend điền dữ liệu vào **Zustand store**
5. CV Builder render các section có sẵn
6. User lưu → Dữ liệu được ghi vào **Supabase Database**

### 4.3 Luồng Dữ Liệu: CV → Gợi Ý Việc Làm

1. User tạo/lưu CV → Trigger tạo embedding
2. FastAPI `/embed-cv` sinh vector bằng MiniLM
3. Vector lưu vào bảng **cv_embeddings**
4. Khi user mở "Việc làm gợi ý":
   - Query: Tìm jobs có cosine similarity cao nhất
   - Trả về top 10 kết quả kèm điểm
5. Logic tương tự cho nhà tuyển dụng (job → candidates)

---

## 5. Giá Trị Dự Án & Đánh Giá Học Thuật

### 5.1 Tính Thực Tiễn

| Tính năng         | Ứng dụng thực tế      | Ví dụ                      |
| ----------------- | --------------------- | -------------------------- |
| PDF Parsing       | LinkedIn "Easy Apply" | Giảm rào cản onboarding    |
| Semantic Matching | Indeed, ZipRecruiter  | Cải thiện chất lượng gợi ý |
| Match Scoring     | HireVue, Greenhouse   | Minh bạch hóa quy trình    |

### 5.2 Khác Biệt So Với CV Builder Cơ Bản

| CV Builder Thông Thường | Nền Tảng Này                   |
| ----------------------- | ------------------------------ |
| Nhập liệu thủ công      | Tự động parse từ CV có sẵn     |
| Không tích hợp việc làm | Tích hợp gợi ý việc làm        |
| Xuất file tĩnh          | AI hỗ trợ viết lại nội dung    |
| Không có phản hồi       | Điểm phù hợp giúp cải thiện CV |

### 5.3 Phân Chia MVP & Tính Năng Nâng Cao

| Giai đoạn     | Tính năng                                            | Độ phức tạp | Thời gian |
| ------------- | ---------------------------------------------------- | ----------- | --------- |
| **MVP**       | Parse PDF text-based, Semantic search cơ bản, Điểm % | Trung bình  | 4-6 tuần  |
| **Phase 2**   | OCR cho PDF scan, Phân tích chi tiết điểm            | Cao         | +2-3 tuần |
| **Tương lai** | Phân tích skill gap, AI gợi ý cải thiện              | Nâng cao    | Tùy chọn  |

### 5.4 Đánh Giá Tính Khả Thi

- **PDF Parsing**: `pdfplumber` ổn định, OCR là tùy chọn cho MVP
- **Semantic Search**: Model `all-MiniLM-L6-v2` nhẹ (~80MB), chạy được trên CPU
- **pgvector**: Supabase hỗ trợ native, không cần hạ tầng riêng
- **Hiệu năng**: Embedding ~100ms, vector search ~50ms cho 10k records

---

## 6. Kết Luận

Hai tính năng này biến CV Builder cơ bản thành **Nền tảng Tuyển dụng Thông minh**:

1. **PDF Parsing** - Loại bỏ rào cản lớn nhất (nhập liệu thủ công)
2. **Semantic Matching** - Mang lại giá trị đo lường được cho cả ứng viên và nhà tuyển dụng

Cả hai tính năng đều:

- ✅ **Khả thi về kỹ thuật** với các công cụ hiện đại
- ✅ **Có giá trị học thuật** là ứng dụng AI/NLP thực tế
- ✅ **Có giá trị thực tiễn** trong ngành tuyển dụng

---

> **Tài liệu này là một phần của đồ án Smart CV Builder & Recruitment Platform**
