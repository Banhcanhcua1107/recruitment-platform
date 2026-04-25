# MÔ TẢ CÁC BẢNG DỮ LIỆU HỆ THỐNG TALENTFLOW

Tài liệu này được lập dựa trên schema `public` đang hoạt động của dự án Supabase, sau đó đối chiếu lại với migration SQL và một số service nghiệp vụ trong mã nguồn để làm rõ ý nghĩa sử dụng của từng bảng. Vì yêu cầu gửi kèm không chứa danh sách số mục gốc, các bảng dưới đây được đánh số lại theo nhóm chức năng thực tế của hệ thống.

Trong quá trình đối chiếu migration lịch sử, có một số bảng cũ như `companies` và `cvs` chỉ còn xuất hiện trong migration cũ, không còn thấy trong schema live hiện tại. Vì vậy, tài liệu này chỉ mô tả các bảng đang có thật trong schema tại thời điểm khảo sát.

---

### 3.1.1.1. profiles

**Mô tả bảng:**  
Bảng `profiles` là bảng hồ sơ nền tảng gắn với tài khoản trong `auth.users`. Bảng này lưu các thông tin cơ bản như họ tên, email, ảnh đại diện và vai trò sử dụng hệ thống. Đây là lớp dữ liệu đầu tiên để hệ thống phân biệt người dùng là ứng viên hay nhà tuyển dụng, từ đó điều hướng đúng dashboard và áp dụng đúng quyền truy cập dữ liệu.

Trong mã nguồn hiện tại, `profiles` còn đóng vai trò làm điểm đồng bộ sang các bảng nghiệp vụ khác như `candidates` và `employers`. Khi người dùng được gắn vai trò `candidate` hoặc `hr`, dữ liệu từ `profiles` được dùng để khởi tạo bản ghi tương ứng trong các bảng quản lý tuyển dụng.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của bảng, đồng thời liên kết tới tài khoản trong `auth.users`. |
| `full_name` | `text` | Họ tên hiển thị của người dùng trên hệ thống. |
| `email` | `text` | Email của người dùng, dùng cho hiển thị và hỗ trợ một số luồng nghiệp vụ. |
| `avatar_url` | `text` | Đường dẫn ảnh đại diện của người dùng. |
| `role` | `text` | Vai trò sử dụng, hiện dùng chủ yếu cho `candidate` và `hr`. |
| `updated_at` | `timestamptz` | Thời điểm cập nhật gần nhất của hồ sơ cơ bản. |

### 3.1.1.2. employers

**Mô tả bảng:**  
Bảng `employers` lưu thông tin nghiệp vụ của phía nhà tuyển dụng. Nếu `profiles` chỉ phản ánh thông tin tài khoản ở mức chung, thì `employers` là nơi hệ thống dùng để gắn tài khoản HR với dữ liệu doanh nghiệp phục vụ đăng tin, quản lý job và vận hành tuyển dụng.

Bảng này được dùng xuyên suốt trong recruiter workspace. Nhiều luồng như quản lý tin tuyển dụng, dashboard phía HR, public company directory và xử lý ứng viên theo pipeline ATS đều phải dựa vào `employers`. Một số trường như tên công ty, logo, location và mô tả công ty cũng được dùng để hiển thị ra phần công khai hoặc để khởi tạo `company_profiles`.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của bảng, gắn với người dùng nhà tuyển dụng trong `auth.users`. |
| `company_name` | `text` | Tên công ty hiển thị trong recruiter workspace và các trang công khai. |
| `email` | `text` | Email liên hệ chính của nhà tuyển dụng hoặc doanh nghiệp. |
| `logo_url` | `text` | Ảnh logo công ty. |
| `cover_url` | `text` | Ảnh bìa hoặc hình đại diện dùng cho trang công ty. |
| `location` | `text` | Địa điểm chính của doanh nghiệp. |
| `industry` | `jsonb` | Danh sách lĩnh vực hoạt động của doanh nghiệp; dữ liệu lưu theo mảng JSON để dễ mở rộng. |
| `company_size` | `text` | Quy mô công ty. |
| `company_description` | `text` | Mô tả ngắn về doanh nghiệp, dùng cho hiển thị và đồng bộ hồ sơ công ty. |
| `created_at` | `timestamptz` | Thời điểm tạo bản ghi nhà tuyển dụng. |

### 3.1.1.3. candidates

**Mô tả bảng:**  
Bảng `candidates` là bảng định danh nghiệp vụ của phía ứng viên trong hệ thống. Bảng này lưu một số thông tin nền như họ tên, email, số điện thoại và liên kết tới CV ở mức đơn giản. Trong kiến trúc hiện tại, `candidates` đóng vai trò như một danh bạ ứng viên dùng trong ATS và recruiter workspace.

Khác với `candidate_profiles`, bảng `candidates` không phải nơi chứa toàn bộ hồ sơ nghề nghiệp chi tiết. Thay vào đó, nó được dùng như lớp dữ liệu gọn hơn để gắn ứng viên với các đơn ứng tuyển và để phía HR truy xuất thông tin cơ bản trong quá trình xử lý hồ sơ.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của bảng, đồng thời gắn với tài khoản ứng viên trong `auth.users`. |
| `full_name` | `text` | Họ tên ứng viên dùng trong ATS và danh sách hồ sơ. |
| `email` | `text` | Email liên hệ của ứng viên. |
| `phone` | `text` | Số điện thoại của ứng viên. |
| `resume_url` | `text` | Liên kết tới CV hoặc tệp hồ sơ ở mức cơ bản. |
| `created_at` | `timestamptz` | Thời điểm tạo bản ghi ứng viên. |

### 3.1.1.4. activity_logs

**Mô tả bảng:**  
Bảng `activity_logs` dùng để ghi nhận các thao tác nghiệp vụ do phía nhà tuyển dụng thực hiện trong quá trình vận hành tuyển dụng. Dữ liệu ở đây không thay thế cho `application_events`, mà thiên về lưu các hành động tổng quát của HR để phục vụ theo dõi hoạt động và hỗ trợ dashboard.

Trong các luồng đã đọc từ mã nguồn, khi nhà tuyển dụng thay đổi trạng thái hồ sơ hoặc xử lý một bước quan trọng trong ATS, hệ thống có thể ghi thêm bản ghi vào `activity_logs`. Vì vậy, bảng này đóng vai trò nhật ký nghiệp vụ ở phía employer.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của bảng nhật ký hoạt động. |
| `action` | `text` | Nội dung hành động đã diễn ra, ví dụ cập nhật trạng thái ứng tuyển. |
| `user_id` | `uuid` | Khóa ngoại tới `employers.id`, cho biết HR nào thực hiện hành động. |
| `created_at` | `timestamptz` | Thời điểm hệ thống ghi nhận hoạt động. |

