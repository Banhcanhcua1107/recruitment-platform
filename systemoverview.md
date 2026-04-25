# CHƯƠNG: TỔNG QUAN HỆ THỐNG

## 1. Giới thiệu chương

Chương "Tổng quan hệ thống" đóng vai trò nền tảng quan trọng trong toàn bộ tài liệu báo cáo, nhằm cung cấp bức tranh toàn cảnh và cái nhìn bao quát nhất về hệ thống Nền tảng Tuyển dụng (Recruitment Platform). Mục đích của chương này là mô tả rõ bối cảnh hình thành, mục tiêu thiết kế, phạm vi áp dụng, đối tượng sử dụng, cũng như phác thảo sơ bộ về kiến trúc kỹ thuật và mô hình dữ liệu. 

Việc khảo sát tổng quan hệ thống trước khi đi sâu vào phân tích thiết kế chi tiết (như vẽ biểu đồ Use Case, Activity Diagram hay thiết kế cơ sở dữ liệu) là bước không thể thiếu. Nó giúp xác định rõ ranh giới bài toán, định hướng lựa chọn công nghệ và đảm bảo mọi thành phần kỹ thuật được phát triển đều phục vụ đúng nhu cầu nghiệp vụ thực tiễn đã đặt ra. Từ những nền tảng được định hình trong chương này, các chương tiếp theo về phân tích và thiết kế hệ thống sẽ được triển khai một cách logic, mạch lạc và có cơ sở khoa học vững chắc.

## 2. Bối cảnh đề tài và lý do chọn đề tài

### Bối cảnh thực tế
Trong kỷ nguyên chuyển đổi số, quy trình tuyển dụng nhân sự tại các doanh nghiệp đang chứng kiến sự dịch chuyển mạnh mẽ từ các phương pháp thủ công sang ứng dụng công nghệ. Hàng ngày, một nhà tuyển dụng (HR) phải tiếp nhận và xử lý hàng chục đến hàng trăm hồ sơ ứng viên (CV/Resume). Tuy nhiên, các hồ sơ này thường được gửi dưới nhiều định dạng khác nhau (PDF, Word, File ảnh), đi kèm với các bố cục thiết kế đa dạng và thiếu tính chuẩn hóa.

### Khó khăn của quy trình truyền thống
Quy trình tuyển dụng truyền thống tồn tại nhiều hạn chế đáng kể:
* **Mất thời gian trích xuất dữ liệu:** Chuyên viên nhân sự phải đọc thủ công từng CV, tìm kiếm các trường thông tin quan trọng (kinh nghiệm, kỹ năng, học vấn) và nhập rải rác vào hệ thống quản trị nội bộ hoặc Excel.
* **Sai sót thông tin:** Việc đánh giá và nhập liệu bằng tay dễ dẫn đến sai sót, bỏ lọt ứng viên tiềm năng do mệt mỏi hoặc do thiết kế CV quá rườm rà che khuất thông tin chính.
* **Trải nghiệm ứng viên kém:** Về phía ứng viên, việc tạo ra một CV chuẩn chỉnh, đẹp mắt thường đòi hỏi kỹ năng thiết kế hoặc sử dụng các công cụ phức tạp. Khi muốn chỉnh sửa lại thông tin từ một CV định dạng tĩnh (PDF/Image) cũ, họ gần như phải làm lại từ đầu.
* **Hệ thống rời rạc:** Các doanh nghiệp thường phải dùng song song nhiều hệ thống: một nền tảng để đăng tin nhận hồ sơ, một công cụ khác để đọc PDF, và một phần mềm riêng (ATS) để theo dõi trạng thái phỏng vấn của ứng viên.

### Nhu cầu ứng dụng công nghệ
Để giải quyết những "điểm nghẽn" này, cần có một giải pháp tích hợp tự động hóa quy trình bóc tách thông tin từ văn bản không cấu trúc (sử dụng AI/Machine Learning) kết hợp với hệ thống Quản lý quá trình tuyển dụng (ATS - Applicant Tracking System) trực quan, tập trung hiệu suất vào một nền tảng duy nhất.

### Lý do chọn đề tài & Ý nghĩa
Việc lựa chọn đề tài **"Xây dựng nền tảng tuyển dụng tích hợp AI trích xuất và chuẩn hóa hồ sơ ứng viên"** xuất phát từ chính nhu cầu cấp thiết trên. 
* **Ý nghĩa thực tiễn:** Hệ thống giúp doanh nghiệp tiết kiệm đến 80% thời gian sàng lọc hồ sơ ban đầu. Về phía ứng viên, nền tảng cung cấp bộ công cụ kéo thả trực quan giúp tái tạo CV nhanh chóng từ các văn bản PDF cũ, mang lại trải nghiệm tìm việc liền mạch.
* **Ý nghĩa học thuật:** Đề tài là cơ hội để nghiên cứu và ứng dụng thực tiễn các công nghệ tiên tiến như Xử lý ngôn ngữ tự nhiên (Large Language Models - LLMs), Nhận dạng ký tự quang học (OCR - PaddleOCR), và kiến trúc vi dịch vụ (tách biệt nền tảng Frontend xử lý giao diện và Backend xử lý tính toán AI nặng).

## 3. Mô tả tổng quan hệ thống

