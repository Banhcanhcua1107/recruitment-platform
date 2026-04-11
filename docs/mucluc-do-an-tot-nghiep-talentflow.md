# A. Phân tích dự án từ source code

- Tên hệ thống đề xuất: **TalentFlow - Nền tảng tuyển dụng trực tuyến tích hợp quản lý hồ sơ ứng viên, ATS và công cụ CV hỗ trợ AI**
- Bài toán thực tế hệ thống giải quyết:
  - Kết nối ứng viên với việc làm và doanh nghiệp trên cùng một nền tảng web.
  - Hỗ trợ ứng viên tạo CV, nhập CV từ file có sẵn, trích xuất nội dung CV bằng OCR/AI và tái sử dụng CV trong quy trình ứng tuyển.
  - Hỗ trợ nhà tuyển dụng đăng tin, quản lý pipeline ứng tuyển, tìm kiếm ứng viên công khai và liên hệ ứng viên.
- Mục tiêu hệ thống:
  - Số hóa quy trình tuyển dụng từ đăng tin, tìm việc, ứng tuyển đến theo dõi trạng thái hồ sơ.
  - Chuẩn hóa và nâng cao chất lượng hồ sơ/CV của ứng viên.
  - Tăng khả năng ghép nối ứng viên - việc làm thông qua gợi ý và điểm phù hợp.
- Đối tượng sử dụng chính:
  - Ứng viên
  - Nhà tuyển dụng / HR
  - Khách truy cập công khai
- Chức năng chính suy ra từ code:
  - Đăng ký, đăng nhập, đăng nhập Google, xác thực OTP, chọn vai trò `candidate` hoặc `hr`
  - Cổng công khai: trang chủ, danh sách việc làm, chi tiết việc làm, danh mục công ty, trang công ty
  - Ứng viên: dashboard, hồ sơ cá nhân, CV đã lưu, CV builder theo template, đặt CV mặc định, tải CV lên, ứng tuyển, theo dõi đơn ứng tuyển, việc làm gợi ý, việc làm đã lưu
  - Nhà tuyển dụng: HR home tìm ứng viên công khai, dashboard recruiter, quản lý tin tuyển dụng, ATS pipeline, xem hồ sơ ứng viên, cập nhật trạng thái đơn, quản lý hồ sơ công ty
  - Thông báo trong hệ thống và email cho một số luồng tuyển dụng
  - CV import/OCR: upload CV, phân tích bất đồng bộ, review OCR, lưu editable CV, export PDF
  - Source document editor cho PDF/Word/Image với versioning tài liệu
- Cấu trúc module lớn trong repo:
  - `src/app/(public)`: cổng công khai việc làm và công ty
  - `src/app/(auth)`: xác thực và chọn vai trò
  - `src/app/candidate`: workspace ứng viên
  - `src/app/hr`: workspace nhà tuyển dụng
  - `src/features/cv-import`, `src/features/ocr-viewer`: nhập CV, OCR, review
  - `src/lib`: nghiệp vụ jobs, applications, recruitment, candidate profile, notification, recommendation, email
  - `ai-service/`: microservice AI xử lý CV, OCR, parse, matching
  - `supabase/migrations/`: schema dữ liệu và RLS
- Kiến trúc hệ thống:
  - Web app full-stack dùng **Next.js App Router** cho UI, SSR và API routes
  - **Supabase** làm lớp Auth, PostgreSQL, Storage và chính sách RLS
  - **FastAPI** tách riêng cho các tác vụ AI/CV processing
  - **Redis + Celery worker** cho xử lý bất đồng bộ tài liệu CV
  - **Cloudinary** cho upload ảnh
  - **ONLYOFFICE / Apryse** cho chỉnh sửa tài liệu nguồn
- Công nghệ sử dụng có bằng chứng rõ trong code:
  - Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide React
  - Backend web: Next.js Route Handlers, Supabase SSR / Supabase Admin client
  - Dữ liệu: Supabase PostgreSQL, Supabase Storage
  - AI/CV: FastAPI, Celery, Redis, Google Vision OCR, Ollama, Gemini/Groq, PaddleOCR proxy endpoints
  - Tài liệu/PDF: `@react-pdf/renderer`, `react-pdf`, `pdfjs-dist`, ONLYOFFICE callback flow, Apryse WebViewer
  - Hạ tầng dev/test: Docker Compose, Mailpit, MongoDB