### 3.1.2.1. jobs

**Mô tả bảng:**  
Bảng `jobs` là bảng trung tâm của cổng tuyển dụng công khai và recruiter workspace. Bảng này lưu toàn bộ thông tin của một tin tuyển dụng, gồm tiêu đề, công ty, địa điểm, mô tả công việc, yêu cầu, quyền lợi và các thông tin phụ trợ khác. Trong TalentFlow, nhiều luồng chính như public jobs, ứng tuyển, saved jobs, recommendation và ATS đều gắn trực tiếp với bảng này.

Điểm đáng chú ý là `jobs` không chỉ phục vụ hiển thị ngoài giao diện công khai. Bảng còn chứa các trường dành cho phía vận hành như `status`, `employer_id`, `is_public_visible`, `hr_email` và `target_applications`. Vì vậy, đây là bảng nối giữa phần công khai của hệ thống và phần quản trị tuyển dụng phía HR.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `text` | Khóa chính của bảng việc làm. Trong schema hiện tại, mã job được lưu dạng `text`. |
| `title` | `text` | Tên vị trí tuyển dụng. |
| `company_name` | `text` | Tên công ty hiển thị cùng tin tuyển dụng. |
| `employer_id` | `uuid` | Khóa ngoại tới `employers.id`, cho biết tin tuyển dụng thuộc về nhà tuyển dụng nào. |
| `status` | `text` | Trạng thái vận hành của job, hiện dùng cho các giá trị như `open`, `closed`, `draft`. |
| `is_public_visible` | `boolean` | Cho biết job có đang được hiển thị ở cổng công khai hay không. |
| `description` | `jsonb` | Nội dung mô tả công việc; trong dữ liệu hiện tại thường lưu theo mảng hoặc cấu trúc JSON để dễ render lại. |
| `requirements` | `jsonb` | Danh sách yêu cầu tuyển dụng. |
| `benefits` | `jsonb` | Danh sách quyền lợi hoặc phúc lợi của vị trí. |
| `industry` | `jsonb` | Nhóm ngành nghề liên quan đến job; dữ liệu lưu theo JSON để tiện lọc và ghép nối. |
| `raw` | `jsonb` | Bản dữ liệu gốc của tin tuyển dụng, dùng như lớp backup hoặc phục vụ đối chiếu khi cần. |
| `hr_email` | `text` | Email tuyển dụng dùng cho một số luồng gửi email ứng tuyển. |
| `target_applications` | `integer` | Số lượng hồ sơ mục tiêu mà HR muốn đạt tới; mang tính theo dõi, không phải ràng buộc chặn nộp hồ sơ. |
| `created_at` | `timestamptz` | Thời điểm tạo bản ghi việc làm. |

### 3.1.2.2. saved_jobs

**Mô tả bảng:**  
Bảng `saved_jobs` lưu quan hệ giữa ứng viên và các việc làm mà họ muốn đánh dấu để xem lại sau. Đây là dữ liệu hỗ trợ candidate dashboard, giúp người dùng quản lý danh sách việc làm quan tâm mà không cần tìm lại từ đầu.

Về mặt nghiệp vụ, `saved_jobs` không tạo ra tiến trình tuyển dụng như `applications`, nhưng nó phản ánh hành vi quan tâm của ứng viên đối với job. Vì vậy, bảng này được xem là một phần của hành trình tìm việc trước khi nộp đơn.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của bản ghi lưu job. |
| `user_id` | `uuid` | Người dùng đã lưu job; gắn với tài khoản ứng viên trong `auth.users`. |
| `job_id` | `text` | Khóa ngoại tới `jobs.id`, cho biết job nào được lưu. |
| `created_at` | `timestamptz` | Thời điểm ứng viên lưu công việc này. |

### 3.1.2.3. applications

**Mô tả bảng:**  
Bảng `applications` lưu bản ghi ứng tuyển của ứng viên vào từng tin tuyển dụng. Đây là bảng lõi của luồng candidate nộp hồ sơ và cũng là điểm khởi đầu của pipeline ATS phía HR. Mỗi bản ghi thể hiện mối quan hệ giữa một ứng viên và một job cụ thể, kèm theo trạng thái xử lý hiện tại của hồ sơ đó.

Khác với một bảng nối đơn thuần, `applications` còn lưu snapshot quan trọng tại thời điểm ứng tuyển như họ tên, email, số điện thoại, phần giới thiệu và đường dẫn CV đã nộp. Cách thiết kế này giúp hệ thống giữ lại dữ liệu ứng tuyển thực tế ngay cả khi hồ sơ người dùng về sau có thay đổi.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của đơn ứng tuyển. |
| `job_id` | `text` | Khóa ngoại tới `jobs.id`, cho biết ứng viên nộp vào vị trí nào. |
| `candidate_id` | `uuid` | Mã ứng viên đã nộp hồ sơ; liên kết nghiệp vụ với ứng viên trong hệ thống. |
| `status` | `text` | Trạng thái đơn ứng tuyển, dùng cho luồng ATS như `applied`, `reviewing`, `interview`, `offer`, `hired`, `rejected`. |
| `full_name` | `text` | Họ tên ứng viên tại thời điểm nộp hồ sơ. |
| `email` | `text` | Email liên hệ của ứng viên trong lần nộp đơn này. |
| `phone` | `text` | Số điện thoại liên hệ của ứng viên. |
| `introduction` | `text` | Nội dung giới thiệu hoặc thông điệp ứng tuyển. |
| `cover_letter` | `text` | Thư giới thiệu hoặc nội dung cover letter. |
| `cv_file_path` | `text` | Đường dẫn tệp CV đã dùng để ứng tuyển trong storage. |
| `cv_file_url` | `text` | URL truy cập hoặc route trung gian để xem/tải CV của đơn ứng tuyển. |
| `applied_at` | `timestamptz` | Mốc thời gian nộp hồ sơ. |
| `updated_at` | `timestamptz` | Mốc thời gian cập nhật trạng thái hoặc dữ liệu đơn gần nhất. |

### 3.1.2.4. application_events

**Mô tả bảng:**  
Bảng `application_events` lưu lịch sử các sự kiện phát sinh trong vòng đời của một đơn ứng tuyển. Nếu `applications` cho biết trạng thái hiện tại, thì `application_events` ghi lại các bước đã xảy ra để phục vụ timeline và truy vết ATS.