* **Tên hệ thống:** Hệ thống nền tảng Tuyển dụng thông minh kết hợp Xây dựng CV (Smart Recruitment & CV Builder Platform).
* **Mục đích của hệ thống:** Hệ thống được thiết kế dưới dạng một nền tảng web (Web-based application) One-Stop (Một điểm đến) quy tụ hai luồng nghiệp vụ chính: (1) Cung cấp công cụ Workspace thông minh cho ứng viên tạo lập, chỉnh sửa, trích xuất dữ liệu từ CV cũ đễ tạo thành CV mới chuẩn định dạng; (2) Cung cấp cổng thông tin Quản lý tuyển dụng Kanban ATS cho phép doanh nghiệp đăng tin, nhận và điều phối luồng quy trình ứng viên.
* **Bài toán cốt lõi hệ thống giải quyết:** Giải quyết bài toán phi cấu trúc dữ liệu của CV tiếng Việt/Anh bằng cách sử dụng AI Pipeline tự động bóc tách (Extract) từ file ảnh/PDF thành cấu trúc JSON chuẩn. Giúp số hóa hoàn toàn vòng đời của một hồ sơ từ lúc sinh ra đến lúc kết thúc tuyển dụng.
* **Giá trị tổng quát:** Rút bớt thời gian chờ đợi, loại bỏ thao tác nhập liệu thủ công, kết nối cung - cầu lao động một cách khoa học thông qua dữ liệu đã được làm sạch và chuẩn hóa.
* **Phạm vi ứng dụng:** Nền tảng có thể được áp dụng dưới mô hình public SaaS (cổng thông tin việc làm chung) hoặc Private Portal nội bộ cho một công ty/tập đoàn cụ thể dùng để tuyển dụng nhân tài.

## 4. Mục tiêu xây dựng hệ thống

### 4.1. Mục tiêu nghiệp vụ
* **Đối với Ứng viên (Candidate):**
  * Hỗ trợ tạo hồ sơ chuyên nghiệp nhanh chóng thông qua quy trình: Tải CV cũ (PDF/Hình ảnh) -> Trí tuệ nhân tạo (AI) tự động đọc, điền lại thông tin vào hệ thống (Parse) -> Ứng viên sử dụng trình soạn thảo Editor để kiểm tra, làm đẹp theo Template và xuất ra bản PDF hoàn chỉnh mới.
  * Tìm kiếm, xem chi tiết và ứng tuyển (Apply) vào các vị trí công việc (Jobs) phù hợp. Quản lý trạng thái hồ sơ của mình hiện đang ở vòng nào của nhà tuyển dụng.
* **Đối với Nhà tuyển dụng (HR/Employer):**
  * Cung cấp không gian làm việc số hóa (Workspace) để khởi tạo các tin đăng tuyển và theo dõi số lượng hồ sơ nộp vào.
  * Trang bị giao diện ATS chuẩn mực: Thay vì tải từng file PDF rời rạc để đọc, HR có thể xem CV ứng viên trực tiếp trên nền tảng với màn hình chia đôi (Split-screen), một bên là PDF tĩnh, một bên là dữ liệu JSON đã được AI trích lọc rành mạch (điểm nổi bật, ngôn ngữ, kỹ năng).
  * Điều phối ứng viên lướt qua các vòng phỏng vấn (Reviewing, Interview, Offer, Hired, Rejected) qua thao tác kéo thả, hệ thống tự động lưu lịch sử.

### 4.2. Mục tiêu kỹ thuật
* **Tự động hóa toàn diện:** Tự động hóa quá trình nhận diện chữ (OCR) và xử lý ngôn ngữ tự nhiên thông qua AI Workspace Backend không cần sự can thiệp của con người.
* **Hiệu năng & Trải nghiệm (UX/UI):** Trình editor CV phải xử lý thao tác kéo thả (Drag and Drop) phức tạp, preview nội dung realtime mượt mà mà không giật lag.
* **Kiến trúc bền vững & Mở rộng (Scalability):** Hệ thống có kiến trúc phân tầng rõ ràng. Tách riêng khối Web Service (phục vụ giao diện, tương tác HTTP thông thường) với khối Background Queue Worker (phục vụ việc chạy mô hình học máy nặng). Giúp hệ thống không bị "cứng đơ" khi có hàng nghìn CV được tải lên cùng lúc.
* **Bảo mật và an toàn dữ liệu:** Áp dụng hệ thống Row-Level Security (RLS) để cô lập dữ liệu. Ứng viên nào chỉ thao tác và được cấp quyền trên CV của người đó, tránh rò rỉ dữ liệu thông tin cá nhân.
* **Mô phỏng và Testing:** Có khả năng cung cấp một môi trường cục bộ để tạo ra dữ liệu giả, gửi email giả (Mailpit sandbox) để các kỹ sư phát triển kiểm thử tính năng thông báo mà không bị hệ thống chống Spam của Gmail chặn.

### 4.3. Kết quả mong đợi
* Một ứng dụng Web ổn định, hoàn thiện luồng người dùng E2E (End-to-End). 
* Hệ thống OCR và Parser AI hoạt động ổn định trên các định dạng CV khó.
* Trở thành nền móng vững chắc không chỉ phục vụ bảo vệ đồ án tốt nghiệp mà có thể sẵn sàng nâng cấp thương mại hóa.

## 5. Phạm vi hệ thống

### 5.1. Phạm vi chức năng hiện tại (In-Scope)
Dựa theo cấu trúc mã nguồn đã định hình, hệ thống đang phục vụ các tính năng trọng điểm sau:
* Xác thực người dùng và phân quyền (Người tìm việc vs Nhà tuyển dụng).
* Unified Editor (Trình soạn thảo CV) cho phép thêm/sửa/xóa các khối văn bản, tự động lưu phiên bản (autosave versioning) sử dụng công nghệ tiptap và dnd-kit.
* Trí tuệ nhân tạo nhận diện khung văn bản trên file upload và trích xuất dữ liệu, định cấu trúc thành JSON. 
* Hồ sơ năng lực cộng đồng (Public Candidate Profiles).
* Chức năng quản lý chuỗi tuyển dụng ATS Kanban (Applicant Tracking System board).
* Cơ chế Thông báo và Gửi Mail xác nhận đến ứng viên.