- Cơ sở dữ liệu và nhóm bảng chính:
  - Tài khoản và vai trò: `profiles`
  - Tuyển dụng: `jobs`, `applications`, `saved_jobs`, `job_recommendations`, `application_events`
  - Hồ sơ tuyển dụng: `employers`, `candidates`, `activity_logs`, `notifications`
  - Hồ sơ ứng viên: `candidate_profiles`, `candidate_code_sequences`
  - CV builder: `templates`, `resumes`
  - CV import/editable CV: `cv_documents`, `cv_document_artifacts`, `cv_document_stage_runs`, `cv_document_pages`, `cv_ocr_blocks`, `cv_layout_blocks`, `editable_cvs`, `editable_cv_pages`, `editable_cv_blocks`, `editable_cv_versions`, `editable_cv_exports`, `document_file_versions`
- API và luồng xử lý nổi bật:
  - `api/jobs`, `api/applications`, `api/apply-job`
  - `api/candidate/*`, `api/recruiter/*`
  - `api/notifications`, `api/send-email`
  - `api/cv-builder/*`, `api/cv-imports/*`, `api/editable-cvs/*`
  - `api/documents/[documentId]/editor-*`, `api/onlyoffice/callback`
  - `api/ai/optimize-content`, `api/recommend-jobs`, `api/ai/upload-cv`, `api/paddle-ocr/*`
- Phân quyền và người dùng:
  - Có bằng chứng rõ cho hai vai trò chính: `candidate` và `hr`
  - Có khách truy cập công khai cho phần jobs/companies
  - **Không thấy bằng chứng rõ về admin panel tổng quát** trong source hiện tại
- Màn hình và quy trình nghiệp vụ có thể viết thành nội dung đồ án:
  - Trang chủ tuyển dụng, danh sách việc làm, chi tiết việc làm
  - Trang công ty và danh mục công ty
  - Đăng nhập/đăng ký/chọn vai trò
  - Dashboard ứng viên
  - Hồ sơ ứng viên công khai và nội bộ
  - Quản lý CV, tạo CV theo template, import CV, OCR review, editable CV, export PDF
  - Danh sách đơn ứng tuyển, chi tiết đơn ứng tuyển, theo dõi timeline trạng thái
  - HR home tìm ứng viên công khai
  - Dashboard recruiter, quản lý tin tuyển dụng, ATS pipeline, hồ sơ công ty
  - Trung tâm thông báo, email testing, lịch phỏng vấn
- Kiểm thử, kết quả đạt được và hạn chế có thể suy ra:
  - Có nhiều file test TypeScript cho jobs, candidate/hr workspace model, CV builder, OCR viewer, cv-import, versioning, editor, employer branding
  - Có test Python cho `ai-service` ở khối làm sạch nội dung CV và mapped sections
  - Có script hỗ trợ performance/UI verification như `autocannon`, `lighthouse`, `verify_ui_flows`
  - Chưa thấy một test runner tổng hợp hoặc bộ E2E hoàn chỉnh được cấu hình rõ như phần cốt lõi của dự án
  - Một số màn hình tồn tại nhưng còn mang tính scaffold/placeholder, ví dụ trung tâm thông báo HR, lịch phỏng vấn, một phần settings của candidate

# B. Mục lục đồ án tốt nghiệp đề xuất

LỜI CẢM ƠN  
LỜI CAM ĐOAN  
MỤC LỤC  
DANH MỤC BẢNG  
DANH MỤC HÌNH ẢNH  
DANH MỤC VIẾT TẮT  
LỜI MỞ ĐẦU  

## CHƯƠNG 1. TỔNG QUAN ĐỀ TÀI

### 1.1. Bối cảnh và tính cấp thiết của đề tài
#### 1.1.1. Xu hướng số hóa hoạt động tuyển dụng và tìm việc trên nền tảng web
#### 1.1.2. Nhu cầu chuẩn hóa hồ sơ ứng viên và tối ưu trải nghiệm ứng tuyển
#### 1.1.3. Nhu cầu hỗ trợ nhà tuyển dụng trong quản lý pipeline tuyển dụng
#### 1.1.4. Nhu cầu ứng dụng AI trong xử lý và tái sử dụng dữ liệu CV