Trong các luồng hiện tại, bảng này được dùng khi ứng viên nộp hồ sơ, khi HR đổi trạng thái hoặc khi hệ thống cần ghi dấu một sự kiện quan trọng liên quan tới đơn ứng tuyển. Vì vậy, bảng này giúp tái hiện lại lịch sử xử lý thay vì chỉ nhìn vào một trạng thái cuối.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của bản ghi sự kiện. |
| `application_id` | `uuid` | Khóa ngoại tới `applications.id`, cho biết sự kiện thuộc về đơn ứng tuyển nào. |
| `event` | `text` | Tên sự kiện nghiệp vụ, ví dụ nộp hồ sơ hoặc đổi trạng thái. |
| `actor_id` | `uuid` | Người thực hiện sự kiện; có thể là ứng viên, HR hoặc tác nhân hệ thống. |
| `metadata` | `jsonb` | Dữ liệu bổ sung của sự kiện, thường lưu trạng thái mới, job liên quan hoặc thông tin ngữ cảnh. |
| `created_at` | `timestamptz` | Thời điểm phát sinh sự kiện. |

### 3.1.2.5. notifications

**Mô tả bảng:**  
Bảng `notifications` lưu thông báo trong hệ thống cho cả ứng viên và nhà tuyển dụng. Đây là lớp dữ liệu hỗ trợ người dùng theo dõi các thay đổi như nộp hồ sơ thành công, cập nhật trạng thái đơn, hoặc các thay đổi nghiệp vụ khác cần được hiển thị lại trên dashboard.

Trong mô hình hiện tại, thông báo được tổ chức theo người nhận cụ thể và có thể kèm người tạo sự kiện, đường dẫn điều hướng và metadata. Nhờ vậy, bảng này không chỉ phục vụ hiển thị danh sách thông báo, mà còn giúp mở lại đúng màn hình hoặc đúng đối tượng liên quan.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của thông báo. |
| `recipient_id` | `uuid` | Người nhận thông báo; liên kết tới tài khoản người dùng. |
| `actor_id` | `uuid` | Người tạo ra sự kiện dẫn tới thông báo; có thể để trống nếu là hệ thống. |
| `type` | `text` | Loại thông báo, ví dụ thông báo chung hoặc cập nhật trạng thái ứng tuyển. |
| `title` | `text` | Tiêu đề ngắn của thông báo. |
| `description` | `text` | Nội dung mô tả chi tiết hơn cho thông báo. |
| `href` | `text` | Đường dẫn điều hướng khi người dùng bấm vào thông báo. |
| `metadata` | `jsonb` | Dữ liệu bổ sung như `applicationId`, `jobId`, `status`; dùng để hỗ trợ điều hướng và hiển thị. |
| `is_read` | `boolean` | Cho biết người dùng đã đọc thông báo hay chưa. |
| `created_at` | `timestamptz` | Thời điểm tạo thông báo. |

### 3.1.3.1. candidate_profiles

**Mô tả bảng:**  
Bảng `candidate_profiles` là nơi lưu hồ sơ ứng viên theo hướng có cấu trúc hơn so với bảng `candidates`. Đây là bảng gắn trực tiếp với candidate dashboard, public candidate search và các luồng dựng hồ sơ trong hệ thống. Ngoài dữ liệu tóm tắt như họ tên, headline, kỹ năng, kinh nghiệm và học vấn, bảng này còn lưu cả `document` JSONB của profile builder.

Trong thực tế triển khai của TalentFlow, `candidate_profiles` vừa là hồ sơ ứng viên dùng cho candidate workspace, vừa là nguồn dữ liệu để recruiter tìm kiếm hồ sơ công khai. Trường `profile_visibility` giúp xác định hồ sơ có được đưa vào public search hay không, còn các trường như `cv_file_path` và `cv_url` hỗ trợ liên kết tới CV gắn với hồ sơ.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của hồ sơ ứng viên. |
| `user_id` | `uuid` | Người dùng sở hữu hồ sơ; mỗi ứng viên chỉ có một hồ sơ chính. |
| `document` | `jsonb` | Tài liệu hồ sơ dạng có cấu trúc, thường chứa `meta` và `sections` của profile builder. |
| `full_name` | `text` | Họ tên ứng viên dùng cho hiển thị hồ sơ. |
| `headline` | `text` | Tiêu đề nghề nghiệp hoặc giới thiệu ngắn của ứng viên. |
| `email` | `text` | Email liên hệ của ứng viên. |
| `phone` | `text` | Số điện thoại liên hệ. |
| `location` | `text` | Địa điểm làm việc hoặc nơi ở hiện tại của ứng viên. |
| `introduction` | `text` | Phần giới thiệu bản thân trong hồ sơ. |
| `skills` | `text[]` | Danh sách kỹ năng chính của ứng viên. |
| `work_experiences` | `jsonb` | Danh sách kinh nghiệm làm việc theo cấu trúc JSON, dùng cho profile chi tiết và public search. |
| `educations` | `jsonb` | Danh sách học vấn theo cấu trúc JSON. |
| `work_experience` | `text` | Chuỗi tóm tắt kinh nghiệm, phục vụ một số màn hình hoặc dữ liệu tương thích cũ. |
| `education` | `text` | Chuỗi tóm tắt học vấn. |
| `cv_file_path` | `text` | Đường dẫn tệp CV gắn với hồ sơ. |
| `cv_url` | `text` | URL truy cập CV ở mức hồ sơ. |
| `profile_visibility` | `text` | Chế độ hiển thị hồ sơ, hiện dùng `public` hoặc `private`. |
| `updated_at` | `timestamptz` | Thời điểm hồ sơ được cập nhật gần nhất. |

### 3.1.3.2. profile_views

**Mô tả bảng:**  
Bảng `profile_views` dùng để ghi nhận lượt xem hồ sơ ứng viên. Dựa trên migration và code dashboard hiện tại, bảng này phục vụ chủ yếu cho thống kê ở phía candidate, ví dụ số lần hồ sơ công khai được xem.

Dù cấu trúc bảng khá gọn, vai trò của nó lại gắn với tính năng public profile. Khi nhà tuyển dụng hoặc người dùng phù hợp truy cập hồ sơ ứng viên, hệ thống có thể ghi nhận lại lượt xem để hiển thị ở dashboard như một chỉ báo về mức độ quan tâm đối với hồ sơ đó.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của bản ghi lượt xem. |
| `candidate_id` | `uuid` | Ứng viên có hồ sơ được xem. |
| `viewer_id` | `uuid` | Người xem hồ sơ; có thể để trống nếu không xác định được người xem cụ thể. |
| `created_at` | `timestamptz` | Thời điểm xảy ra lượt xem hồ sơ. |

### 3.1.3.3. company_profiles

**Mô tả bảng:**  
Bảng `company_profiles` lưu hồ sơ công ty ở mức chi tiết hơn cho phía nhà tuyển dụng. Nếu `employers` là bảng định danh doanh nghiệp trong luồng tuyển dụng, thì `company_profiles` là lớp dữ liệu giàu nội dung hơn để phục vụ employer branding, trang công ty công khai và HR company workspace.