### 5.2. Phạm vi không xử lý (Out-of-Scope)
Nhằm tập trung nguồn lực giải quyết triệt để tính năng nhận diện CV, các tính năng sau không nằm trong phạm vi hiện tại:
* Hệ thống đánh giá năng lực qua video trực tuyến (Live Interview/Video call) nội bộ.
* Chức năng ký hợp đồng lao động điện tử (E-Signature) ngay trên nền tảng.
* Quản lý thông tin theo dõi lương thưởng (Payroll), chấm công (Timesheet), và các Module bảo hiểm sau khi nhân sự đã được chuyển sang trạng thái "Hired". Phần này thuộc chuyên môn của hệ thống Quản trị nguồn nhân lực (HRIS) chuyên sâu.
* Cổng thanh toán (Payment Gateway) tích hợp dịch vụ tính phí mua CV mẫu (nền tảng hiện tại giả định hỗ trợ miễn phí).

## 6. Đối tượng sử dụng hệ thống

Trong hệ thống, mã nguồn chia đối tượng tương tác thành 2 luồng Entity (Actor) chính quản lý bởi thư viện JWT Auth:

### 6.1. Ứng viên (Candidate)
* **Mô tả vai trò:** Cá nhân có nhu cầu tạo hồ sơ năng lực số, tìm kiếm cơ hội việc làm chuyên nghiệp.
* **Mục tiêu sử dụng:** Số hóa CV nhanh, tìm việc thuận lợi và quản trị tập trung thư mục CV của bản thân thay vì phân mảnh lộn xộn trong máy tính cá nhân.
* **Quyền hạn cơ bản & Chức năng thao tác:**
  * Toàn quyền truy cập phân hệ CV Builder.
  * Tải lên (Upload) tài liệu cá nhân. Quản lý, chỉnh sửa và xóa `cv_documents` cũng như `editable_cv_versions` của họ (được PostgreSQL RLS bảo vệ chặt chẽ với logic `auth.uid() = user_id`).
  * Duyệt danh sách các `Jobs` và ấn ứng tuyển (`Application`) với hệ thống.
  * Quyết định chia sẻ Public Profile hay chuyển sang chế độ Private.

### 6.2. Nhà tuyển dụng (HR / Recruiter)
* **Mô tả vai trò:** Đại diện cho doanh nghiệp (Company) có nhu cầu tìm kiếm lao động.
* **Mục tiêu sử dụng:** Hợp lý hóa quá trình tuyển chọn nhân tài, đánh giá nhanh CV và quản lý vòng đời ứng viên không bị sót lọt.
* **Quyền hạn cơ bản & Chức năng thao tác:**
  * Quản lý công tin đăng tải tuyển dụng thuộc tổ chức của họ (tạo mới, đóng, sửa Job).
  * Xem sơ yếu lý lịch (Preview), xem dữ liệu đã được bóc tách từ ứng viên đẩy vào. Quyền hạn của nhà tuyển dụng tại các Document này chỉ là Read-Only (Chỉ đọc), họ **không có quyền chỉnh sửa** sửa đổi nội dung CV của ứng viên.
  * Được phép di chuyển (Drag) trạng thái thực thể Application giữa các Pipeline (Applied -> Interview, etc). Gửi email liên hệ tới ứng viên.

## 7. Yêu cầu hệ thống

Dựa vào việc đối chiếu các thư mục `src/app`, `src/features`, `src/types` kết hợp với hệ thống bảng mô hình dữ liệu. Hệ thống đáp ứng các yêu cầu sau:

### 7.1. Yêu cầu chức năng

| Nhóm nghiệp vụ | Tên chức năng | Mô tả ngắn & Vai trò | Actor liên quan |
|---|---|---|---|
| **Xác thực** | Đăng nhập/Đăng ký | Hệ thống quản lý phiên đăng nhập và định kiểu hồ sơ User. Dữ liệu lưu thông qua Supabase Auth. | Tất cả |
| **Quản lý Import** | Upload & Normalization | Cho phép nạp file CV ngoại tuyến (ảnh, PDF). Gọi AI Pipeline dịch và làm sạch text OCR thành JSON có tính phân lớp. | Candidate |
| **Quản lý CV (Builder)** | Unified CV Editor | Hệ thống Editor hỗ trợ kéo thả Blocks dữ liệu, edit Rich text, tự động Mapping các box vùng chọn AI vào Field chuẩn. Hỗ trợ Autosave để khôi phục (Restore cv versions). | Candidate |
| **Quản lý Dữ liệu in ấn** | Render & Preview | Từ dữ liệu khối Editor, render CV format PDF chuẩn thông qua `@react-pdf/renderer` hoặc preview HTML Document trên màn hình. Cho phép xuất file (Export PDF). | Candidate |
| **Quản lý Hồ sơ năng lực**| Candidate Profile | Giao diện công khai bao quát toàn bộ Experience, Education, Skills của một tài khoản ứng viên. | Candidate |
| **Tuyển dụng Tuyển sinh** | Quản lý Jobs (Đăng tải) | Chức năng thêm, hiệu chỉnh Job Post, thay đổi trạng thái đóng/mở công việc. Cấu hình vị trí, lương, mô tả. | Recruiter |
| **Theo dõi Ứng viên** | ATS Kanban Pipeline | Giao diện quản lý Applications. Xem nhanh Ứng viên dạng bảng kéo thả trực quan. Xem Split-Screen (nửa màn hình là PDF nhúng, nửa màn hình là JSON kỹ năng cốt lõi). | Recruiter |

