# Candidate Dashboard - Thiết kế chi tiết

> **Phiên bản:** 1.0
> **Ngày tạo:** 2026-02-05
> **Stack:** Next.js 15 + React 19 + Tailwind CSS v4 + Supabase
> **Quan hệ:** `docs/profile-builder-design.md` (Design System Base)

---

## 1. Tổng quan

### 1.1 Mục tiêu

Xây dựng **Candidate Dashboard** đóng vai trò là "Trung tâm chỉ huy" (Command Center) cho ứng viên.

- **Tổng hợp thông tin:** Hiển thị cái nhìn toàn cảnh về quá trình tìm việc (đơn nộp, phỏng vấn, hồ sơ).
- **Điều hướng thông minh:** Dẫn dắt người dùng đến các hành động quan trọng tiếp theo (hoàn thiện hồ sơ, xem việc làm mới, phản hồi nhà tuyển dụng).
- **Data-driven:** Mọi con số và nội dung đều được lấy từ Supabase, phản ánh đúng trạng thái thực tế.
- **Handling Empty States:** Trải nghiệm Onboarding mượt mà cho người dùng mới chưa có dữ liệu.

### 1.2 Inspiration

- **Dribbble/Behance Dashboards:** Modern, clean, card-based layout.
- **Glassdoor/LinkedIn User Home:** Personal overview + Feed.
- **Swiss International Style:** Typography lớn, rõ ràng, lưới layout chặt chẽ (đang áp dụng cho toàn dự án).

---

## 2. Kiến trúc UI

Layout sử dụng hệ thống Grid 12 cột (trên Desktop), chia làm 2 khu vực chính: Main Content (8 cột) và Side Widgets (4 cột).

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER BAR (Global Nav)                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  WELCOME HEADER: [Avatar] Xin chào, User!                         │  │
│  │  "Bạn có 2 thông báo mới..."          [🔍 Tìm việc] [✏️ Sửa CV]   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐                          │
│  │ STATS │   │ STATS │   │ STATS │   │ STATS │                          │
│  │ Tổng  │   │ Views │   │ P.Vấn │   │ Saved │                          │
│  └───────┘   └───────┘   └───────┘   └───────┘                          │
│                                                                         │
│  ┌──────────────────────────────┐    ┌────────────────────────────────┐ │
│  │ MAIN COLUMN (Col-8)          │    │ SIDE COLUMN (Col-4)            │ │
│  │                              │    │                                │ │
│  │ ┌──────────────────────────┐ │    │ ┌────────────────────────────┐ │ │
│  │ │ 📂 RECENT APPLICATIONS   │ │    │ │ 💪 PROFILE STRENGTH        │ │ │
│  │ │ (Table/List)             │ │    │ │ [=======70%======]         │ │ │
│  │ │ Item 1 | Status          │ │    │ │ CTA: Bổ sung Portfolio     │ │ │
│  │ │ Item 2 | Status          │ │    │ └────────────────────────────┘ │ │
│  │ │ ...                      │ │    │                                │ │
│  │ └──────────────────────────┘ │    │ ┌────────────────────────────┐ │ │
│  │                              │    │ │ 📄 MY CVS                  │ │ │
│  │ ┌──────────────────────────┐ │    │ │ CV FE Dev    [Edit]        │ │ │
│  │ │ 💼 RECOMMENDED JOBS      │ │    │ │ CV UI/UX     [Edit]        │ │ │
│  │ │ (Grid/Carousel)          │ │    │ │ [+ Tạo mới]                │ │ │
│  │ │ [Job Card 1] [Job Card 2]│ │    │ └────────────────────────────┘ │ │
│  │ └──────────────────────────┘ │    │                                │ │
│  │                              │    │ ┌────────────────────────────┐ │ │
│  │                              │    │ │ 💎 UPGRADE PRO             │ │ │
│  │                              │    │ │ Banner Gradient            │ │ │
│  │                              │    │ └────────────────────────────┘ │ │
│  └──────────────────────────────┘    └────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Chi tiết Blocks & Widgets

### 3.1 Welcome Header

