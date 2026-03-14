# 🚀 TalentFlow: AI-Powered Recruitment Platform

TalentFlow là một nền tảng tuyển dụng thông minh thế hệ mới, tiên phong ứng dụng trí tuệ nhân tạo (AI) và nhận dạng kỹ tự quang học (OCR) để tự động hóa quy trình phân tích hồ sơ, gợi ý việc làm và tương tác với ứng viên.

---

## ✨ Tính năng nổi bật (Core Features)

- **📄 AI-First OCR CV**: Trích xuất dữ liệu từ PDF/Image CV với độ chính xác cao bằng RapidOCR local service.
- **🎯 AI Job Recommendation**: Gợi ý top 6 việc làm phù hợp nhất dựa trên Semantic Matching (Gemini API & Local Fallback).
- **📝 Intelligent CV Builder**: Editor thông minh cho phép chỉnh sửa dữ liệu CV đã trích xuất trực tiếp.
- **🔔 Real-time Notifications**: Thông báo tức thời qua WebSockets khi có cập nhật mới (Supabase Realtime).
- **🏢 Company Aggregator**: Tự động tổng hợp và quản lý danh sách công ty từ dữ liệu tuyển dụng thực tế.

---

## 🏗️ Kiến trúc hệ thống (System Architecture)

Hệ thống được thiết kế theo mô hình **Hybrid AI Cloud**:
- **Frontend/BFF**: Next.js 16 (App Router) - Tốc độ và trải nghiệm người dùng tối ưu.
- **AI Backend**: FastAPI (Python) - Xử lý song song các tác vụ OCR và phân tích nặng.
- **Database**: Supabase (PostgreSQL) + Prisma ORM - Bảo mật và linh hoạt với JSONB.
- **AI Models**: Google Gemini 2.0 (Cloud) & Ollama (Local) để đảm bảo độ tin cậy.

---

## 🛠️ Yêu cầu hệ thống (Prerequisites)

- **Node.js**: v18.0 hoặc mới hơn.
- **Python**: v3.10 hoặc mới hơn.
- **Ollama**: (Tùy chọn) Để chạy AI models cục bộ.

---

## ⚙️ Hướng dẫn cài đặt (Installation Guide)

### 1. Clone Project
```bash
git clone https://github.com/Banhcanhcua1107/recruitment-platform.git
cd recruitment-platform
```

### 2. Thiết lập Frontend
```bash
npm install
npm run dev
```

### 3. Thiết lập AI Local Service (FastAPI)
```bash
cd ai-service
# Tạo môi trường ảo
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
# Cài đặt dependencies
pip install -r requirements.txt
# Khởi chạy server
uvicorn main:app --reload --port 8000
```

---

## 🤖 Thiết lập AI Local với Ollama (Optional)

Hệ thống hỗ trợ chạy AI cục bộ để tiết kiệm chi phí và tăng tính riêng tư:

1.  **Cài đặt Ollama**: Tải về tại [ollama.com](https://ollama.com).
2.  **Pull AI Models**:
    ```bash
    ollama pull llama3
    ollama pull nomic-embed-text
    ```
3.  **Cấu hình**: Đảm bảo Ollama đang chạy tại `http://localhost:11434` trước khi khởi động `ai-service`.

---

## 🔑 Biến môi trường (Environment Variables)

Tạo file `.env.local` tại thư mục gốc và cấu hình các biến sau:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Services
GEMINI_API_KEY=your_google_gemini_api_key
AI_SERVICE_URL=http://localhost:8000

# Email (SMTP)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

---

## 📁 Cấu trúc thư mục (Project Structure)

- `src/`: Mã nguồn chính ứng dụng Next.js.
- `ai-service/`: Dịch vụ AI/OCR (FastAPI).
- `docs/`: Tài liệu kỹ thuật chuyên sâu (Confluence Style).
- `supabase/`: Database schema, migrations và functions.
- `public/`: Tài sản tĩnh (logos, images).

---

## 🤝 Đóng góp (Contribution)

Mọi yêu cầu đóng góp vui lòng mở Issue hoặc tạo Pull Request. Chúng tôi luôn hoan nghênh các cải tiến về AI và UX!

---
*Dự án đạt tiêu chuẩn chất lượng NPC001.*