### 1.2. Phát biểu bài toán
#### 1.2.1. Bài toán kết nối ứng viên với việc làm và doanh nghiệp
#### 1.2.2. Bài toán quản lý hồ sơ ứng viên và CV trên cùng một hệ thống
#### 1.2.3. Bài toán theo dõi vòng đời đơn ứng tuyển theo mô hình ATS
#### 1.2.4. Bài toán nhập CV từ tài liệu gốc và chuyển đổi sang dữ liệu có thể chỉnh sửa

### 1.3. Giới thiệu đề tài và định hướng xây dựng hệ thống
#### 1.3.1. Giới thiệu hệ thống TalentFlow
#### 1.3.2. Phạm vi bài toán mà hệ thống tập trung giải quyết
#### 1.3.3. Giá trị thực tiễn đối với ứng viên và nhà tuyển dụng

### 1.4. Mục tiêu nghiên cứu
#### 1.4.1. Mục tiêu tổng quát
#### 1.4.2. Mục tiêu cụ thể
##### 1.4.2.1. Xây dựng cổng tuyển dụng công khai
##### 1.4.2.2. Xây dựng workspace dành cho ứng viên
##### 1.4.2.3. Xây dựng workspace dành cho nhà tuyển dụng
##### 1.4.2.4. Tích hợp công cụ CV Builder và CV Import hỗ trợ AI
##### 1.4.2.5. Xây dựng cơ chế gợi ý việc làm và ghép nối hồ sơ

### 1.5. Đối tượng và phạm vi nghiên cứu
#### 1.5.1. Đối tượng sử dụng hệ thống
##### 1.5.1.1. Khách truy cập công khai
##### 1.5.1.2. Ứng viên
##### 1.5.1.3. Nhà tuyển dụng / HR
#### 1.5.2. Phạm vi chức năng
##### 1.5.2.1. Đăng ký, đăng nhập và phân vai trò
##### 1.5.2.2. Quản lý việc làm, công ty và đơn ứng tuyển
##### 1.5.2.3. Quản lý hồ sơ ứng viên và CV
##### 1.5.2.4. Xử lý import CV, OCR, editable CV và export
##### 1.5.2.5. Dashboard, thông báo và email hỗ trợ quy trình tuyển dụng
#### 1.5.3. Phạm vi công nghệ
##### 1.5.3.1. Ứng dụng web full-stack
##### 1.5.3.2. Cơ sở dữ liệu đám mây và lưu trữ tệp
##### 1.5.3.3. Microservice AI cho xử lý CV

### 1.6. Phương pháp nghiên cứu và hướng tiếp cận
#### 1.6.1. Phân tích yêu cầu từ nghiệp vụ tuyển dụng và dữ liệu hồ sơ
#### 1.6.2. Thiết kế hệ thống theo hướng web full-stack kết hợp microservice AI
#### 1.6.3. Xây dựng kiến trúc phân vai candidate - recruiter
#### 1.6.4. Kiểm thử theo luồng nghiệp vụ và module chức năng

### 1.7. Đóng góp chính của đề tài
#### 1.7.1. Tích hợp quy trình tuyển dụng và quản lý CV trên cùng một nền tảng
#### 1.7.2. Bổ sung khối chuẩn hóa CV từ tài liệu nguồn bằng OCR/AI
#### 1.7.3. Bổ sung ATS pipeline cho phía nhà tuyển dụng
#### 1.7.4. Đề xuất hướng ghép nối việc làm và ứng viên dựa trên hồ sơ thực tế

### 1.8. Cấu trúc của đồ án
#### 1.8.1. Mô tả ngắn gọn nội dung từng chương

## CHƯƠNG 2. CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ SỬ DỤNG

### 2.1. Cơ sở lý thuyết về hệ thống tuyển dụng trực tuyến
#### 2.1.1. Khái niệm nền tảng tuyển dụng trực tuyến
#### 2.1.2. Khái niệm tin tuyển dụng, hồ sơ ứng viên và đơn ứng tuyển
#### 2.1.3. Mô hình ATS trong quản lý tiến trình tuyển dụng
#### 2.1.4. Vai trò của hồ sơ công khai trong tìm kiếm ứng viên chủ động