### 7.2. Yêu cầu phi chức năng
* **Khả năng mở rộng & Hiệu suất truy xuất (Scalability / Performance):** Việc Render và Update trạng thái của Unified Editor khi người dùng nhập liệu phải tức thì (< 100ms lag), sử dụng kiến trúc Zustand để State management hiệu quả ở Local mà không cần render lại toàn DOM tree. Tiến trình OCR chậm được xử lý ở queue ngầm không làm tắc nghẹn Web chính.
* **Tính bảo mật và phân quyền:** Sử dụng Row-Level Security (RLS) của PostgresQL để cô lập tài nguyên. Không có bất kỳ truy vấn API độc hại nào có thể xem được CV của người khác dù biết được Document ID, bởi vì Data Engine gốc từ chối Query không có `user_id` trùng khớp phiên đăng nhập.
* **Tính nguyên vẹn của luồng ứng dụng (Integrity):** Quá trình OCR và chạy Background jobs được quản lý qua bảng theo dõi `cv_document_stage_runs`. Nếu hệ thống sập khi đang xử lý, Cellery có cơ chế tái thử (retry) chống mất tín hiệu giữa chừng.
* **Responsive UI:** Hệ thống yêu cầu giao diện thao tác tốt không chỉ trên Desktop mà được tổ chức bằng TailwindCSS framework linh hoạt, cho phép collapse cửa sổ tương thích mọi màn hình.

## 8. Kiến trúc tổng thể của hệ thống

Hệ thống được kiến trúc theo mô hình **Distributed Client-Server với Heavy-computing Backend** (Tách nền tảng điện toán và web), tạo sự bền vững. Luồng kiến trúc đặc trưng bao gồm các thành tố giao tiếp và liên kết qua Web Protocol (REST/GraphQL).

### 8.1. Kiến trúc phân tầng
Dự án được phân làm 4 cụm xử lý rõ rệt:
1. **Tầng ứng dụng giao diện (Presentation/Client Layer - Next.js):** 
   - Đảm đương việc load giao diện SPA (Single Page Application) phối hợp Web SSR. Nó phản ứng ngay lập tức với thao tác click người dùng, lưu state trong RAM, định tuyến Layout bằng App Router.
2. **Tầng xử lý Backend & nghiệp vụ chính (Business Logic Layer - Next.js API & Supabase RPC):**
   - Đưa ra logic kiểm soát session, xác minh bảo mật, lấy dữ liệu bảng, định tuyến Job Pipeline.
3. **Tầng xử lý dữ liệu Học máy/AI phi đồng bộ (Background AI Layer - Python/FastAPI + Celery Worker):**
   - Các Job tốn tài nguyên nhất (chạy mô hình PaddleOCR đọc ảnh, gọi API tới Gemini, hay normalize chuỗi văn bản phức tạp) được tách khỏi môi trường Next.js (Node.js/JavaScript), đưa hoàn toàn về môi trường Python Backend Server. Tầng này kết nối với Database để tự cập nhật trạng thái sau khi xong. 
4. **Tầng lưu trữ dữ liệu tập trung (Data/Storage Layer - Supabase PostgreSQL + Buckets):**
   - Quản trị toàn bộ CSDL và Storage nhị phân của các Media Upload. Hỗ trợ trực tiếp caching.

### 8.2. Luồng dữ liệu tổng quát (Data Flow)
Ví dụ đặc tả sự di chuyển của Dữ liệu với luồng "Tải & Phân tích CV bằng AI":
* Ứng viên click nút `Upload`, Frontend Next.js tạo metadata file `cv_documents`, tiến hành ghi file blob lên `Supabase Storage (cv-originals bucket)`.
* Sau khi quá trình ghi file hoàn tất, Backend (Node) đưa một lệnh thông báo vào Message Queue gửi thông điệp yêu cầu xử lý OCR.
* Worker System (Celery bằng Python) chớp sự kiện tại Redis Broker, tải file tử Supabase bucket về vùng nhớ tạm, thực hiện Model Inference.
* Worker chạy xong bước 1, xuất ra `ocr_blocks`, lưu bảng Postgres tương ứng. Tiếp tục gọi mô hình LLM gom thông tin, cho ra Master Data là cục `parsed_json` để cập nhật vào `cv_documents`.
* Trong toàn bộ diễn trình đó, Frontend thiết lập Web-polling hoặc Realtime Subscription để nghe cập nhật từ DB, báo cho Ứng viên tiến trình "Đang đọc hình..." -> "Đang trích xuất AI..." -> "Hoàn tất".

### 8.3. Vai trò của từng thành phần trong nền tảng
* **API Service / Next:** Làm Web server phục vụ tài nguyên Front-end, chịu trách nhiệm CRUD dữ liệu với Database.
* **Celery & Redis:** Redis đóng vai trò là kho điều phối tin nhắn (Message Broker), Celery là công nhân (Worker) lấy task ra chạy. Đảm bảo xử lý bất đồng bộ.
* **Mailpit:** Đảm nhận vai trò của một máy chủ SMTP nội bộ thay thế cụm dịch vụ như Sendgrid khi Dev chạy ở local. Nó giúp bắt và kiểm thử toàn bộ Email thông báo, mã OTP, không để thông báo lọt ra thực tế sai quy định.

## 9. Công nghệ sử dụng

Cơ sở lựa chọn công nghệ cho hệ thống không mang tính dư thừa mà nhằm tương thích tối đa với trải nghiệm thời gian thực ứng dụng trong code thật (`package.json`, `docker-compose`):