Bảng này sử dụng cả dữ liệu cột truyền thống lẫn `document` JSONB để hỗ trợ mô hình builder cho hồ sơ công ty. Các trường như `company_overview`, `industry`, `benefits`, `culture`, `vision` và `mission` cho thấy đây là nơi doanh nghiệp hoàn thiện nội dung hiển thị ra ngoài, không chỉ lưu thông tin kỹ thuật phục vụ job posting.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của hồ sơ công ty. |
| `user_id` | `uuid` | Người dùng HR sở hữu hồ sơ công ty. |
| `document` | `jsonb` | Hồ sơ công ty dạng builder, lưu cấu trúc `meta` và `sections`. |
| `company_name` | `text` | Tên doanh nghiệp hiển thị trên trang công ty. |
| `company_overview` | `text` | Phần giới thiệu ngắn về doanh nghiệp. |
| `email` | `text` | Email liên hệ của doanh nghiệp. |
| `website` | `text` | Website chính thức của công ty. |
| `phone` | `text` | Số điện thoại liên hệ. |
| `logo_url` | `text` | Logo doanh nghiệp. |
| `cover_url` | `text` | Ảnh bìa của trang công ty. |
| `location` | `text` | Địa điểm hoặc trụ sở chính. |
| `industry` | `jsonb` | Danh sách ngành nghề của công ty, lưu theo JSON để có thể dùng nhiều giá trị. |
| `benefits` | `jsonb` | Danh sách phúc lợi của doanh nghiệp. |
| `culture` | `jsonb` | Các nội dung mô tả văn hóa làm việc của công ty. |
| `vision` | `text` | Tầm nhìn của doanh nghiệp. |
| `mission` | `text` | Sứ mệnh của doanh nghiệp. |
| `company_description` | `text` | Phần mô tả chi tiết hơn về công ty. |
| `updated_at` | `timestamptz` | Thời điểm cập nhật hồ sơ công ty gần nhất. |

### 3.1.3.4. job_recommendations

**Mô tả bảng:**  
Bảng `job_recommendations` lưu kết quả gợi ý việc làm mới nhất cho từng người dùng. Mục đích của bảng là giúp kết quả recommendation không bị mất sau mỗi lần tải lại trang, đồng thời giảm việc phải tính toán lại ngay trong mọi lần truy cập dashboard.

Theo code của candidate workspace, bảng này chứa danh sách các job đã được chấm điểm và xếp hạng, kèm tóm tắt hồ sơ ứng viên đã dùng để tạo recommendation. Vì vậy, đây là bảng cache nghiệp vụ của mô-đun gợi ý việc làm.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `user_id` | `uuid` | Khóa chính của bảng, mỗi người dùng có một bản ghi recommendation mới nhất. |
| `items` | `jsonb` | Danh sách các việc làm gợi ý; trong thực tế thường chứa điểm phù hợp, mức độ phù hợp, lý do và snapshot job. |
| `candidate_summary` | `text` | Bản tóm tắt hồ sơ ứng viên được dùng làm đầu vào cho recommendation. |
| `created_at` | `timestamptz` | Thời điểm tạo bản ghi gợi ý. |
| `updated_at` | `timestamptz` | Thời điểm cập nhật kết quả gợi ý gần nhất. |

### 3.1.4.1. templates

**Mô tả bảng:**  
Bảng `templates` lưu các mẫu CV dùng trong CV Builder. Mỗi template định nghĩa cách trình bày CV ở mức khung, gồm tên mẫu, ảnh xem trước, cấu trúc block và style mặc định. Đây là bảng tĩnh tương đối quan trọng vì nó quyết định ứng viên sẽ nhập dữ liệu CV theo cấu trúc nào.

Trong TalentFlow, template không chỉ là dữ liệu giao diện. Hai trường JSONB là `default_styling` và `structure_schema` cho thấy mỗi template còn mang theo quy tắc trình bày và mô hình block mà builder cần dùng để tạo, hiển thị và xuất CV.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của mẫu CV. |
| `name` | `text` | Tên của template. |
| `thumbnail_url` | `text` | Ảnh xem trước của mẫu CV. |
| `category` | `text` | Nhóm template, ví dụ nhóm chung hoặc nhóm theo ngành. |
| `is_premium` | `boolean` | Đánh dấu template có thuộc nhóm trả phí hay không. |
| `default_styling` | `jsonb` | Cấu hình style mặc định như màu sắc, font, spacing và layout của template. |
| `structure_schema` | `jsonb` | Sơ đồ block của CV, xác định những phần nào sẽ xuất hiện và dữ liệu cần nhập cho từng block. |
| `created_at` | `timestamptz` | Thời điểm tạo mẫu CV. |
| `updated_at` | `timestamptz` | Thời điểm cập nhật mẫu gần nhất. |

### 3.1.4.2. resumes

**Mô tả bảng:**  
Bảng `resumes` lưu các bản CV do ứng viên tạo ra từ CV Builder. Mỗi resume thuộc về một người dùng cụ thể và có thể liên kết với một template. Đây là bảng dữ liệu chính của luồng tạo CV trực tiếp trên hệ thống.

Khác với `candidate_profiles`, bảng `resumes` tập trung vào CV dạng tài liệu ứng tuyển. Nó lưu nội dung block của CV, style hiện tại và thông tin công khai hay riêng tư của từng bản. Vì một ứng viên có thể cần nhiều CV cho nhiều vị trí khác nhau, bảng này cho phép lưu nhiều phiên bản resume trong cùng một tài khoản.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của bản CV. |
| `user_id` | `uuid` | Người dùng sở hữu resume. |
| `template_id` | `uuid` | Khóa ngoại tới `templates.id`, cho biết resume được tạo từ mẫu nào. |
| `title` | `text` | Tên hiển thị của CV trong kho CV của người dùng. |
| `resume_data` | `jsonb` | Nội dung CV theo cấu trúc block; đây là dữ liệu chính để builder hiển thị và chỉnh sửa. |
| `current_styling` | `jsonb` | Style hiện tại của bản CV sau khi người dùng chỉnh sửa. |
| `is_public` | `boolean` | Đánh dấu CV có được công khai hay không. |
| `created_at` | `timestamptz` | Thời điểm tạo CV. |
| `updated_at` | `timestamptz` | Thời điểm cập nhật CV gần nhất. |

### 3.1.5.1. cv_documents

**Mô tả bảng:**  
Bảng `cv_documents` là bảng trung tâm của pipeline import CV. Mỗi bản ghi tương ứng với một tài liệu CV gốc mà người dùng tải lên để hệ thống phân tích. Bảng này lưu cả thông tin nhận dạng tệp, trạng thái xử lý, kết quả parse, lỗi nếu có và các mốc thời gian của toàn bộ pipeline.