### 2.2. Cơ sở lý thuyết về quản lý và chuẩn hóa CV
#### 2.2.1. Khái niệm CV Builder và các block thông tin CV
#### 2.2.2. Chuyển đổi CV từ tài liệu gốc sang dữ liệu có cấu trúc
#### 2.2.3. OCR và trích xuất nội dung từ PDF / ảnh / DOCX
#### 2.2.4. Biên tập tài liệu nguồn và versioning tài liệu

### 2.3. Cơ sở lý thuyết về ghép nối ứng viên - việc làm
#### 2.3.1. Gợi ý việc làm dựa trên hồ sơ ứng viên
#### 2.3.2. Tìm kiếm ứng viên theo kỹ năng, kinh nghiệm và mức độ phù hợp
#### 2.3.3. Kết hợp luật nghiệp vụ và mô hình AI trong recommendation

### 2.4. Cơ sở lý thuyết về kiến trúc hệ thống web hiện đại
#### 2.4.1. Kiến trúc client - server trong ứng dụng web full-stack
#### 2.4.2. App Router và Route Handler trong Next.js
#### 2.4.3. Kiến trúc microservice cho xử lý AI và tài liệu
#### 2.4.4. Xử lý bất đồng bộ bằng hàng đợi tác vụ

### 2.5. Cơ sở lý thuyết về dữ liệu, xác thực và phân quyền
#### 2.5.1. PostgreSQL và mô hình dữ liệu quan hệ
#### 2.5.2. Supabase Auth và quản lý phiên
#### 2.5.3. Row Level Security trong kiểm soát truy cập dữ liệu
#### 2.5.4. Signed URL và lưu trữ tệp trên cloud storage
#### 2.5.5. Phân quyền theo vai trò ứng viên và nhà tuyển dụng

### 2.6. Công nghệ sử dụng trong hệ thống
#### 2.6.1. Nhóm công nghệ frontend
##### 2.6.1.1. Next.js 16, React 19, TypeScript
##### 2.6.1.2. Tailwind CSS, Framer Motion, Lucide React
#### 2.6.2. Nhóm công nghệ backend web
##### 2.6.2.1. Next.js Route Handlers
##### 2.6.2.2. Supabase SSR Client và Supabase Admin Client
#### 2.6.3. Nhóm công nghệ dữ liệu và lưu trữ
##### 2.6.3.1. Supabase PostgreSQL
##### 2.6.3.2. Supabase Storage
##### 2.6.3.3. Cloudinary
#### 2.6.4. Nhóm công nghệ AI và xử lý tài liệu
##### 2.6.4.1. FastAPI
##### 2.6.4.2. Redis và Celery worker
##### 2.6.4.3. Google Vision OCR
##### 2.6.4.4. Ollama
##### 2.6.4.5. Gemini / Groq
##### 2.6.4.6. PaddleOCR proxy endpoint
#### 2.6.5. Nhóm công nghệ tài liệu và xuất bản CV
##### 2.6.5.1. ONLYOFFICE
##### 2.6.5.2. Apryse WebViewer
##### 2.6.5.3. React PDF
#### 2.6.6. Nhóm công nghệ triển khai và kiểm thử
##### 2.6.6.1. Docker Compose
##### 2.6.6.2. Mailpit
##### 2.6.6.3. MongoDB trong module email testing

### 2.7. Lý do lựa chọn công nghệ
#### 2.7.1. Lý do chọn Next.js cho hệ thống web full-stack
#### 2.7.2. Lý do chọn Supabase cho Auth, Database và Storage
#### 2.7.3. Lý do tách AI service khỏi web app
#### 2.7.4. Lý do dùng Redis/Celery cho import CV bất đồng bộ
#### 2.7.5. Lý do dùng ONLYOFFICE / Apryse cho chỉnh sửa tài liệu nguồn

### 2.8. Kết luận chương

## CHƯƠNG 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

### 3.1. Phân tích tác nhân và phạm vi nghiệp vụ
#### 3.1.1. Tác nhân khách truy cập công khai
#### 3.1.2. Tác nhân ứng viên
#### 3.1.3. Tác nhân nhà tuyển dụng / HR