- **Vị trí:** Top full-width.
- **Data:**
  - `user.user_metadata.full_name` hoặc `email`.
  - Số lượng notification chưa đọc (count from `notifications` table).
  - Số lượng việc làm mới phù hợp (count from `job_matches` view).
- **Actions:**
  - Button "Tìm việc ngay" -> `/jobs`
  - Button "Cập nhật CV" -> `/candidate/cv-builder`

### 3.2 Stats Cards (4 Items)

Hiển thị 4 chỉ số quan trọng, lấy dữ liệu realtime hoặc cached.

| Label            | Data Source           | Logic                                      | Empty State  |
| ---------------- | --------------------- | ------------------------------------------ | ------------ |
| **Tổng đơn nộp** | `applications` table  | Count rows `where candidate_id = user_id`  | Hiển thị "0" |
| **NTD đã xem**   | `profile_views` table | Count unique views                         | Hiển thị "0" |
| **Phỏng vấn**    | `applications` table  | Count rows `where status = 'interviewing'` | Hiển thị "0" |
| **Việc đã lưu**  | `saved_jobs` table    | Count rows                                 | Hiển thị "0" |

### 3.3 Recent Applications Widget

- **Loại:** Table hoặc List.
- **Columns:**
  - Công ty (Logo + Tên).
  - Vị trí (Job Title).
  - Ngày nộp (Format: DD/MM/YYYY).
  - Trạng thái (Badge: Sent, Viewed, Interview, Offer, Rejected).
- **Limit:** 5 items gần nhất.
- **See All:** Link tới `/candidate/applications`.
- **Empty State:**
  - Image: Empty Box Illustration.
  - Text: "Bạn chưa ứng tuyển công việc nào."
  - CTA: "Khám phá việc làm ngay" (Link to `/jobs`).

### 3.4 Recommended Jobs (Gợi ý việc làm)

- **Loại:** Grid 2 cột hoặc Carousel.
- **Data Logic:**
  - Dựa trên `skills` trong Profile của user so khớp với `skills_required` của Job.
  - Hoặc hiển thị "Việc làm mới nhất" nếu chưa có Profile.
- **Card Content:** Logo, Job Title, Company, Location, Salary Badge.
- **Action:** Nút "Lưu" (Bookmark) và "Ứng tuyển nhanh".
- **Empty State:** Ẩn block này hoặc hiển thị "Việc làm hot trong tuần".

### 3.5 Profile Strength (Sức mạnh hồ sơ)

- **Loại:** Progress Card.
- **Logic tính điểm:**
  - Cơ bản (Name, Email, Phone): 30%
  - Có CV đính kèm: +20%
  - Có Experience Section: +20%
  - Có Skills Section: +15%
  - Có Education/Links: +15%
- **Display:** Progress Bar (CSS width transition).
- **Contextual CTA:** Dựa trên phần còn thiếu. VD: thiếu CV -> "Hãy tạo CV ngay".

### 3.6 My CVs Widget

- **Loại:** Simple List.
- **Content:** Tên CV, Ngày cập nhật lần cuối, Icon PDF/Web.
- **Actions:**
  - Nút Icon Edit -> Edit CV.
  - Nút "+" -> Tạo CV mới (Modal hoặc Redirect).
- **Empty State:** Card khuyến khích "Tạo CV chuyên nghiệp đầu tiên của bạn".

### 3.7 Upgrade Banner

- **Loại:** Static Promo Card.
- **Content:** Gradient background, Icon Diamond, Text "Nâng cấp tài khoản".
- **Mục đích:** Upsell các tính năng Premium (Đẩy top hồ sơ, Xem ai đã xem hồ sơ).

---

## 4. Supabase Integration

### 4.1 Schema Dependencies

Dashboard cần query từ nhiều bảng. Khuyến nghị sử dụng **Supabase RPC** hoặc **Views** để tổng hợp dữ liệu trong 1-2 requests để tối ưu performance.

#### Tables

1. `auth.users`: User meta.
2. `candidate_profiles`: Profile data (để tính % strength).
3. `applications`: Join `jobs` (để lấy title, company).
4. `saved_jobs`: Join `jobs`.
5. `cvs`: Danh sách CV của user.