Đây là bảng quan trọng nhất của khối OCR/import vì nó nối từ tài liệu nguồn sang các bảng artifact, OCR block, layout block và editable CV. Ngoài ra, các trường versioning như `source_file_version_id`, `latest_file_version_id` và `last_parsed_version_id` cho thấy hệ thống không chỉ xử lý một lần, mà còn quản lý cả trường hợp tài liệu nguồn được cập nhật và cần phân tích lại.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của tài liệu CV đã nhập. |
| `user_id` | `uuid` | Người dùng sở hữu tài liệu import. |
| `status` | `cv_document_status` | Trạng thái pipeline như `uploaded`, `queued`, `ocr_running`, `parsing_structured`, `ready`, `failed`. |
| `document_type` | `cv_document_type` | Phân loại tài liệu, hiện gồm `unknown`, `cv`, `non_cv_document`. |
| `classification_confidence` | `numeric(5,4)` | Mức tự tin của bước phân loại tài liệu. |
| `classification_signals` | `jsonb` | Các tín hiệu hoặc dữ liệu trung gian từ bước phân loại; dùng để giải thích vì sao tài liệu được nhận diện theo một loại nào đó. |
| `review_required` | `boolean` | Cho biết tài liệu có cần người dùng review thủ công trước khi dùng tiếp hay không. |
| `review_reason_code` | `text` | Mã lý do khiến hệ thống yêu cầu review. |
| `file_name` | `text` | Tên tệp gốc người dùng đã tải lên. |
| `mime_type` | `text` | Loại MIME của tệp nguồn. |
| `file_size` | `bigint` | Kích thước tệp nguồn. |
| `file_sha256` | `text` | Mã băm SHA-256 của tệp, dùng để nhận diện nội dung tệp. |
| `source_kind` | `text` | Nguồn gốc của tài liệu, ví dụ upload từ người dùng hay tạo từ pipeline khác. |
| `page_count` | `integer` | Số trang của tài liệu nếu đã xác định được. |
| `raw_text` | `text` | Phần văn bản thô đã trích ra từ tài liệu. |
| `parsed_json` | `jsonb` | Kết quả parse có cấu trúc của tài liệu CV sau các bước xử lý. |
| `failure_stage` | `cv_failure_stage` | Bước xử lý bị lỗi, ví dụ OCR, layout, parse structured hoặc export. |
| `failure_code` | `text` | Mã lỗi cụ thể của lần xử lý thất bại. |
| `retry_count` | `integer` | Số lần hệ thống đã thử xử lý lại tài liệu. |
| `stage_durations` | `jsonb` | Thời lượng của từng giai đoạn xử lý, lưu dưới dạng JSON theo tên stage. |
| `source_file_version_id` | `uuid` | Khóa ngoại tới `document_file_versions.id`, chỉ phiên bản nguồn ban đầu của tài liệu. |
| `latest_file_version_id` | `uuid` | Khóa ngoại tới `document_file_versions.id`, chỉ phiên bản tài liệu mới nhất hiện có. |
| `last_parsed_version_id` | `uuid` | Khóa ngoại tới `document_file_versions.id`, chỉ phiên bản đã được parse gần nhất. |
| `file_updated_after_parse` | `boolean` | Đánh dấu file nguồn đã thay đổi sau lần parse trước. |
| `reparse_recommended` | `boolean` | Đánh dấu hệ thống khuyến nghị chạy parse lại tài liệu. |

### 3.1.5.2. cv_document_artifacts

**Mô tả bảng:**  
Bảng `cv_document_artifacts` lưu các tệp và sản phẩm trung gian được sinh ra trong quá trình xử lý một `cv_documents`. Đây có thể là file gốc, file đã chuẩn hóa, ảnh preview từng trang, kết quả OCR thô, kết quả layout, normalized JSON hoặc file export PDF.

Vai trò của bảng này là giữ lại mọi đầu ra có ý nghĩa của pipeline để các bước sau có thể tái sử dụng, kiểm tra và hiển thị lại. Ví dụ, màn hình review OCR cần preview trang, editor cần background trang, còn export cần liên kết tới artifact PDF đã sinh ra.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của artifact. |
| `document_id` | `uuid` | Khóa ngoại tới `cv_documents.id`, cho biết artifact thuộc tài liệu nào. |
| `artifact_key` | `text` | Mã định danh duy nhất của artifact trong hệ thống. |
| `kind` | `cv_artifact_kind` | Loại artifact, ví dụ `original_file`, `preview_page`, `ocr_raw`, `normalized_json`, `export_pdf`, `mapped_sections`. |
| `status` | `cv_artifact_status` | Trạng thái của artifact như `pending`, `ready`, `stale`, `failed`. |
| `page_number` | `integer` | Số trang liên quan nếu artifact gắn với một trang cụ thể. |
| `storage_bucket` | `text` | Bucket lưu tệp artifact. |
| `storage_path` | `text` | Đường dẫn tệp trong storage. |
| `content_type` | `text` | MIME type của artifact. |
| `byte_size` | `bigint` | Kích thước tệp artifact. |
| `sha256` | `text` | Mã băm của artifact nếu có. |
| `source_stage` | `cv_failure_stage` | Giai đoạn pipeline đã tạo ra artifact này. |
| `producer_model` | `text` | Mô hình hoặc engine tạo artifact nếu artifact sinh ra từ bước AI/OCR. |
| `metadata` | `jsonb` | Dữ liệu bổ sung phục vụ hiển thị hoặc truy vết artifact. |

### 3.1.5.3. cv_document_stage_runs

**Mô tả bảng:**  
Bảng `cv_document_stage_runs` ghi lại từng lần chạy của từng stage trong pipeline import CV. Nếu `cv_documents` lưu trạng thái tổng hợp, thì bảng này đi sâu hơn vào từng lần thực thi như OCR, layout, parsing hoặc persist.

Thiết kế này giúp hệ thống theo dõi tiến độ xử lý chi tiết, đo thời gian từng bước và chẩn đoán lỗi theo stage. Trong môi trường có Celery và Redis, việc lưu lại thông tin `job_id`, `attempt`, `state`, `duration_ms` và `error_message` là cần thiết để theo dõi tác vụ nền và hỗ trợ debug.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của một lần chạy stage. |
| `document_id` | `uuid` | Khóa ngoại tới `cv_documents.id`. |
| `job_id` | `text` | Mã job xử lý nền tương ứng với lần chạy stage. |
| `stage_name` | `text` | Tên giai đoạn đang chạy, ví dụ OCR hoặc parse structured. |
| `attempt` | `integer` | Số lần thử của giai đoạn đó. |
| `state` | `text` | Trạng thái của lần chạy, ví dụ đang chạy, hoàn tất hoặc lỗi. |
| `page_number` | `integer` | Trang liên quan nếu stage xử lý theo từng trang. |
| `started_at` | `timestamptz` | Thời điểm bắt đầu chạy stage. |
| `ended_at` | `timestamptz` | Thời điểm kết thúc stage. |
| `duration_ms` | `bigint` | Thời gian chạy của stage tính bằng mili giây. |
| `queue_wait_ms` | `bigint` | Thời gian chờ trong hàng đợi trước khi stage được xử lý. |
| `error_code` | `text` | Mã lỗi nếu stage thất bại. |
| `error_message` | `text` | Thông điệp lỗi chi tiết. |
| `metrics` | `jsonb` | Các chỉ số phụ trợ của lần chạy stage. |