### 3.2. Phân tích nghiệp vụ tổng thể của hệ thống
#### 3.2.1. Nghiệp vụ xác thực và khởi tạo vai trò người dùng
#### 3.2.2. Nghiệp vụ công khai việc làm và công ty
#### 3.2.3. Nghiệp vụ quản lý hồ sơ ứng viên
#### 3.2.4. Nghiệp vụ tạo CV và quản lý CV
#### 3.2.5. Nghiệp vụ ứng tuyển và theo dõi trạng thái
#### 3.2.6. Nghiệp vụ quản lý tin tuyển dụng phía HR
#### 3.2.7. Nghiệp vụ tìm kiếm ứng viên công khai và liên hệ ứng viên
#### 3.2.8. Nghiệp vụ import CV, OCR và chỉnh sửa CV sau khi trích xuất
#### 3.2.9. Nghiệp vụ thông báo và email hỗ trợ quy trình tuyển dụng

### 3.3. Đặc tả yêu cầu chức năng
#### 3.3.1. Nhóm chức năng công khai
##### 3.3.1.1. Xem danh sách việc làm
##### 3.3.1.2. Lọc và tìm kiếm việc làm
##### 3.3.1.3. Xem chi tiết việc làm
##### 3.3.1.4. Xem danh mục công ty và hồ sơ công ty
#### 3.3.2. Nhóm chức năng ứng viên
##### 3.3.2.1. Đăng ký, đăng nhập, chọn vai trò
##### 3.3.2.2. Quản lý hồ sơ ứng viên và CV profile
##### 3.3.2.3. Tạo CV theo template và quản lý kho CV
##### 3.3.2.4. Import CV từ tài liệu và review OCR
##### 3.3.2.5. Ứng tuyển, lưu việc làm, theo dõi trạng thái đơn
##### 3.3.2.6. Nhận gợi ý việc làm và thông báo
#### 3.3.3. Nhóm chức năng nhà tuyển dụng
##### 3.3.3.1. Quản lý hồ sơ công ty
##### 3.3.3.2. Tạo, sửa, đóng và công khai tin tuyển dụng
##### 3.3.3.3. Theo dõi dashboard và pipeline ATS
##### 3.3.3.4. Tìm kiếm ứng viên công khai
##### 3.3.3.5. Liên hệ ứng viên và cập nhật trạng thái hồ sơ

### 3.4. Đặc tả yêu cầu phi chức năng
#### 3.4.1. Hiệu năng và khả năng phản hồi
#### 3.4.2. Bảo mật và kiểm soát truy cập
#### 3.4.3. Khả năng mở rộng chức năng
#### 3.4.4. Tính dễ sử dụng của giao diện
#### 3.4.5. Tính bảo trì và phát triển tiếp

### 3.5. Thiết kế kiến trúc tổng thể hệ thống
#### 3.5.1. Kiến trúc tổng thể web app - database - storage - AI service
#### 3.5.2. Kiến trúc request/response trong Next.js
#### 3.5.3. Kiến trúc xử lý bất đồng bộ cho import CV
#### 3.5.4. Kiến trúc lưu trữ tệp và signed URL
#### 3.5.5. Kiến trúc phân vai candidate - hr

### 3.6. Thiết kế cơ sở dữ liệu
#### 3.6.1. Nhóm bảng tài khoản và vai trò
##### 3.6.1.1. `profiles`
#### 3.6.2. Nhóm bảng tuyển dụng
##### 3.6.2.1. `jobs`
##### 3.6.2.2. `applications`
##### 3.6.2.3. `saved_jobs`
##### 3.6.2.4. `job_recommendations`
##### 3.6.2.5. `application_events`
#### 3.6.3. Nhóm bảng hồ sơ tuyển dụng
##### 3.6.3.1. `employers`
##### 3.6.3.2. `candidates`
##### 3.6.3.3. `candidate_profiles`
##### 3.6.3.4. `candidate_code_sequences`
##### 3.6.3.5. `notifications`
##### 3.6.3.6. `activity_logs`
#### 3.6.4. Nhóm bảng CV builder
##### 3.6.4.1. `templates`
##### 3.6.4.2. `resumes`
#### 3.6.5. Nhóm bảng CV import và editable CV
##### 3.6.5.1. `cv_documents`
##### 3.6.5.2. `cv_document_artifacts`
##### 3.6.5.3. `cv_document_pages`
##### 3.6.5.4. `cv_ocr_blocks`
##### 3.6.5.5. `cv_layout_blocks`
##### 3.6.5.6. `editable_cvs`
##### 3.6.5.7. `editable_cv_blocks`
##### 3.6.5.8. `editable_cv_versions`
##### 3.6.5.9. `editable_cv_exports`
##### 3.6.5.10. `document_file_versions`
#### 3.6.6. Quan hệ dữ liệu và các bucket lưu trữ

