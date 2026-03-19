# Hướng dẫn seed local

## File seed
- `supabase/seed/local_canonical_seed.sql`

## Cách chạy
1. Reset local database hoặc mở SQL editor của Supabase local.
2. Chạy toàn bộ file `supabase/seed/local_canonical_seed.sql`.
3. Restart dev server.
4. Đăng nhập bằng một trong các tài khoản seed:
   - `hr@talentflow.local` / `Password123!`
   - `candidate1@talentflow.local` / `Password123!`
   - `candidate2@talentflow.local` / `Password123!`
   - `candidate3@talentflow.local` / `Password123!`

## Mục tiêu test nhanh

### Public
- `/`
- `/jobs`
- `/jobs/job-fullstack-talentflow-001`
- `/companies`

### Candidate
- `/candidate/dashboard`
- `/candidate/profile`
- `/candidate/applications`
- `/candidate/cv-builder`

### HR
- `/hr/dashboard`
- `/hr/jobs`
- `/hr/company`
- `/hr/candidates`

## Ghi chú
- Seed chỉ tạo metadata CV, không có file nhị phân trong storage bucket.
- Nếu cần test upload/download CV thực, hãy đăng nhập candidate và tải CV mới từ UI.