### 3.1.5.4. cv_document_pages

**Mô tả bảng:**  
Bảng `cv_document_pages` chuẩn hóa thông tin từng trang của tài liệu CV sau khi import. Trong pipeline OCR và editor, việc có một bảng riêng cho trang giúp hệ thống quản lý kích thước chuẩn, ảnh nền, thumbnail và các block nằm trên từng trang.

Bảng này là cầu nối giữa `cv_documents` với các lớp chi tiết hơn như `cv_ocr_blocks`, `cv_layout_blocks` và `editable_cv_pages`. Nhờ đó, mọi thao tác đọc block hoặc dựng editor đều có thể quy chiếu về đúng trang tài liệu.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của trang tài liệu. |
| `document_id` | `uuid` | Khóa ngoại tới `cv_documents.id`. |
| `page_number` | `integer` | Số thứ tự trang trong tài liệu. |
| `canonical_width_px` | `integer` | Chiều rộng chuẩn hóa của trang theo pixel. |
| `canonical_height_px` | `integer` | Chiều cao chuẩn hóa của trang theo pixel. |
| `background_artifact_id` | `uuid` | Khóa ngoại tới `cv_document_artifacts.id`, chỉ artifact ảnh nền của trang. |
| `thumbnail_artifact_id` | `uuid` | Khóa ngoại tới `cv_document_artifacts.id`, chỉ artifact thumbnail của trang. |
| `created_at` | `timestamptz` | Thời điểm tạo bản ghi trang. |
| `updated_at` | `timestamptz` | Thời điểm cập nhật gần nhất. |

### 3.1.5.5. cv_ocr_blocks

**Mô tả bảng:**  
Bảng `cv_ocr_blocks` lưu các khối văn bản đã được OCR nhận diện trên từng trang của tài liệu CV. Đây là một trong những bảng quan trọng nhất của pipeline vì nó chứa văn bản thô, tọa độ khung, độ tin cậy và các gợi ý ánh xạ sang dữ liệu có cấu trúc.

Trong TalentFlow, bảng này không chỉ dùng để hiển thị kết quả OCR. Các trường như `suggested_json_path`, `suggested_mapping_role`, `suggested_compose_strategy` và `suggested_parse_strategy` cho thấy mỗi block còn được dùng làm đầu vào cho bước mapping sang editable CV và parsed JSON. Nhờ đó, hệ thống có thể đi từ nhận dạng ký tự đến dữ liệu có thể chỉnh sửa.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của block OCR. |
| `document_id` | `uuid` | Khóa ngoại tới `cv_documents.id`. |
| `page_id` | `uuid` | Khóa ngoại tới `cv_document_pages.id`, cho biết block nằm ở trang nào. |
| `text` | `text` | Nội dung văn bản đã OCR nhận diện được. |
| `confidence` | `numeric(5,4)` | Độ tin cậy của kết quả OCR. |
| `bbox_px` | `jsonb` | Tọa độ khung block theo pixel trên trang. |
| `bbox_normalized` | `jsonb` | Tọa độ khung đã chuẩn hóa theo tỷ lệ, tiện cho render và đồng bộ. |
| `polygon_px` | `jsonb` | Đa giác mô tả vùng block nếu OCR trả về vùng phức tạp hơn hình chữ nhật. |
| `type` | `text` | Loại block OCR theo phân loại của pipeline. |
| `editable` | `boolean` | Cho biết block này có thể đưa vào editor để chỉnh sửa hay không. |
| `layout_group_id` | `text` | Mã nhóm bố cục giúp gom các block liên quan với nhau. |
| `sequence` | `integer` | Thứ tự block trong trang hoặc trong luồng xử lý. |
| `suggested_json_path` | `text` | Gợi ý đường dẫn JSON mà block có thể ánh xạ tới. |
| `suggested_mapping_role` | `text` | Vai trò ánh xạ của block, ví dụ block chính hay block phụ. |
| `suggested_compose_strategy` | `compose_strategy` | Cách ghép block thành dữ liệu đầu ra, ví dụ nối dòng hoặc bullet list. |
| `suggested_parse_strategy` | `parse_strategy` | Cách phân tích block khi ghi ngược về JSON cấu trúc. |
| `mapping_confidence` | `numeric(5,4)` | Mức tự tin của bước gợi ý mapping. |

### 3.1.5.6. cv_layout_blocks

**Mô tả bảng:**  
Bảng `cv_layout_blocks` lưu các khối bố cục được phát hiện trên từng trang CV. Nếu `cv_ocr_blocks` tập trung vào văn bản, thì `cv_layout_blocks` tập trung vào cấu trúc hiển thị của tài liệu như khu vực tiêu đề, cột, vùng nội dung hoặc nhóm section.

Vai trò của bảng này là hỗ trợ bước hiểu bố cục của CV, từ đó giúp việc review OCR và dựng editable CV chính xác hơn. Trong nhiều trường hợp, việc biết block nào thuộc cột nào hoặc nằm trước sau ra sao quan trọng không kém việc đọc được chữ trong block đó.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của block bố cục. |
| `document_id` | `uuid` | Khóa ngoại tới `cv_documents.id`. |
| `page_id` | `uuid` | Khóa ngoại tới `cv_document_pages.id`. |
| `type` | `text` | Loại block bố cục được phát hiện. |
| `bbox_px` | `jsonb` | Tọa độ block theo pixel. |
| `bbox_normalized` | `jsonb` | Tọa độ block đã chuẩn hóa theo tỷ lệ. |
| `order_index` | `integer` | Thứ tự của block trong bố cục trang. |
| `metadata` | `jsonb` | Thông tin bổ sung về block, ví dụ thuộc tính phân nhóm hoặc dữ liệu phân tích thêm. |
| `created_at` | `timestamptz` | Thời điểm tạo block bố cục. |

### 3.1.5.7. document_file_versions