### 4.2 Data Fetching Strategy

Sử dụng `Promise.all` để fetch song song server-side (nếu dùng Server Components) hoặc Client-side hook.

```typescript
// Ví dụ cấu trúc dữ liệu trả về cho Dashboard
interface DashboardData {
  user: UserProfile;
  stats: {
    applied: number;
    viewed: number;
    interviewing: number;
    saved: number;
  };
  recentApplications: ApplicationWithJob[];
  recommendedJobs: Job[];
  cvs: CV[];
  profileStrength: number;
}
```

### 4.3 Supabase Queries (Logic mổ xẻ)

- **Get Recent Applications:**

  ```sql
  select
    created_at, status,
    jobs (title, salary_range),
    companies (name, logo_url)
  from applications
  where candidate_id = $uid
  order by created_at desc
  limit 5
  ```

- **Get CVs:**
  ```sql
  select id, title, updated_at, thumbnail_url
  from cvs
  where user_id = $uid
  order by updated_at desc
  limit 3
  ```

---

## 5. UI/UX & Editing Rules

### 5.1 Khoảng cách & Typography (Swiss Style)

- **Spacing:** Sử dụng gap lớn (`gap-8`, `gap-12`) để tạo "nghỉ" cho mắt. Dashboard thường nhiều thông tin, cần tránh rối.
- **Typography:**
  - Headings (H2, H3): Font `Inter` hoặc `Plus Jakarta Sans`, weight `font-black` (900) hoặc `font-bold` (700). Tracking chặt (`tracking-tight`).
  - Body: Slate-500/600 cho text phụ, Slate-900 cho thông tin chính.
- **Border Radius:** `rounded-[32px]` hoặc `rounded-[40px]` (Super-ellipse feel) để đồng bộ với design system hiện tại.

### 5.2 Responsive Behavior

- **Mobile (< 640px):**
  - Tất cả chuyển về 1 cột.
  - Stats Cards: Có thể chuyển thành Grid 2x2.
  - Ẩn bớt các cột trong bảng Recent Applications (chỉ hiện Tên Job + Trạng thái).
- **Tablet (640px - 1024px):**
  - Side Widgets có thể đẩy xuống dưới hoặc giữ layout 2 cột (Main) - 1 cột (Side) nếu đủ chỗ.
- **Desktop (> 1024px):**
  - Layout chuẩn 8/4 cột.

### 5.3 Loading States (Skeleton)

Để tránh Layout Shift (CLS), bắt buộc dùng **Skeleton** khi đang fetch data.

- **Stats:** 4 ô vuông xám nhấp nháy.
- **Table:** 3 dòng kẻ xám.
- **Chart/Widgets:** Khung bo tròn xám.

---

## 6. Edge Cases & Layout Optimization

| Scenario               | Hành vi hệ thống                | UX Handle                                                                                                                            |
| ---------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **New User (No Data)** | Trả về mảng rỗng cho Apps, CVs. | Hiển thị **Onboarding Mode**: Thay vì hiện bảng trống, hiện Checklist "3 bước để bắt đầu": 1. Tạo CV, 2. Điền Profile, 3. Ứng tuyển. |
| **Partial Data**       | Có Profile nhưng chưa nộp đơn.  | Stats hiện 0. Application Widget hiện Empty State với nút "Tìm việc". Profile Widget hiện % cao.                                     |
| **Error Fetching**     | Supabase timeout/error.         | Hiện Toast error "Không thể tải dữ liệu". Giữ UI Skeleton hoặc hiện nút "Thử lại".                                                   |
| **Long Content**       | Job Title quá dài.              | Sử dụng `truncate` css class, hiện tooltip khi hover.                                                                                |

---

## 7. Next Steps for Implementation

1.  **Database:** Đảm bảo các bảng `applications`, `jobs`, `cvs` đã có dữ liệu mẫu để test.
2.  **Mock Components:** Tạo trước các Skeleton components.
3.  **Data Hooks:** Viết hook `useCandidateDashboard()` tổng hợp các calls Supabase.
4.  **Integration:** Thay thế hardcode data trong `page.tsx` bằng real data từ hook.