* **Mảng Giao diện (Frontend):**
  * **Next.js 15 (React 19) + Typescript:** Framework cốt lõi mang tới sức mạnh React mới nhất. Code hỗ trợ TypeScript định kiểu rõ ràng, giảm bug Runtime. Đóng gói mã siêu tốc với engine Turbopack.
  * **Tailwind CSS v4:** Viết CSS dạng utility-first, rút ngắn thời gian tùy biến Component, giữ file style cực gọn.
  * **Zustand:** Quản lý state gọn nhẹ (thay vì Redux cồng kềnh) để xử lý logic lưu trữ Block tạm thời của Editor khi đang edit CV mà chưa muốn gọi API save ngay.
  * **tiptap / dnd-kit:** Gói framework chuyên rành cho ứng dụng Kéo thả (Drag and Drop) và vùng Text editor Rich-Text cho phép xử lý văn bản CV như Word chuyên nghiệp.
  * **react-pdf / react-to-print:** Render DOM thành blob PDF phục vụ xuất xưởng.

* **Mảng Trí tuệ AI (Backend OCR):**
  * **Python & FastAPI / Uvicorn:** Cung cấp Backend tốc độ cao, hỗ trợ đa luồng xử lý Data chuyên cho Machine Learning. 
  * **Celery:** Trình quản lý Task phân tán, dùng để giới hạn số lượng xử lý đồng thời, chống quá tải khi server nhồi nhét xử lý hàng ngàn CV.
  * **Ollama / Huggingface inference (LLM):** Xử lý văn bản tự nhiên, "Nắn chỉnh" ngôn từ trích được từ OCR (bị nhiễu, dính chữ) thành dạng list/json hoàn hảo.

* **Mảng Cơ sở dữ liệu và Hạ tầng (Infra & DB):**
  * **Supabase / PostgreSQL:** Làm CSDL quan hệ chính. Sử dụng năng lực lưu trữ `JSONB` native của Postgres để giữ các cây thông tin linh hoạt (Sở thích, chứng chỉ đa dạng của mỗi ứng viên khác nhau) thay vì lập hàng chục Row/Column cổ điển.
  * **Redis / MongoDB:** Redis làm cache message, MongoDB được dùng như Database thay thế và mock cho các tính năng tạo hàng nghìn `fake-accounts` để load test.
  * **Docker / Docker Compose:** Đóng gói nguyên vẹn cụm hạ tầng bao gồm App, API, Redis, DB thành file cấu hình `docker-compose.yml`, giúp việc triển khai sang Host mượt mà 1-click.

## 10. Các phân hệ chính của hệ thống

Hệ thống được rã cấu trúc thành những phân hệ lớn sau dựa vào source code (`src/app/`, `src/features/`):

### Phân hệ 1: Authentication & User Accounts (Xác thực và Tài khoản)
* **Chức năng chính:** Điều hướng login, phân cấp role, quản lý session phiên làm việc.
* **Dữ liệu:** Lưu trực tiếp tại schema siêu bảo mật `auth.users` của Database. 
* **Vai trò:** Lớp bảo vệ vòng ngoài. Cung cấp Identifier ID gốc cho mọi truy vấn truy xuất thông tin đính kèm phía sau.

### Phân hệ 2: CV Import & Normalization (Phân tích chuẩn hóa File CV)
* **Chức năng chính:** Tiếp nhận File Document, quản trị và thông báo các giai đoạn Pipeline OCR AI (Upload -> Read -> Parse). 
* **Model Code:** `cv-imports.ts`, bảng `cv_documents`.
* **Vai trò:** Cốt tử của dự án. Khác biệt với việc User gõ tay, phân hệ này làm cho data có hồn và lấy toàn bộ text phi cấu trúc từ PDF nén chặt vào cấu trúc `parsed_json` rành mạch, chia tách (Họ tên, SĐT, Danh sách Kinh nghiệm).

### Phân hệ 3: Unified CV Builder Editor (Trình chỉnh sửa CV thông minh)
* **Chức năng chính:** Màn hình làm việc cho phép Application đổ `parsed_json` vào các Node giao diện. Cho người dùng tùy biến Block nội dung, kéo thả các Layout. Cơ chế Autosave liên tục đồng bộ lên Server.
* **Model Code:** `editable-cvs.ts`, bảng `editable_cvs`, `editable_cv_versions`.
* **Vai trò:** Tạo trải nghiệm tái chế CV tối ưu nhất. Người dùng có quyền can thiệp vào các lỗi mà OCR quét sai, chủ động mapping/bind data lại với khung mẫu chuẩn nền tảng tạo ra. Chức năng Export PDF thuộc phân hệ này.

### Phân hệ 4: ATS Recruitment Management (Hệ thống điều vận Tuyển dụng)
* **Chức năng chính:** Quản trị đăng thông tin (Jobs). Dành cho HR kiểm soát luồng Application đổ về qua Kanban board (Các cột Applied, Reviewing, Offer...). Cung cấp Split interface cho HR tự động đọc CV không cần rời tab Web.
* **Model Code:** `recruitment.ts`, bảng `jobs`, `applications`.
* **Vai trò:** Xóa bỏ sự trì trệ trong việc quản lý Ứng viên. Tích hợp quản trị phễu tuyển dụng liền mạch.

### Phân hệ 5: Profile & Dashboard
* **Chức năng chính:** Hồ sơ cá nhân của Ứng viên (thừa hưởng và rút gọn từ bộ CV). Danh bạ các công ty (Companies Directory) phục vụ ứng viên xem thông tin. Dashboard báo cáo cho HR (Tổng job, tổng lượt tiếp cận).
* **Model Code:** `candidate-profiles.ts`, `companies.ts`.

## 11. Luồng hoạt động nghiệp vụ tổng quát