### 3.7. Thiết kế API và luồng xử lý nghiệp vụ
#### 3.7.1. Nhóm API công khai jobs và companies
#### 3.7.2. Nhóm API candidate dashboard, profile, applications, CV
#### 3.7.3. Nhóm API recruiter jobs, candidates, ATS
#### 3.7.4. Nhóm API CV builder, CV import, editable CV, export
#### 3.7.5. Nhóm API AI tối ưu nội dung, recommendation và OCR
#### 3.7.6. Nhóm API notifications, email testing và health check

### 3.8. Thiết kế các luồng nghiệp vụ trọng tâm
#### 3.8.1. Luồng đăng ký - đăng nhập - chọn vai trò
#### 3.8.2. Luồng đăng tin tuyển dụng và hiển thị công khai
#### 3.8.3. Luồng ứng viên ứng tuyển và theo dõi trạng thái hồ sơ
#### 3.8.4. Luồng HR tìm kiếm ứng viên công khai và liên hệ ứng viên
#### 3.8.5. Luồng tạo CV từ template
#### 3.8.6. Luồng import CV - OCR - parsed JSON - editable CV - export PDF
#### 3.8.7. Luồng chỉnh sửa tài liệu nguồn và quản lý version
#### 3.8.8. Luồng gợi ý việc làm cho ứng viên

### 3.9. Thiết kế giao diện và điều hướng hệ thống
#### 3.9.1. Điều hướng khối công khai
#### 3.9.2. Điều hướng workspace ứng viên
#### 3.9.3. Điều hướng workspace nhà tuyển dụng
#### 3.9.4. Điều hướng khối CV import và source editor

### 3.10. Kết luận chương

## CHƯƠNG 4. XÂY DỰNG, CÀI ĐẶT VÀ KẾT QUẢ ĐẠT ĐƯỢC

### 4.1. Môi trường phát triển và cấu trúc source code
#### 4.1.1. Cấu hình môi trường frontend
#### 4.1.2. Cấu hình môi trường AI service
#### 4.1.3. Cấu hình Docker Compose cho toàn hệ thống
#### 4.1.4. Tổ chức thư mục `src/`, `ai-service/`, `supabase/`, `scripts/`

### 4.2. Xây dựng cổng công khai của hệ thống
#### 4.2.1. Trang chủ TalentFlow
#### 4.2.2. Trang danh sách việc làm và bộ lọc tìm kiếm
#### 4.2.3. Trang chi tiết việc làm và form ứng tuyển
#### 4.2.4. Danh mục công ty và trang hồ sơ công ty

### 4.3. Xây dựng phân hệ ứng viên
#### 4.3.1. Giao diện đăng ký, đăng nhập và chọn vai trò
#### 4.3.2. Dashboard ứng viên
#### 4.3.3. Hồ sơ ứng viên và cơ chế public profile
#### 4.3.4. Quản lý việc làm đã lưu, việc làm gợi ý và đơn đã ứng tuyển
#### 4.3.5. Màn hình chi tiết đơn ứng tuyển và timeline xử lý
#### 4.3.6. Màn hình cài đặt thông báo và bảo mật

### 4.4. Xây dựng phân hệ CV
#### 4.4.1. Thư viện template và tạo CV mới
#### 4.4.2. CV Builder theo cấu trúc block dữ liệu
#### 4.4.3. Quản lý kho CV và thiết lập CV mặc định
#### 4.4.4. Upload CV có sẵn từ file ngoài
#### 4.4.5. Import CV, OCR review và lưu editable CV
#### 4.4.6. Export editable CV sang PDF

