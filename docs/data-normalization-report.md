# Báo cáo chuẩn hóa dữ liệu toàn hệ thống

## 1. Vấn đề đồng bộ đã xác nhận

### Public
- Trang chủ cũ dùng card việc làm hardcode, không phản ánh dữ liệu `jobs`/`employers`.
- Có route legacy `/api/[id]` đọc trực tiếp `src/data/jobs.json`.
- `GET /api/jobs` trước đây query raw DB và trả shape khác service `src/lib/jobs.ts`.
- Một số màn public vẫn đang dùng DTO public kiểu cũ `src/types/job.ts` với `snake_case`.

### Candidate
- Dashboard và danh sách ứng tuyển đang query Supabase trực tiếp ở client qua:
  - `src/hooks/useCandidateDashboard.ts`
  - `src/hooks/useCandidateApplications.ts`
- `src/types/dashboard.ts` là contract song song với `candidate_profiles`, `applications`, `resumes`.
- Route gợi ý việc làm từng đọc `candidate_profiles.document` và bảng `cvs`, không còn phù hợp với contract mới.
- Status ứng tuyển bị normalize nhiều nơi, dễ lệch giữa list, detail, dashboard và HR.

### HR
- `RecruitmentPipelineStatus` cũ để song song `new` với `applied`, làm lệch pipeline thật.
- Trang lịch phỏng vấn là mock UI, không có schema thực phía sau.
- Có file bell notification legacy `NotificationBellAdvanced.tsx` bám schema cũ `user_id/read`.

## 2. Quy ước contract chuẩn sau refactor

### CandidateProfile
- Nguồn chuẩn: `public.candidate_profiles`
- Contract runtime: `src/types/candidate-profile.ts`
- Không dùng `candidate_profiles.document` trong production path mới.

### CompanyProfile
- Nguồn chuẩn: `public.employers`
- Company branding public được merge xuống public jobs qua `src/lib/jobs.ts`
- Update hồ sơ công ty sync branding xuống `jobs` qua `src/lib/recruitment.ts`

### JobPost
- Public source: `src/lib/jobs.ts`
- HR source: `src/lib/recruitment.ts`
- Quy tắc hiển thị public: chỉ lấy job `status = open` và `is_public_visible = true`

### JobApplication
- Nguồn chuẩn: `public.applications`
- Snapshot ứng tuyển giữ riêng trong application:
  - `full_name`
  - `email`
  - `phone`
  - `introduction`
  - `cv_file_path`
  - `cv_file_url`
  - `applied_at`
- Candidate sửa hồ sơ không được ghi đè snapshot cũ của application

### Resume / CV
- CV Builder chuẩn: `public.resumes.resume_data`
- CV ứng tuyển chuẩn: `applications.cv_file_path` / `applications.cv_file_url`
- CV hồ sơ ứng viên: `candidate_profiles.cv_file_path` / `candidate_profiles.cv_url`

### Notification
- Nguồn chuẩn: `public.notifications`
- Contract đang dùng:
  - `recipient_id`
  - `actor_id`
  - `type`
  - `title`
  - `description`
  - `href`
  - `metadata`
  - `is_read`

### Pipeline / status
- Canonical status runtime:
  - `applied`
  - `reviewing`
  - `interview`
  - `offer`
  - `hired`
  - `rejected`
- Legacy status `pending / viewed / interviewing / offered / new` chỉ còn được map ở adapter/service.

## 3. File / khu vực đã được chỉnh

### Contract / type
- `src/types/candidate-dashboard.ts`
- `src/types/recruitment.ts`
- `src/types/dashboard.ts`

### Service / mapping
- `src/lib/applications.ts`
- `src/lib/candidate-dashboard.ts`
- `src/lib/recruitment.ts`
- `src/lib/recommend/candidate-text.ts`
- `src/app/api/recommend-jobs/route.ts`
- `src/app/api/jobs/route.ts`
- `src/app/api/[id]/route.ts`

### Candidate
- `src/app/candidate/dashboard/page.tsx`
- `src/app/candidate/applications/page.tsx`
- `src/components/candidate/CandidateApplicationsView.tsx`
- `src/app/candidate/dashboard/components/WelcomeHeader.tsx`
- `src/app/candidate/dashboard/components/StatsGrid.tsx`
- `src/app/candidate/dashboard/components/RecentApplications.tsx`
- `src/app/candidate/dashboard/components/ProfileStrength.tsx`
- `src/app/candidate/dashboard/components/CVList.tsx`
- `src/app/candidate/dashboard/components/RecommendedJobs.tsx`

### HR
- `src/components/recruitment/CandidateTable.tsx`
- `src/components/recruitment/StatusBadge.tsx`
- `src/app/hr/calendar/page.tsx`

### Public
- `src/app/(public)/page.tsx`

### Seed / docs
- `supabase/seed/local_canonical_seed.sql`
- `docs/data-normalization-report.md`

## 4. Mock / hardcode / legacy đã được rút khỏi production path

- Bỏ featured jobs hardcode ở trang chủ.
- Route `/api/[id]` không còn đọc `src/data/jobs.json`; hiện trả `410 Gone`.
- `GET /api/jobs` không còn trả raw row khác shape service, mà dùng cùng nguồn `src/lib/jobs.ts`.
- Route AI recommend không còn đọc `candidate_profiles.document` hay bảng `cvs`.
- HR calendar mock không còn hiển thị như dữ liệu thật.
- `NotificationBellAdvanced.tsx` đã bị loại khỏi codebase runtime.

## 5. Seed data local

File seed: `supabase/seed/local_canonical_seed.sql`

Bao gồm:
- 1 công ty HR đầy đủ hồ sơ public
- 5 job post với trạng thái `open / draft / closed`
- 3 candidate profile
- 3 resume builder record
- 5 application với nhiều trạng thái khác nhau
- application events
- notifications
- saved jobs
- profile views
- activity logs

Lưu ý:
- File seed chỉ seed metadata CV qua `cv_file_url`, không seed file binary vào bucket storage.
- Nếu muốn test upload/download CV thật, hãy upload lại từ giao diện sau khi seed.

## 6. Checklist nghiệm thu

- [x] Public dùng dữ liệu thật cho trang chủ
- [x] Public API list/detail không còn route mock chính
- [x] Candidate dashboard đọc từ service server-side
- [x] Candidate applications list đọc từ service server-side
- [x] Candidate recommendation flow dùng flat ATS profile + resumes
- [x] HR calendar không còn mock production path
- [x] Notification runtime chỉ còn schema mới
- [x] Status canonical đã thống nhất ở runtime chính
- [x] Seed data local đã có cho Public / Candidate / HR

## 7. Điểm cần lưu ý về sau

- Khi thêm field mới cho candidate/job/company/application, cập nhật theo thứ tự:
  1. migration / schema
  2. service `src/lib/*`
  3. type ở `src/types/*`
  4. page/component
  5. seed SQL
- Không query raw Supabase trực tiếp trong page client nếu đã có service chuẩn ở `src/lib`.
- Không tái sử dụng `candidate_profiles.document` cho flow production mới.
- Nếu cần giữ legacy field trong thời gian chuyển đổi, chỉ giữ ở service adapter, không map thẳng trong UI.