Để hiểu quá trình vận hành, hệ thống mô tả thông qua 2 luồng hoạt động then chốt.

### 11.1. Luồng ứng viên tái chế CV và Apply Job
1. **Bước 1 (Auth):** Ứng viên truy cập cổng chính, đăng nhập hệ thống bằng cơ chế Email/OTP.
2. **Bước 2 (Upload Data):** Trỏ tới Dashboard, chọn tính năng Import CV, người dùng chọn tải lên file PDF Profile cũ từ năm trước.
3. **Bước 3 (AI Parsing):** 
   * Trạng thái tiến trình UI Spin loader xuất hiện. 
   * Backend Python tải file PDF về. Gọi PaddleOCR bóc tách Tọa Độ và Chữ.
   * Chuyển tất cả cho LLM Gemini để tóm gọn, phân tách rạch ròi (`Tên: Nguyễn A`, `Kinh Nghiệm: ABC`).
   * Cập nhật JSON lưu vào DB.
4. **Bước 4 (Review & Edit):** UI ứng viên điều hướng vào Unified Editor. Họ kiểm tra lại xem AI bóc lộn thông tin SĐT không, thêm một Sở thích mới bằng việc Gõ vào WYSIWYG Editor. Nhấn Save (Autosave tự kích hoạt Update block Data JSON patch).
5. **Bước 5 (Export & Action):** Chốt bản nháp, Generate Document PDF gửi đi để lưu trữ.
6. **Bước 6 (Networking):** Ra trang Tìm Việc, lướt thấy Job "DevOps Engineer", Click nút [Ứng Tuyển Nhanh]. Hồ sơ CV vừa sửa sẽ nạp trực tiếp vào pipeline Jobs của HR.

### 11.2. Luồng thao tác của Nhà tuyển dụng
1. **Bước 1 (Init Job):** HR Profile đăng nhập. Truy cập Không gian Quản lý Tuyển dụng (Recruiter Workspace). Tạo mới Record `Job` với yêu cầu đầy đủ, set chế độ Open.
2. **Bước 2 (Wait & Notification):** Cứ có một thao tác "Apply" ở luồng trên, HR sẽ nhận Notification hoặc mail nội bộ (Testing ở Mailpit).
3. **Bước 3 (Evaluating):** Bức tranh tổng quan ATS Kanban Board hiện ra với các hộp thẻ tên ứng viên. HR click vào một ứng viên `Nguyễn A`.
4. **Bước 4 (Split-Preview Screening):** Màn hình chia nửa. Bên trái hệ thống load `cvUrl` PDF trực quan dạng A4, Bên phải hệ thống hiển thị bảng Tóm Tắt CV thông minh (chứa toàn bộ Keywords mà AI Model đọc được). HR đọc duyệt cực kỳ nhanh.
5. **Bước 5 (Pipeline Progressing):** Nhận định phù hợp. HR rê chuột, kéo (Drag) thẻ tên ứng viên thả (Drop) sang cột `Thắng/Được đề nghị (Offer)`. Hệ thống bắn Mail chức mừng tới Ứng viên.

## 12. Giao diện và trải nghiệm người dùng (UI/UX)

Yếu tố Giao diện được source code hệ thống trau chuốt thông qua:
* **UI Layout thống nhất:** Tailwind CSS với Token Màu chuẩn. Hỗ trợ cảm quan Minimalist (Tối giản), tập trung cao vào văn bản chữ.
* **Unified Workspace (Vùng soạn thảo trung tâm):** Áp dụng thiết kế Drawer Panels, mọi công cụ (Đổi template, Chọn màu chữ, Focus Block) được giấu vào sườn trái phải. Không gian chính 70% giữa màn hình cho phép Rendering y hệt một bản PDF thực tế (WYSIWYG - What You See Is What You Get). 
* **Drag-and-Drop mịn màng:** Sử dụng @dnd-kit/sortable giúp Sort các trường mục (Kéo Kinh nghiệm công việc số 2 lên trên số 1) với tính năng Animation di chuyển mượt mà, layout không xô lệch nhảy giật gân, mang lại trải nghiệm không thua các phần mềm Desktop.
* **ATS Review UX Khác Biệt:** Việc đọc PDF bằng Application thứ 3 thường mất tập trung. Hệ thống thiết kế View-Engine tích hợp song song cả 2 bản gốc/Trích xuất trên 1 màn ngang giúp hạn chế số thao tác Switch Tab (Bấm chuyển Tab) của Nhà Quản Trị mệt mỏi.

## 13. Mô hình dữ liệu và cơ sở dữ liệu

Dựa vào quy mô của Migration Data Engine (`supabase/migrations/*.sql`) và Data Types `src/types`. Phân tích chi tiết Data Tier:

### 13.1. Tổng quan cơ sở dữ liệu
Hệ thống lấy lõi **PostgreSQL** (chạy thông qua hạ tầng Supabase) làm nguồn phát chân lý (Single Source of Truth). Khác với MySQL thuần có chút cứng nhắc, việc sử dụng PostgresSQL cho phép tận dụng cực tốt kiểu dữ liệu `JSONB` chuyên biệt nhằm giải quyết sự không báo trước chuẩn hóa quy chuẩn (Schemaless) của một văn bản CV người dùng nộp lên.