### 4.5. Xây dựng phân hệ nhà tuyển dụng
#### 4.5.1. HR Home tìm kiếm ứng viên công khai
#### 4.5.2. Dashboard recruiter và các chỉ số vận hành
#### 4.5.3. Quản lý tin tuyển dụng
#### 4.5.4. ATS pipeline và danh sách ứng viên theo trạng thái
#### 4.5.5. Xem hồ sơ ứng viên công khai và liên hệ ứng viên
#### 4.5.6. Quản lý hồ sơ công ty và employer branding
#### 4.5.7. Màn hình thông báo và lịch phỏng vấn

### 4.6. Xây dựng khối AI và xử lý tài liệu
#### 4.6.1. API tối ưu nội dung CV bằng Gemini/Groq
#### 4.6.2. Gợi ý việc làm bằng luật nghiệp vụ kết hợp Ollama
#### 4.6.3. AI service phân tích CV bằng FastAPI
#### 4.6.4. Hàng đợi xử lý CV với Redis và Celery
#### 4.6.5. OCR, layout parsing, structured parsing và làm sạch dữ liệu CV
#### 4.6.6. Proxy PaddleOCR sync/async cho luồng OCR mở rộng

### 4.7. Xây dựng khối source document editor
#### 4.7.1. Metadata editor theo loại file PDF / Word / Image
#### 4.7.2. Tích hợp ONLYOFFICE cho tài liệu Word
#### 4.7.3. Tích hợp Apryse cho tài liệu PDF
#### 4.7.4. Lưu phiên bản chỉnh sửa và gợi ý reparse tài liệu

### 4.8. Kết quả đạt được
#### 4.8.1. Kết quả về mặt chức năng
#### 4.8.2. Kết quả về mặt tích hợp công nghệ
#### 4.8.3. Kết quả về mặt trải nghiệm người dùng
#### 4.8.4. Kết quả về khả năng triển khai và mở rộng

### 4.9. Kết luận chương

## CHƯƠNG 5. KIỂM THỬ VÀ ĐÁNH GIÁ HỆ THỐNG

### 5.1. Mục tiêu và phạm vi kiểm thử
#### 5.1.1. Kiểm thử các luồng nghiệp vụ chính
#### 5.1.2. Kiểm thử các module xử lý CV và AI
#### 5.1.3. Kiểm thử phân quyền và bảo vệ dữ liệu

### 5.2. Môi trường và phương pháp kiểm thử
#### 5.2.1. Môi trường chạy web app, AI service và database
#### 5.2.2. Kiểm thử đơn vị với TypeScript test files
#### 5.2.3. Kiểm thử Python cho AI service
#### 5.2.4. Script hỗ trợ kiểm thử UI, performance và seed dữ liệu

### 5.3. Thiết kế bộ ca kiểm thử theo nhóm chức năng
#### 5.3.1. Nhóm ca kiểm thử xác thực và phân vai
#### 5.3.2. Nhóm ca kiểm thử việc làm công khai và ứng tuyển
#### 5.3.3. Nhóm ca kiểm thử hồ sơ ứng viên và public profile
#### 5.3.4. Nhóm ca kiểm thử CV builder, import CV, OCR review và export
#### 5.3.5. Nhóm ca kiểm thử recruiter dashboard, ATS và candidate marketplace
#### 5.3.6. Nhóm ca kiểm thử thông báo, email và tài liệu nguồn

### 5.4. Đánh giá kết quả kiểm thử
#### 5.4.1. Mức độ đáp ứng yêu cầu chức năng
#### 5.4.2. Đánh giá độ ổn định của luồng dữ liệu và phân quyền
#### 5.4.3. Đánh giá khối AI/CV import ở mức chức năng
#### 5.4.4. Đánh giá khả năng triển khai và mở rộng hệ thống

### 5.5. Hạn chế quan sát được từ source code
#### 5.5.1. Một số màn hình vẫn ở mức scaffold hoặc chuẩn bị cho phase sau
#### 5.5.2. Kiểm thử tự động chưa được gom thành pipeline thực thi thống nhất
#### 5.5.3. Một số luồng phụ thuộc dịch vụ ngoài và cấu hình môi trường
#### 5.5.4. Module email testing mang tính hỗ trợ kiểm thử hơn là lõi nghiệp vụ