**Mô tả bảng:**  
Bảng `document_file_versions` dùng để lưu các phiên bản tệp nguồn của một `cv_documents`. Đây là bảng phục vụ source document editor và quản lý vòng đời file gốc. Khi người dùng tải lên file ban đầu, khi pipeline chuẩn hóa lại file, hoặc khi người dùng chỉnh sửa file nguồn bằng editor, hệ thống đều có thể tạo thêm một version mới trong bảng này.

Vai trò của bảng đặc biệt quan trọng ở chỗ nó giúp hệ thống biết phiên bản nào là bản gốc, phiên bản nào là bản mới nhất và phiên bản nào đã được parse gần nhất. Nhờ đó, TalentFlow có thể phát hiện tình huống file đã thay đổi sau khi parse và đưa ra gợi ý reparse hợp lý.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của phiên bản tệp. |
| `document_id` | `uuid` | Khóa ngoại tới `cv_documents.id`. |
| `version_number` | `integer` | Số phiên bản của tệp trong vòng đời tài liệu. |
| `file_type` | `text` | Loại tệp nguồn, hiện kiểm soát bằng `pdf`, `word`, `image`. |
| `storage_bucket` | `text` | Bucket nơi lưu phiên bản tệp. |
| `storage_path` | `text` | Đường dẫn tệp trong storage. |
| `source` | `text` | Nguồn tạo ra phiên bản, ví dụ `upload`, `pipeline`, `edit`. |
| `based_on_version_id` | `uuid` | Khóa ngoại tự tham chiếu, chỉ phiên bản trước đó mà bản hiện tại dựa trên. |
| `created_by` | `uuid` | Người hoặc tác nhân đã tạo ra phiên bản mới. |
| `content_type` | `text` | MIME type của tệp. |
| `size_bytes` | `bigint` | Kích thước của phiên bản tệp. |
| `created_at` | `timestamptz` | Thời điểm tạo phiên bản. |

### 3.1.6.1. editable_cvs

**Mô tả bảng:**  
Bảng `editable_cvs` là điểm chuyển từ tài liệu CV đã import sang CV có thể chỉnh sửa trong hệ thống. Sau khi `cv_documents` hoàn thành một mức xử lý đủ dùng, dữ liệu parse sẽ được đưa sang `editable_cvs` để người dùng tiếp tục review, chỉnh sửa và lưu lại như một tài liệu làm việc.

Bảng này đồng thời giữ cả `parsed_json` ban đầu và `updated_json` sau khi người dùng sửa. Vì vậy, nó cho phép so sánh giữa dữ liệu hệ thống trích xuất ra và dữ liệu đã được người dùng xác nhận hoặc điều chỉnh. Đây là bảng trung tâm của khối editable CV.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của editable CV. |
| `user_id` | `uuid` | Người dùng sở hữu editable CV. |
| `document_id` | `uuid` | Khóa ngoại tới `cv_documents.id`, cho biết editable CV được tạo từ tài liệu nào. |
| `status` | `editable_cv_status` | Trạng thái của editable CV như `draft`, `ready`, `partial_ready`, `saving`, `failed`. |
| `parsed_json` | `jsonb` | Dữ liệu có cấu trúc ban đầu do pipeline tạo ra. |
| `updated_json` | `jsonb` | Dữ liệu đã được người dùng hoặc editor cập nhật lại. |
| `current_version_number` | `integer` | Phiên bản hiện tại của editable CV. |
| `autosave_revision` | `integer` | Số lần autosave hoặc revision nội bộ. |
| `last_client_mutation_id` | `text` | Mã mutation cuối từ client, hỗ trợ đồng bộ chỉnh sửa. |
| `last_saved_at` | `timestamptz` | Lần cuối editable CV được lưu. |
| `created_at` | `timestamptz` | Thời điểm tạo editable CV. |
| `updated_at` | `timestamptz` | Thời điểm cập nhật gần nhất. |

### 3.1.6.2. editable_cv_pages

**Mô tả bảng:**  
Bảng `editable_cv_pages` lưu thông tin từng trang trong không gian editable CV. Bảng này kế thừa dữ liệu từ `cv_document_pages`, nhưng chuyển sang ngữ cảnh chỉnh sửa để editor có thể dựng trang nền, giữ đúng kích thước và phân trang của tài liệu gốc.

Thiết kế này giúp editable CV không bị tách rời khỏi bản gốc về mặt bố cục. Khi người dùng chỉnh sửa block trên trang, hệ thống vẫn biết block đó nằm trên trang nào và dựa trên ảnh nền nào của tài liệu gốc.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của trang trong editable CV. |
| `editable_cv_id` | `uuid` | Khóa ngoại tới `editable_cvs.id`. |
| `document_page_id` | `uuid` | Khóa ngoại tới `cv_document_pages.id`, chỉ trang nguồn tương ứng. |
| `page_number` | `integer` | Số thứ tự trang trong editable CV. |
| `canonical_width_px` | `integer` | Chiều rộng chuẩn hóa của trang. |
| `canonical_height_px` | `integer` | Chiều cao chuẩn hóa của trang. |
| `background_artifact_id` | `uuid` | Khóa ngoại tới `cv_document_artifacts.id`, dùng để hiển thị nền trang trong editor. |
| `created_at` | `timestamptz` | Thời điểm tạo bản ghi trang chỉnh sửa. |
| `updated_at` | `timestamptz` | Thời điểm cập nhật gần nhất. |

### 3.1.6.3. editable_cv_blocks

**Mô tả bảng:**  
Bảng `editable_cv_blocks` lưu các block có thể chỉnh sửa trong editable CV. Đây là nơi hệ thống quản lý phần văn bản hoặc thành phần hiển thị mà người dùng trực tiếp thao tác trong editor. Mỗi block gắn với một trang, có tọa độ hiển thị, nội dung gốc và nội dung đã chỉnh sửa.

Bảng này là cầu nối rõ nhất giữa OCR và editor. Các block có thể lấy nguồn từ `cv_ocr_blocks`, sau đó được người dùng sửa lại trong `edited_text`. Ngoài nội dung, bảng còn lưu style, asset đi kèm, trạng thái khóa chỉnh sửa và thứ tự sắp xếp block trong trang.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của block chỉnh sửa. |
| `editable_cv_id` | `uuid` | Khóa ngoại tới `editable_cvs.id`. |
| `page_id` | `uuid` | Khóa ngoại tới `editable_cv_pages.id`, cho biết block nằm ở trang nào. |
| `source_ocr_block_id` | `uuid` | Khóa ngoại tới `cv_ocr_blocks.id`, chỉ block OCR nguồn nếu block được sinh từ OCR. |
| `type` | `text` | Loại block chỉnh sửa. |
| `original_text` | `text` | Nội dung gốc trước khi người dùng chỉnh. |
| `edited_text` | `text` | Nội dung hiện tại sau khi chỉnh sửa. |
| `confidence` | `numeric(5,4)` | Độ tin cậy của block khi sinh từ OCR hoặc parse. |
| `bbox_px` | `jsonb` | Tọa độ block theo pixel. |
| `bbox_normalized` | `jsonb` | Tọa độ chuẩn hóa theo tỷ lệ. |
| `style_json` | `jsonb` | Cấu hình style của block như font, cỡ chữ, căn lề hoặc màu sắc. |
| `asset_artifact_id` | `uuid` | Khóa ngoại tới `cv_document_artifacts.id`, dùng cho tài nguyên đi kèm block nếu có. |
| `locked` | `boolean` | Cho biết block có bị khóa không cho chỉnh sửa hay không. |
| `sequence` | `integer` | Thứ tự block trong trang. |