### 13.2. Bảng/Model dữ liệu trọng tâm
* **`cv_documents` & `cv_document_pages`:** Bảng Master chứa Meta thông tin tài liệu. Nó ghi vết trạng thái `cv_document_status` (đang xử lý AI hay đã xong).
* **`cv_ocr_blocks` & `cv_layout_blocks`:** Lưu trữ từng vị trí Pixel tọa độ khung đọc `bbox_px` và confidences đọc văn bản (VD: Khối chữ này OCR chắc chắn đúng 99%). Cực kỳ cần thiết để thuật toán Map Box hiển thị trên UI.
* **`editable_cvs` & `editable_cv_blocks`:** Là một Instance sao chép (thừa kế) từ Data ban đầu, bảng chứa tiến trình biên soạn. Cho phép tracking phiên bản `editable_cv_versions` giống cơ chế Version History của Google Doc. Tránh hỏng file gốc.
* **`jobs`:** Bảng chứa thông tin kinh doanh. Thông tin vị trí Job, Công ty `companyName`, trạng thái đóng/mở công khai.
* **Bảng Applications trung gian:** Nơi kết nối đa quan hệ N/N giữa ứng viên (Candidate profiles) với N công việc (Jobs), lưu trữ ApplicationID và Status ATS Pipeline hiện đỗ tại vòng nào.

### 13.3. Tầm Quan trọng và Vai Trò của Dữ liệu JSONB
Hệ thống sử dụng các khóa như `parsed_json`, `metadata`, `style_json`, `snapshot_updated_json` trên Database.
* **Vấn đề kỹ thuật:** CV người dùng A có 2 kỹ năng chuyên ngành và 2 dự án; CV người B có tận 40 kỹ năng, 3 trường Đại Học và hàng chục mục con không tên. Nếu thiết kế kiểu Tables/Columns SQL thông thường, CSDL sẽ cần hàng ngàn bảng Mapping nối thừa thãi.
* **Giải pháp:** Sử dụng mô hình `JSONB` native. Khi AI Models (Gemini/Python) xuất ra kết quả phân loại, nó tạo ra một cấu trúc JSON cây phân cấp (Tree Nested array). Backend NodeJS chỉ cần bê toàn bộ cây JSON này đẩy thẳng vào Field `parsed_json` của PostgreSQL. 
* Mọi thao tác truy xuất phục vụ render UI Editor (Kéo thả, map form dữ liệu lên Input Text) đều lấy cấu trúc JSON Data này về đọc, thay vì Query hàng chục List Arrays liên kết. Điều này giải phóng tốc độ I/O Database một cách mạnh mẽ. Frontend chủ yếu đọc, ghi sự thay đổi lên Patch Node của biến JSON (Delta Update).

## 14. Bảo mật và phân quyền
* **Authentication (Xác thực):** Cơ chế JWT (JSON Web Token) kết hợp qua Supabase Auth cấp Session lưu Cookie ở tầng Server Rendering.
* **Phân quyền dữ liệu triệt để (RLS):** Tất cả các bảng CSDL đều chứa Config Row Level Security. VD: `CREATE POLICY "cv_documents_owner" ON cv_documents USING (auth.uid() = user_id)`. Chính sách này thực thi ngay cấp độ vật lý DB: Mọi API từ Client Node.js có mưu đồ gọi ID hồ sơ lạ (kể cả có Tool Hacker giả mạo Token), PostgreSQL sẽ block tác vụ select do không trùng khớp UID chủ thể. 
* **Bảo mật dữ liệu truyền thông:** Mọi giao dịch qua Request API nội bộ hệ thống mã hóa TLS/SSL. Không truy vấn dữ liệu thô (Raw File Data Document) nếu không có Context User phân quyền hệ thống. Quản trị Nhà tuyển dụng không có quyền Write (chỉnh sửa bóp méo) thông tin File Candidate.

## 15. Môi trường triển khai và vận hành
* **Môi trường cục bộ (Dev Environment):** Hệ thống có thể mô phỏng một Farm Cluster đầy đủ ngay trên Laptop cá nhân nhờ `docker-compose.yml`. Chỉ với một bộ lệnh Docker, toàn bộ Frontend (Cổng 3000), AI FastAPI Backend (Cổng 8000), Redis lưu Cache Queue, MongoDB và Mailpit (Cổng 8025 để check Test Emails) được kích hoạt lên đồng thời.
* **Môi trường Server thực tế (Production Deploy):**
  * Database Postgres được host tại hạ tầng Cloud Supabase (PaaS serverless) đảm bảo Backup định kỳ tự động.
  * Node Nextjs xây dựng Static + Server Actions có thể triển khai lên nền tảng Vercel Edge Networks.
  * Cụm AI Service (Cụm xử lý nặng nhất): Đóng Container Docker cô lập đưa lên môi trường máy ảo riêng biệt (như AWS EC2 / Digital Ocean có GPU) đảm bảo không thắt cổ chai phần cứng web app.

## 16. Ưu điểm hiện tại của hệ thống

Việc phân tích nguồn lực cho thấy hệ thống mang sức mạnh đáng tin cậy:
* **Kiến trúc vĩ mô hợp lý (Micro-service approach):** Sự tách riêng API Python lo khâu Compute AI nặng tránh cho Server Web chính Node.js bị đơ nhẽo. Celery Queue Worker giúp hệ thống bảo toàn sự toàn vẹn giao dịch (Crash AI thì Worker tự start/retry báo Event Failed lên Web bình thường, mất điện không mất CV).
* **Khai phá Sức Mạnh AI thế hệ mới:** Thay thế hoàn toàn tư duy nhập form Data Entry cổ điển ở các Web tìm việc truyền thống (Buộc User phải copy paste từng hàng kinh nghiệm, dòng học vấn từ PDF chép vào Web Form 3 trang dằng dặc). Ở nền tảng này, AI làm sạch thay ứng viên. OCR bóc chữ, LLM hiểu và rải data vào các trường Input nhanh trong vòng một nhấp chuột.
* **Trải nghiệm CV Unified Editor đẳng cấp:** Khả năng kết nối UI Kéo Thả thời gian thực trực quan, phối cảnh và xử lý Layout Block rất mượt mà. Quá trình xử lý Autosave State giúp hạn chế tối đa rủi ro mất dữ liệu bản nháp của Users.