### 5.6. Kết luận chương

## CHƯƠNG 6. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

### 6.1. Kết luận chung
#### 6.1.1. Tóm tắt bài toán đã giải quyết
#### 6.1.2. Tóm tắt giải pháp kỹ thuật đã xây dựng
#### 6.1.3. Ý nghĩa thực tiễn của hệ thống

### 6.2. Các kết quả nổi bật của đề tài
#### 6.2.1. Tích hợp cổng việc làm, candidate workspace và recruiter workspace
#### 6.2.2. Chuẩn hóa dữ liệu hồ sơ ứng viên và CV
#### 6.2.3. Ứng dụng AI vào recommendation và xử lý CV
#### 6.2.4. Tách kiến trúc AI service và xử lý bất đồng bộ

### 6.3. Hướng phát triển
#### 6.3.1. Hoàn thiện trung tâm thông báo và lịch phỏng vấn
#### 6.3.2. Hoàn thiện sâu hơn source document editor và workflow reparse
#### 6.3.3. Bổ sung bộ kiểm thử E2E và CI/CD rõ ràng
#### 6.3.4. Nâng cao thuật toán matching ứng viên - việc làm
#### 6.3.5. Mở rộng dashboard phân tích tuyển dụng và quản trị vận hành

### 6.4. Kết luận chương

TÀI LIỆU THAM KHẢO  
PHỤ LỤC  
PHỤ LỤC A. DANH MỤC API CHÍNH  
PHỤ LỤC B. DANH MỤC BẢNG DỮ LIỆU  
PHỤ LỤC C. HÌNH ẢNH MÀN HÌNH HỆ THỐNG  

# C. Ghi chú điều chỉnh so với mục lục chuyên ngành

- Giữ lại tinh thần trình bày học thuật nhiều cấp mục và khung chương tổng quan - công nghệ - phân tích thiết kế - xây dựng - kiểm thử - kết luận.
- Không giữ nguyên nội dung của file chuyên ngành cũ vì file đó mô tả **nền tảng học lập trình / e-learning**, không khớp với source code hiện tại của repo.
- Loại bỏ các phần không có bằng chứng trong code như: course/chapter/lesson, instructor, partner, gamification học tập, AI tutor cho học lập trình, blog/forum kiểu e-learning, admin panel tổng quát.
- Bổ sung các phần phản ánh đúng hệ thống hiện tại: jobs, companies, candidate profile, recruiter workspace, ATS pipeline, CV builder, CV import/OCR, editable CV, source editor, employer branding, job recommendation, notifications, email testing.
- So với mục lục mẫu đồ án tốt nghiệp, tôi giữ **khung 6 chương** và phần đầu báo cáo, nhưng thay toàn bộ ngữ cảnh F&B/mobility bằng ngữ cảnh tuyển dụng và quản lý CV.
- Chương 4 được điều chỉnh theo hướng vừa mô tả xây dựng/cài đặt, vừa đủ chỗ để trình bày các màn hình thực tế của hệ thống.
- Chương 5 nhấn vào phần kiểm thử và đánh giá đúng với những gì có thể suy ra từ test files, scripts và cấu trúc dự án hiện có.

# D. Những mục cần xác nhận thêm từ người dùng

- Tên đề tài chính thức theo biểu mẫu khoa/trường:
  - Tôi đang đề xuất theo hướng: **Xây dựng nền tảng tuyển dụng trực tuyến tích hợp quản lý hồ sơ ứng viên, ATS và công cụ CV hỗ trợ AI**.
- Cách đặt trọng số cho các màn hình đang ở mức chưa hoàn thiện hoàn toàn:
  - `Lịch phỏng vấn`, `Trung tâm thông báo HR`, `Cài đặt thông báo/bảo mật` có route và giao diện, nhưng một phần nội dung cho thấy vẫn đang chờ hoàn thiện backend hoặc phase sau.
- Có muốn đưa module `Email testing` vào nội dung chính hay chỉ để ở phụ lục / phần kiểm thử:
  - Vì module này có code và API riêng, nhưng thiên về hỗ trợ kiểm thử hơn là chức năng nghiệp vụ cốt lõi.