### 3.1.6.4. editable_cv_block_mappings

**Mô tả bảng:**  
Bảng `editable_cv_block_mappings` mô tả quan hệ giữa block trên editor và đường dẫn dữ liệu trong JSON cấu trúc của CV. Đây là bảng rất quan trọng cho cơ chế đồng bộ hai chiều giữa giao diện chỉnh sửa và dữ liệu structured bên dưới.

Nhờ bảng này, hệ thống biết block nào đang ghi vào trường nào trong `updated_json`, block đó đóng vai trò chính hay phụ, và nên được ghép hoặc phân tích theo chiến lược nào. Điều này đặc biệt hữu ích khi một section của CV gồm nhiều block nhỏ nhưng vẫn phải gom lại thành một trường JSON có cấu trúc.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của bản ghi mapping. |
| `editable_cv_id` | `uuid` | Khóa ngoại tới `editable_cvs.id`. |
| `block_id` | `uuid` | Khóa ngoại tới `editable_cv_blocks.id`, cho biết mapping thuộc block nào. |
| `json_path` | `text` | Đường dẫn tới trường dữ liệu trong JSON cấu trúc của CV. |
| `mapping_role` | `text` | Vai trò của mapping, ví dụ trường chính hay trường phụ trong một nhóm dữ liệu. |
| `compose_strategy` | `compose_strategy` | Chiến lược ghép nội dung block thành dữ liệu JSON đầu ra. |
| `parse_strategy` | `parse_strategy` | Chiến lược phân tích dữ liệu JSON để ghi ngược ra block. |
| `sequence` | `integer` | Thứ tự áp dụng mapping khi có nhiều block cùng liên quan tới một trường. |
| `is_primary` | `boolean` | Đánh dấu block này có phải mapping chính cho đường dẫn JSON đó hay không. |
| `confidence` | `numeric(5,4)` | Mức tự tin của mapping do hệ thống gợi ý hoặc xác lập. |
| `metadata` | `jsonb` | Dữ liệu phụ trợ cho mapping, ví dụ thông tin về grouping hoặc rule xử lý. |

### 3.1.6.5. editable_cv_versions

**Mô tả bảng:**  
Bảng `editable_cv_versions` lưu lịch sử phiên bản của editable CV. Mỗi lần người dùng lưu mốc quan trọng hoặc hệ thống tạo snapshot, dữ liệu `updated_json`, block và bản đồ đồng bộ sẽ được ghi lại thành một version riêng.

Vai trò của bảng này là hỗ trợ khả năng phục hồi, so sánh thay đổi và quản lý lịch sử biên tập. Điều này giúp quá trình chỉnh sửa CV an toàn hơn, nhất là khi editable CV đã đi qua nhiều lần review hoặc chỉnh sửa từ nhiều bước khác nhau.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của phiên bản editable CV. |
| `editable_cv_id` | `uuid` | Khóa ngoại tới `editable_cvs.id`. |
| `version_number` | `integer` | Số thứ tự phiên bản. |
| `snapshot_updated_json` | `jsonb` | Bản chụp dữ liệu JSON đã cập nhật tại thời điểm tạo version. |
| `snapshot_blocks` | `jsonb` | Bản chụp các block chỉnh sửa ở thời điểm lưu version. |
| `snapshot_sync_map` | `jsonb` | Bản chụp cấu hình mapping giữa block và JSON. |
| `change_summary` | `text` | Tóm tắt ngắn về thay đổi của phiên bản này. |
| `restored_from_version_id` | `uuid` | Khóa ngoại tự tham chiếu, dùng khi version hiện tại được khôi phục từ một version cũ hơn. |
| `created_by` | `uuid` | Người tạo ra phiên bản. |
| `created_at` | `timestamptz` | Thời điểm tạo version. |

### 3.1.6.6. editable_cv_exports

**Mô tả bảng:**  
Bảng `editable_cv_exports` lưu thông tin các lần xuất bản editable CV ra tài liệu đầu ra, thường là PDF. Bảng này giúp nối phiên bản nội dung đang biên tập với artifact xuất bản tương ứng trong storage.

Trong luồng sử dụng, khi người dùng export CV, hệ thống không chỉ sinh file rồi trả về ngay, mà còn lưu lại mối liên hệ giữa version của editable CV với artifact đã xuất. Nhờ đó, có thể theo dõi lần export nào ứng với phiên bản nội dung nào.

**Các trường quan trọng**

| Tên trường | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|--------|
| `id` | `uuid` | Khóa chính của bản ghi export. |
| `editable_cv_id` | `uuid` | Khóa ngoại tới `editable_cvs.id`. |
| `version_number` | `integer` | Phiên bản editable CV được dùng để export. |
| `artifact_id` | `uuid` | Khóa ngoại tới `cv_document_artifacts.id`, chỉ artifact file export đã sinh ra. |
| `status` | `text` | Trạng thái của lần export, ví dụ đã sẵn sàng hay gặp lỗi. |
| `created_at` | `timestamptz` | Thời điểm tạo bản ghi export. |

---

## Ghi chú đối chiếu schema hiện tại

Tại thời điểm khảo sát, các bảng đang đọc được trong schema `public` gồm:

`activity_logs`, `application_events`, `applications`, `candidate_profiles`, `candidates`, `company_profiles`, `cv_document_artifacts`, `cv_document_pages`, `cv_document_stage_runs`, `cv_documents`, `cv_layout_blocks`, `cv_ocr_blocks`, `document_file_versions`, `editable_cv_block_mappings`, `editable_cv_blocks`, `editable_cv_exports`, `editable_cv_pages`, `editable_cv_versions`, `editable_cvs`, `employers`, `job_recommendations`, `jobs`, `notifications`, `profile_views`, `profiles`, `resumes`, `saved_jobs`, `templates`.

Các bảng cũ chỉ còn thấy trong migration lịch sử nhưng không còn tồn tại trong schema live hiện tại: `companies`, `cvs`.