## 17. Hạn chế hiện tại của hệ thống

Dưới góc nhìn khoa học kỹ thuật, hệ thống vẫn tồn đọng một số giới hạn dựa bào codebase hiện hữu:
* **Sự rủi ro từ Models quang học học máy:** Việc bóc tách bằng mô hình PaddleOCR kết hợp Rule-based truyền thống dễ vỡ nát Layout khi đối đầu với những file CV có thiết kế dạng tạp chí nghệ thuật (Chia cột chéo, Gradient quá mảng, Font chữ hoa mỹ viết tay khó nhận diện ký tự tiếng Việt đầy đủ diacrities). Quá trình đưa text vỡ qua mô hình LLM normalize có thể bị "Ảo giác" (Hallucination) dẫn tới tự biên tự diễn thông tin sai.
* **Phụ thuộc băng thông Server:** Trí tuệ AI cần CPU/GPU cực mạnh nếu mô hình đẩy lên kích thước chục tỷ biến Parameter. Tốc độ nhận file, phân tích Queue của AI Worker sẽ chậm rãi và "tắc nghẽn" nếu có lượng tương tác đồng thời peak đỉnh trong cùng 1 phút.
* **Chi phí External API:** Nếu tích hợp Gemini API Cloud để Parsing thay vì Local Inference Ollama, rủi ro chi móp phí quota API Key cho mỗi một CV nhận dạng là rất lớn ở quy mô Scale số lượng doanh nghiệp.

## 18. Hướng phát triển trong tương lai
Trọng tâm nâng cấp nền tảng trong giai đoạn tới gồm:
* **Triển khai AI Vision-Language Models (VLM):** Thay thế pipeline 2 bước (Chạy Tool nhận diện quang học -> Chạy Tool hiểu văn bản) thành 1 bước truyền ảnh Raw vào thẳng Mô Hình Qwen-VL hoặc Gemini-Pro-Vision để Model tự xử lý Multi-modals (Đọc hiểu layout và phân tích). Giải quyết dứt điểm vấn đề vỡ rớt Text Block.
* **Tự động Scoring Mức độ Phù hợp (Matching AI):** Xây dựng thuật toán Matching Score, dùng Vector Embeddings. Tự động mang dữ liệu File Model `parsed_json` phân tích và so sánh mảng Keyword với File model Job Requirements, tự động Rate chấm điểm phần trăm Matching (vd: Ứng viên này hợp Job 85%), giảm công tác đọc soát mù của HR.
* **Gia tăng Tính năng tương tác ATS:** Mở rộng tích hợp gửi lịch Google Calendar tự động ngay khi chuyển Trạng Thái Candidate Profile sang Cột thẻ "Interview / Lên lịch phỏng vấn" trên Kanban Board. Tích hợp Chat thời gian thực với ứng viên.

## 19. Kết luận chương

Chương Tổng quan Hệ thống đã khái quát toàn bộ cấu trúc quy mô và nghiệp vụ của Nền tảng Tuyển dụng kiêm Xây dựng CV thế hệ mới. Không chỉ dừng lại ở mặt giao diện lý thuyết truyền thống của một trang Web Job Board đơn thuần; Hệ thống đã chứng minh được việc sở hữu chiều sâu chuyên biệt về xử lý dữ liệu với hệ thống Kiến trúc phân tán tập trung (Client/Queue-Worker/DB) nhằm điều vận trơn tru công nghệ AI nhận dạng phức tạp. 

Những kiến thức phân tích tổng thể bao quát về đối tượng tương tác (HR/Candidate), quy mô giới hạn (Scope), cũng như sự tường minh về luồng dữ liệu Models PostgresSQL đã tạo ra một bức tranh vĩ mô rõ ràng nhất. Đây là nền móng cốt lõi để đi tới các bước phân tích, mô tả chi tiết biểu đồ mô hình hóa Hệ thống (UML, Use cases) và các giao thức System Design thực hành ở các chương kế tiếp của đồ án.

---
### Nguồn suy ra nội dung 
_(Tài liệu được phân tích trực tiếp từ Data Codebase)_
1. **Kiến trúc Công nghệ:** Tham chiếu từ `package.json`, `docker-compose.yml`, quá trình Bootstrap lệnh Celery worker từ `/ai-service`.
2. **Nghiệp vụ Xử lý Hồ Sơ CV & Trình soạn thảo:** Đối chiếu Model logic trong `src/types/cv-import.ts`, `src/types/editable-cv.ts` (Sự tồn tại của các trường `parsed_json`, `bbox_normalized`, `cv_document_stage_runs`).
3. **Nghiệp vụ Quản lý Hệ thống ATS (Nhà Tuyển dụng):** Dựa trên cấu trúc khai báo tại File `src/types/recruitment.ts` định nghĩa rõ Pipeline (`applied`, `reviewing`, `offer`) cũng như các Split View Model thông tin Job và Employer's Workspace.
4. **Cơ sở dữ liệu & Phân Quyền Access:** Khảo sát trực tiếp System Schema của Database Postgres nằm tại thư mục `supabase/migrations/2026031902_cv_imports_v2.sql` mô tả cấu trúc Row Level Security mạnh mẽ nhằm vạch định quyền kiểm soát user truy vấn. 
5. Cấu trúc Modules thư mục frontend (Thư mục `src/features/unified-editor`, `src/lib`, `src/app/(candidate) | (hr)` đóng vai trò Router Component định hình giao diện UX).
