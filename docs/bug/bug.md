# SYSTEM OVERVIEW (CODE) — Recruitment Platform

> Tài liệu tổng quan **kỹ thuật** dựa trên việc đọc trực tiếp `src/`. Khác với `systemoverview.md` (tài liệu báo cáo / luận văn), file này tập trung vào: kiến trúc code, sơ đồ thư mục, danh mục API, luồng auth/CV/ATS, và **danh sách bug / code smell** cần fix.
>
> Ngày scan: theo state hiện tại của worktree `recruitment-platform-0066336f`.
> Tổng số file `.ts` / `.tsx` trong `src/`: **509**.

---

## 1. Stack & cấu hình

| Lớp | Công nghệ |
|---|---|
| Framework | **Next.js 16.2** (App Router, `output: "standalone"`, dev: `--turbopack`, build: `--webpack`) |
| Runtime FE | **React 19.2.3** |
| Styling | TailwindCSS v4 (`@tailwindcss/postcss`), PostCSS, `tailwind-merge`, `clsx` |
| State (client) | **Zustand 5** + `react-hook-form` + `zod` |
| BaaS / DB | **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) — Auth + Postgres + Storage + Realtime |
| AI / OCR | **OpenAI**, **HuggingFace Inference**, **Gemini** (custom `lib/gemini.ts`), **PaddleOCR** (proxy upstream) |
| MCP / extra | `@modelcontextprotocol/sdk`, MongoDB driver (chưa rõ dùng đâu trong source) |
| Editor / CV | TipTap 3, `@react-pdf/renderer`, `react-pdf`, `pdfjs-dist`, `mammoth`, `docx-preview`, `jspdf`, **Apryse WebViewer (`@pdftron/webviewer` ^11.11)** — self-hosted ở `public/webviewer/` (~181MB), OnlyOffice (callback) |
| UI/UX | `framer-motion`, `lucide-react`, `recharts`, `react-grid-layout`, `@dnd-kit/*` |
| Email | `nodemailer` (+ test inbox), templates trong `src/lib/email/` |
| Image hosting | Cloudinary (`src/lib/cloudinary.ts`) |
| Tests | Node `assert/strict` + `tsx` runner (không dùng Jest/Vitest) |
| Lint | `eslint-config-next` 16.1.6 |
| Package manager | npm (`package-lock.json`) |

Cấu hình đáng chú ý trong `@/next.config.ts:1-87`:
- `output: "standalone"` — build cho Docker.
- Nhánh dev Docker tinh chỉnh `webpack.watchOptions` (poll 1000ms) khi `DOCKER_DEV=true`.
- `images.remotePatterns` cho `careerviet.vn`, `cloudinary`, `unsplash`, `placehold.co`,…

---

## 2. Sơ đồ thư mục `src/`

```
src/
├── app/                         # Next App Router
│   ├── (auth)/                  # Group: login, register, role-selection (server actions)
│   ├── (public)/                # Group public: trang chủ, /jobs, /companies, /contact, /hr-home
│   ├── actions/                 # Server actions AI (ai-actions.ts ~35KB)
│   ├── api/                     # 60+ route handlers (xem mục 4)
│   ├── applications/, auth/     # routes phụ (auth/callback - LEGACY, xem Bug #1)
│   ├── candidate/               # Workspace ứng viên: cv-builder, profile, jobs, applications, dashboard, settings, templates
│   ├── hr/                      # Workspace HR: jobs, candidates, dashboard, calendar, company, notifications, settings
│   ├── documents/[documentId]/  # Document viewer/editor
│   ├── email-testing/           # Inbox giả lập email (dev tool)
│   ├── test-ai/                 # Trang thử AI
│   ├── layout.tsx               # Root layout (Manrope + Material Symbols)
│   └── globals.css
│
├── components/
│   ├── app-shell/               # Khung layout chung
│   ├── candidate/, hr/, hr-home/, recruitment/   # Domain components
│   ├── companies/, jobs/        # Card / list / filter
│   ├── cv/                      # Templates + gallery CV
│   ├── editor/                  # WordEditor (OnlyOffice/PDF), pdfEditorRuntime
│   ├── email-testing/, workspace/
│   ├── shared/                  # Navbar, NotificationBell, header model
│   └── ui/                      # Button, Card,… (shadcn-ish)
│
├── features/
│   ├── cv-import/               # Pipeline import CV: api, components, review, store, sync, transforms, normalize-parsed-json.ts (~22KB)
│   └── ocr-viewer/              # OCR viewer + hooks + services + utils (semantic merging, mapped sections)
│
├── lib/                         # Logic server-only (~40 file)
│   ├── applications.ts (59KB)   # Apply-to-job, list, status update, email
│   ├── recruitment.ts (40KB)    # CRUD job, candidate pipeline, company profile
│   ├── editable-cvs.ts (44KB)   # Editable CV blocks, versions, restore
│   ├── jobs.ts (23KB), candidate-profiles.ts (24KB), cv-imports.ts (20KB)
│   ├── companies.ts, candidate-dashboard.ts, candidate-cv-options.ts
│   ├── recruiter-candidate-contact.ts, notifications.ts, public-job-summaries.ts
│   ├── client/                  # client-only helpers
│   ├── editor/                  # metadata, versioning (OnlyOffice flow)
│   ├── email/                   # nodemailer + templates
│   ├── email-testing/           # routing & templates cho inbox giả
│   ├── recommend/               # Recommend job engine
│   ├── url/                     # canonical-origin
│   ├── gemini.ts, observability.ts, cloudinary.ts, viewer.ts
│   └── ...
│
├── utils/supabase/              # client.ts / server.ts / admin.ts / middleware.ts (helper, KHÔNG phải Next middleware) / auth-helpers.ts
├── hooks/                       # useCandidateApplications, useCandidateDashboard
├── config/                      # navigation.ts (workspace nav)
├── data/                        # static suggestions
├── types/                       # TS types (recruitment, dashboard, cv-import, …)
└── proxy.ts                     # ⚠️ Next 16 "proxy" (replacement của middleware.ts) — gọi updateSession
```

Khoảng **30 file `*.test.ts`** rải rác (test bằng `node:assert`, chạy qua `tsx`).

---

## 3. Routing (App Router) — high level

| Group / Path | Loại | Mô tả |
|---|---|---|
| `(public)/` | Public pages | `/` (home), `/jobs`, `/jobs/[id]`, `/companies`, `/companies/[slug]`, `/contact`, `/hr-home` |
| `(auth)/` | Auth | `/login`, `/register`, `/role-selection` (form + server actions trong `actions.ts`) |
| `/auth/callback` | Route handler | OAuth/email callback Supabase **(LEGACY — xem Bug #1)** |
| `/candidate/...` | Authenticated | Dashboard, CV builder (rất phức tạp), profile, jobs (applied/saved/recommended), settings, templates |
| `/hr/...` | Authenticated | Dashboard, jobs CRUD, candidates pipeline, calendar, company profile, notifications, settings |
| `/documents/[documentId]` | Viewer | View / edit CV/document (PDF + OnlyOffice) |
| `/email-testing/...` | Dev tool | Inbox giả, accounts (test SMTP) |
| `/test-ai` | Dev tool | Thử AI prompt |
| `/applications/...` | (mỏng) | Một số redirect/proxy |

`proxy.ts` matcher: `'/'`, `'/candidate/:path*'`, `'/hr/:path*'`, `'/profile/:path*'`, `'/login'`, `'/register/:path*'`, `'/role-selection'`.

---

## 4. API Routes (60 files dưới `src/app/api/`)

Nhóm chính (xem `@/src/app/api`):

- **AI**: `ai/optimize-content`, `ai/prepare-preview`, `ai/preview/[previewId]`, `ai/upload-cv`
- **Auth**: `auth/callback` (đối chứng với `/auth/callback` ở mục 1 → trùng)
- **Applications**: `applications` (POST), `applications/[id]` (GET/PUT), `applications/[id]/cv`, `applications/[id]/status`, `apply-job` (re-export `POST` từ `applications/route.ts`)
- **Candidate**: `candidate/applications`, `candidate/applications/[id]`, `candidate/cv-options`, `candidate/dashboard`, `candidate/profile`, `candidate/profile/avatar`, `candidate/profile/cv`
- **Recruiter / HR**: `recruiter/applications`, `recruiter/applications/[applicationId]`, `recruiter/applications/[applicationId]/view`, `recruiter/candidates/search`, `recruiter/candidates/[candidateId]`
- **CV Builder**: `cv-builder/resumes`, `cv-builder/resumes/[id]`, `cv-builder/templates`, `cv-builder/templates/[id]`
- **CV Import (OCR pipeline)**: `cv-imports`, `cv-imports/[documentId]`, `.../analyze`, `.../retry`, `.../save-editable`, `.../save-original`
- **Editable CVs**: `editable-cvs/[editableCvId]`, `.../blocks/[blockId]`, `.../blocks/[blockId]/asset`, `.../export`, `.../json`, `.../restore-version`, `.../versions`
- **Documents**: `documents/[documentId]/editor-metadata`, `.../editor-save`, `onlyoffice/callback` (OnlyOffice document server callback)
- **Paddle OCR**: `paddle-ocr/sync`, `paddle-ocr/async/jobs`, `paddle-ocr/async/jobs/[jobId]`, `paddle-ocr/result` (proxy lên `c2yeg2d9zfnduff0.aistudio-app.com/layout-parsing`)
- **Jobs / Companies / Candidates**: `jobs`, `jobs/[id]`, `companies`, `candidates/public`, `candidates/[candidateId]`
- **Khác**: `notifications`, `recommend-jobs`, `send-email`, `test-inbox`, `uploads/image`, `health`, `fake-accounts`, `fake-accounts/seed`, `fake-accounts/sync-recruitment`, `[id]/route.ts` (catch-all generic ⚠️ xem Bug #4)

---

## 5. Luồng nghiệp vụ chính

### 5.1 Auth flow

1. **Đăng ký** (`@/src/app/(auth)/actions.ts:31-88`):
   - `supabase.auth.signUp({...})` với `emailRedirectTo: ${origin}/auth/callback`.
   - Sau đó gọi RPC `create_profile_for_user` để tạo `profiles` row (bypass RLS khi chưa có session).
   - Nếu có `data.session` → `redirect('/')`. Ngược lại trả về `{success, email}` để FE bật bước OTP.
2. **Verify OTP** (`verifyOtp(email, token, type:'signup')`) → redirect `/`.
3. **Login** (`login(formData)`) → `signInWithPassword` → `redirect('/')`.
4. **Middleware (Next 16 `proxy.ts`)** (`@/src/proxy.ts`, `@/src/utils/supabase/middleware.ts`):
   - Nếu chưa có cookie auth + path protected (`/candidate|/hr|/profile`) → redirect `/login`.
   - Nếu user đã login mà vào `/login` hoặc `/register` → redirect `/`.
   - Nếu `path === '/'` và user là HR → redirect `/hr-home`.
   - `/role-selection`: yêu cầu login + chưa có role.
5. **Callback OAuth/email** — **TỒN TẠI 2 ROUTE TRÙNG**:
   - `@/src/app/auth/callback/route.ts:1-52` (legacy: insert profiles trực tiếp, redirect `/role-selection`).
   - `@/src/app/api/auth/callback/route.ts:1-33` (mới: `/${profile.role}/dashboard`).
   - `signup` đang trỏ tới `/auth/callback` (legacy). Xem **Bug #1**.

### 5.2 Apply-to-job

`@/src/app/api/applications/route.ts:39-135` → `applyToJob()` trong `@/src/lib/applications.ts:692+`.
- Validate: `job_id`, `full_name`, ít nhất `email` hoặc `phone`, `introduction`, có 1 trong 3: `cv_file` upload | `existing_cv_path` | `builder_resume_id`.
- Giới hạn file: ≤ 10MB, MIME: `application/pdf | msword | docx`.
- Trả về kèm trạng thái email (candidate + recruiter), bucket `cv_uploads`.
- `apply-job/route.ts` chỉ re-export `POST` từ `applications/route.ts` (alias cho FE cũ).

### 5.3 CV Import + OCR pipeline

`@/src/app/api/cv-imports/route.ts:28-69`:
- Yêu cầu user authenticated (Supabase).
- Accept: PDF, JPG/PNG/WEBP, DOCX. Max 50MB.
- `createCVImportFromUpload(user.id, file, {startProcessing})` (trong `@/src/lib/cv-imports.ts`).
- Sub-routes `[documentId]/analyze|retry|save-editable|save-original` để điều khiển pipeline.
- OCR upstream: PaddleOCR sync (`/layout-parsing`) qua `paddle-ocr/sync` (proxy + auth token từ env `PADDLE_OCR_SYNC_TOKEN`).
- Sau OCR → `features/cv-import/normalize-parsed-json.ts` (~22KB) chuẩn hóa thành CV JSON có `mapped_sections`.

### 5.4 Editable CV (block-based editor)

- `@/src/lib/editable-cvs.ts` (~44KB): block CRUD, version snapshot, restore.
- API `editable-cvs/[editableCvId]/blocks/[blockId]` (PATCH/PUT/DELETE), `/asset` (upload ảnh), `/export`, `/restore-version`, `/versions`.
- UI: `features/cv-import/components/EditableCVEditor.tsx` + `app/candidate/cv-builder/...`.
- Document workflow alternative: OnlyOffice (`api/documents/[documentId]/editor-metadata|editor-save`, callback `api/onlyoffice/callback`). JWT/config TODO trong `@/src/lib/editor/metadata.ts:230`.

### 5.5 Recruitment / ATS

- `@/src/lib/recruitment.ts` (~41KB): jobs CRUD, candidate pipeline (Kanban), company profile.
- HR server actions: `@/src/app/hr/actions.ts:94-158` — không kiểm tra role/auth ở action layer mà ủy quyền cho `lib/recruitment.ts` (cần verify lib enforce auth).
- Job board public: `lib/public-job-summaries.ts` (fast path), `lib/jobs.ts` (full search). API `jobs?q=&...&sort=newest` có cache `s-maxage=60, stale-while-revalidate=300`.

### 5.6 PDF Editor (Apryse / PDFTron WebViewer) — mảng phức tạp nhất

> **Apryse** (tên cũ **PDFTron**) là engine PDF thương mại. Trong dự án, `@pdftron/webviewer` được self-host: thư mục `@/public/webviewer/core` + `@/public/webviewer/ui` chiếm khoảng **181MB** (gồm WASM, JS workers, fonts, i18n cho ~25 ngôn ngữ).

**Cấu trúc**:
- `@/src/components/editor/PdfEditor.tsx` (406 dòng) — React component, 3 mode: `edit_all | edit_text | edit_image`. Sử dụng `import('@pdftron/webviewer')` lazy.
- `@/src/components/editor/pdfEditorRuntime.ts` (**1768 dòng**) — lớp DOM/WASM integration: gọi `Core.PDFNet.ContentReplacer`, `ElementReader`, `Image.createFromURL`, `Rect.init`; quản lý ContentEditManager (Iceni galley), repair text bounding box, network guard chặn telemetry Apryse, unhandled-rejection guard, image replacement.
- `@/src/components/editor/pdfEditability.ts` — phân tích trước file PDF có lớp text thật hay là **scan_like** (PDF flatten/ảnh) → quyết định cho phép edit trực tiếp hay redirect sang "structured editor" (`/candidate/cv-builder?importReview=...`).
- `@/src/components/editor/PdfEditabilityBanner.tsx` — UI cảnh báo người dùng.
- `@/src/components/editor/pdfEditability.test.ts` + `pdfEditorRuntime.test.ts` — tests.
- Config từ env qua `@/src/lib/editor/metadata.ts:208-224`: `APRYSE_LICENSE_KEY`, `APRYSE_WEBVIEWER_PATH` (default `/webviewer`). Nếu thiếu license → Apryse chạy **demo mode (đóng dấu watermark)**.

**Workflow**:
1. User mở `/documents/[documentId]/edit` → `PdfEditor` mount.
2. Lazy import `@pdftron/webviewer` → init WebViewer trong `viewerRef` div, fetch blob PDF (`fetchPdfSourceBlob`, `cache: "no-store"`).
3. Cài đặt 2 guard: `installApryseNetworkGuards` (chặn beacon/fetch tới `pws-collect.apryse.com`, `pws-collect.pdftron.com`), `installApryseUnhandledRejectionGuard`.
4. Chạy `analyzePdfEditability` (sample tối đa 5 trang) → classify `fully_editable | partially_editable | scan_like`.
5. Bật ContentEdit (`startContentEditMode`), repair lại bounding box text bị flatten (logic phức tạp ở `tightenTextLineLayout`, line 903-998).
6. Save: export annotations XFDF + `doc.getFileData({flags: LINEARIZED, xfdfString})` → blob PDF mới → upload lên storage qua `onSave`.
7. Unmount: `disposePdfInstance` + `resetPdfViewerContainer` (chống leak).

**Quan ngại** (xem Bug #13 mới thêm bên dưới).

### 5.7 Email & notifications

- Email thật: `lib/email/application-emails.ts` (status/submitted templates) qua `nodemailer`.
- Test inbox: `lib/email-testing/` + UI `app/email-testing/inbox`.
- Push notifications: `lib/notifications.ts` + UI `components/shared/NotificationBellAdvanced.tsx` (subscribe Supabase Realtime).

---

## 6. Patterns đáng chú ý

- **Server Components + RSC fetch**: hầu hết page (`app/...page.tsx`) là async server components, gọi trực tiếp `lib/*`.
- **Zustand stores** ở client: `app/candidate/cv-builder/store.ts` (~27KB), `app/candidate/profile/stores/profileBuilderStore.ts`, `app/hr/company/stores/companyProfileBuilderStore.ts`.
- **Realtime**: `useCandidateApplications` subscribe 3 channels (applications/jobs/employers) cho 1 user (`@/src/hooks/useCandidateApplications.ts:54-90`).
- **Test runner DIY**: các file `*.test.ts` import bằng `require()` (kèm `eslint-disable @typescript-eslint/no-require-imports`), chạy bằng `tsx`. Không có suite chung.
- **`server-only` package** dùng đúng cách trong `lib/applications.ts`, `lib/editable-cv-export.tsx`.

---

## 7. BUG / CODE SMELL — Phát hiện được

> Mức độ: 🔴 nghiêm trọng · 🟠 vừa · 🟡 nhỏ / cosmetic

### 🔴 Bug #1 — TRÙNG `auth/callback` route, đường dẫn ngược nhau

- **File**:
  - `@/src/app/auth/callback/route.ts:1-52`
  - `@/src/app/api/auth/callback/route.ts:1-33`
- **Triệu chứng**:
  - Cả hai cùng tồn tại. `signup()` trong `@/src/app/(auth)/actions.ts:52` đặt `emailRedirectTo: ${origin}/auth/callback` → đi vào bản **legacy** (`/auth/callback`).
  - Bản legacy `INSERT` trực tiếp `profiles { role: null }` rồi redirect `/role-selection`. Bản mới `/api/auth/callback` lại redirect `/${role}/dashboard`.
  - Hệ quả: hành vi sau khi confirm email **không khớp** với hành vi mong đợi của middleware (vốn redirect `/` → `/hr-home` cho HR, không có `/hr/dashboard` flow).
  - Ngoài ra bản legacy trả về `/auth/auth-code-error` (trang **không tồn tại** trong router).

#### Kịch bản thực tế có thể xảy ra

| # | Kịch bản | Hệ quả |
|---|---|---|
| 1.A | **User HR mới** đăng ký bằng email, click link xác thực trong inbox. Link có dạng `https://app/auth/callback?code=...` (do `emailRedirectTo` trỏ vào legacy). | Legacy callback `INSERT { role: null }` → ghi đè profile đã được RPC `create_profile_for_user` set `role='hr'` ở bước signup → role bị **null hóa**. User bị đá về `/role-selection` mặc dù lúc đăng ký đã chọn HR. |
| 1.B | **Redirect lỗi**: code OAuth hết hạn / sai (`!error` fail). | Legacy redirect `${origin}/auth/auth-code-error` → **trang 404** (không có file `app/auth/auth-code-error/page.tsx`). User thấy 404 thay vì thông báo lỗi thân thiện. |
| 1.C | RLS chặn `INSERT profiles` (do session chưa active hoặc policy strict). | `await supabase.from('profiles').insert(...)` **không có error handling** → exception nuốt bởi Next route handler → user nhận 500 trắng tinh, không retry được. |
| 1.D | **OAuth provider** (Google/GitHub nếu bật sau này) auto-redirect về `/api/auth/callback` (theo cấu hình thường thấy của Supabase dashboard) trong khi email link lại trỏ về `/auth/callback`. | UX **phân mảnh**: cùng app nhưng landing page sau đăng nhập khác nhau (`/role-selection` vs `/${role}/dashboard`) tùy nguồn. QA khó tái hiện bug. |
| 1.E | Trong lúc deploy, nếu chỉ một trong hai route được build (vd Next tree-shake hay sai routing config), link xác thực email gửi từ trước sẽ **chết** sau khi deploy. | Tất cả user đăng ký trong khoảng 24h trước khi confirm phải đăng ký lại. |

- **Đề xuất**: Chốt 1 callback duy nhất. Khuyến nghị xóa `@/src/app/auth/callback/route.ts`, hoặc gộp logic vào `@/src/app/api/auth/callback/route.ts` và đổi `emailRedirectTo` sang `/api/auth/callback`. Tạo trang `/auth/auth-code-error` hoặc đổi redirect lỗi về `/login?error=...`.

### 🔴 Bug #2 — `signup` có thể rò rỉ tồn tại email + để lại tài khoản auth không có profile

- **File**: `@/src/app/(auth)/actions.ts:44-77`
- **Vấn đề**:
  1. Supabase v2 với "confirm email" bật sẽ trả về `data.user` mà **không** error khi email đã tồn tại → code coi như đăng ký thành công.
  2. Nếu RPC `create_profile_for_user` fail (line 64-76), function **trả về error string** nhưng auth user đã được tạo → trạng thái rách (auth có, profile không có). Lần đăng nhập kế tiếp sẽ gặp lỗi `.single()` ở callback.

#### Kịch bản thực tế có thể xảy ra

| # | Kịch bản | Hệ quả |
|---|---|---|
| 2.A | **Attacker** muốn dò email có đăng ký hệ thống chưa: thử signup từng email. | Email tồn tại → Supabase gửi email "resend confirmation" cho chủ thật + trả về `data.user`. Email **không** tồn tại → cũng `data.user`. UX nhìn giống nhau, nhưng **timing / email log** khác biệt → enumerate được toàn bộ user (privacy/security risk). |
| 2.B | **Mất kết nối DB tạm thời** giữa `auth.signUp` và RPC `create_profile_for_user` (network spike, RLS policy redeploy). | Auth user được tạo trên `auth.users`; RPC fail → `return { error: "..." }`. User retry → `signUp` báo "User already registered" → **kẹt cứng**, không thể đăng ký, cũng không thể login (chưa confirm email + chưa có profile). Cần admin support thủ công. |
| 2.C | RPC `create_profile_for_user` chưa được tạo trên DB (lỡ migration), hoặc rename. | Mọi signup đều rơi vào branch lỗi → toàn bộ tài khoản rác trên `auth.users`. Khó cleanup vì Supabase Auth admin UI không bulk-delete theo điều kiện. |
| 2.D | User confirm email sau đó (giả sử Bug #1 fixed). | Bản callback mới `(api/auth/callback)` gọi `.single()` lookup profile → throw → redirect `/login?error=failed`. User loop forever giữa email link và login page. |
| 2.E | Production gặp **email throttling** Supabase (free tier 3 email/h). | `signUp` thành công nhưng email không gửi → không có `error.message`. User thấy "check email" mà không có gì để check → bỏ về. Còn ở DB đã có 1 row auth + profile chờ. |

- **Đề xuất**: Detect duplicate email trước khi `signUp` (query `auth.users` qua admin RPC); nếu RPC profile fail → `createAdminClient().auth.admin.deleteUser(data.user.id)` để rollback, hoặc retry idempotent. Bọc trong try-catch tổng + logging.

### 🔴 Bug #3 — Auth callback dùng `.single()` thay vì `.maybeSingle()`

- **File**:
  - `@/src/app/api/auth/callback/route.ts:16-25`
  - `@/src/app/auth/callback/route.ts:21-25`
  - `@/src/utils/supabase/middleware.ts:117-121`
- **Vấn đề**: `.single()` ném lỗi `PGRST116` khi không có row. Trong middleware, lỗi sẽ làm `profile` thành `undefined` (do destructuring) — chấp nhận được — nhưng best practice là `.maybeSingle()` để tránh log noise và hành vi trước/sau Supabase update không đồng nhất. Trong callback API, nếu profile chưa tồn tại sẽ **không** redirect đi đâu (chỉ rơi xuống cuối hàm → `/login?error=failed`), trong khi mong đợi đưa user về `/role-selection`.

#### Kịch bản thực tế có thể xảy ra

| # | Kịch bản | Hệ quả |
|---|---|---|
| 3.A | **Race condition signup → confirm email**: user click confirm chỉ vài giây sau khi register, RPC `create_profile_for_user` còn pending (DB lag) hoặc trigger chưa chạy. | `.single()` ném `PGRST116` → bị catch ngầm → callback rơi xuống cuối → redirect `/login?error=failed`. User confirm email nhưng vẫn không vào được → tưởng link hỏng, click lại nhiều lần → `code` đã used → loop. |
| 3.B | **Migration làm rỗng bảng `profiles`** (truncate / restore từ backup cũ) trong khi `auth.users` còn dữ liệu. | Tất cả user đang login đều bị middleware redirect khi vào `/role-selection` (hoặc bất kỳ chỗ check role). Log đầy `PGRST116`. |
| 3.C | Admin **xóa thủ công 1 profile** để test, không xóa kèm `auth.users`. | User tương ứng rớt vào branch không lường, middleware không tự re-create profile (chỉ legacy callback mới làm) → tài khoản chết. |
| 3.D | Trong middleware (`updateSession:117`), nếu `.single()` fail trên path `/role-selection`, `profile` undefined → nhánh `if (profile?.role)` skip → user **được phép** ở lại `/role-selection`. OK trong trường hợp này, nhưng… | …Nếu Supabase nâng version `supabase-js` mà `.single()` thay vì throw lại **reject promise** (đã từng có change), code sẽ ném exception đến Next middleware → 500 cho mọi request matcher. Đây là time-bomb. |
| 3.E | OAuth provider trả về `code` với account đã có session (re-login) → `exchangeCodeForSession` OK, nhưng profile đã bị xóa → `.single()` fail → redirect `/login?error=failed` mặc dù user đã đăng nhập thành công. Confused. |

- **Đề xuất**: Đổi sang `.maybeSingle()` cả 3 chỗ + thêm nhánh `if (!profile)` trong `api/auth/callback` (auto-create profile với role=null hoặc redirect `/role-selection`).

### 🟠 Bug #4 — Catch-all API `src/app/api/[id]/route.ts`

- **File**: `@/src/app/api/[id]/route.ts`
- **Lý do nghi ngại**: route nằm ở **gốc** `/api/[id]` sẽ match mọi path con không có route cụ thể (vì App Router prefer specific). Nhưng đặt một dynamic segment ở root `/api` rất dễ va chạm/khó debug. Cần đọc kỹ file để xác định ý đồ; nếu không cần thiết thì gỡ.

### 🟠 Bug #5 — `@/src/proxy.ts` dựa trên cú pháp Next 16 `proxy.ts`

- **File**: `@/src/proxy.ts:1-18`
- **Vấn đề**: Project khai báo `"next": "^16.2.0"` (đã hỗ trợ `proxy.ts` thay cho `middleware.ts`). Nhưng:
  - Nếu downgrade Next < 16, file này **không được Next nhận diện** → toàn bộ guard auth chết (mọi route protected vẫn render). Cần ghim version chặt hơn (`16.2.x`) hoặc thêm root `middleware.ts` để cùng tồn tại.
  - Trong `updateSession` (`@/src/utils/supabase/middleware.ts:72-82`) chỉ redirect HR khỏi `/`, không có nhánh cho candidate; trong khi `(auth)/actions.ts:27` redirect mọi login về `/`. UX không nhất quán giữa các role.
- **Đề xuất**: Pin `next` version + đồng bộ điểm đến sau login (ví dụ luôn dùng `/${role}/dashboard`).

### 🟠 Bug #6 — `applyToJob` chấp nhận `application/octet-stream` từ CV import nhưng `apply-job` thì không

- **File**: `@/src/app/api/applications/route.ts:7-11` vs `@/src/app/api/cv-imports/route.ts:8-15`
- **Vấn đề**: `applications` chỉ cho `pdf|doc|docx` — đúng yêu cầu "CV ứng tuyển". Nhưng `apply-job/route.ts` chỉ re-export `POST` của `applications` → mọi file ảnh người dùng upload (đôi khi browser gửi `octet-stream`) sẽ bị 400. Validate kỹ ở client để tránh bad UX, hoặc nới `''` (empty type) nhánh fallback theo extension như `cv-imports` đang làm (`@/src/app/api/cv-imports/route.ts:20-26`).

### 🟠 Bug #7 — `useCandidateApplications` race condition + missing deps

- **File**: `@/src/hooks/useCandidateApplications.ts:20-111`
- **Vấn đề**:
  - Cleanup `if (activeChannel) supabase.removeChannel(activeChannel)` chạy ngay khi component unmount, nhưng `activeChannel` được gán **bên trong** `fetchApplications()` async — nếu unmount trước khi `getUser()` xong → kênh không bao giờ unsubscribe (memory leak).
  - `useEffect(..., [])` ESLint sẽ cảnh báo (`fetchApplications` là dependency).
- **Đề xuất**: Tạo channel sau `setState` nhưng giữ ref local; cleanup dùng `let cancelled = true` flag hoặc abort controller.

### 🟠 Bug #8 — Server actions HR không tự verify role HR

- **File**: `@/src/app/hr/actions.ts:94-158`
- **Vấn đề**: Tất cả action (`createJobAction`, `updateJobAction`, `closeJobAction`, …) gọi thẳng `lib/recruitment.ts` mà không check `auth.getUser()` + `profile.role === 'hr'`. Server actions có thể bị POST từ client bất kỳ. Cần xác nhận `lib/recruitment.ts` có RLS / auth guard. Nếu chưa, đây là lỗ hổng phân quyền.
- **Hành động cần**: Đọc `@/src/lib/recruitment.ts` để verify; nếu thiếu → bọc helper `requireHrUser()`.

### 🟡 Bug #9 — Comment lặp + TODO chưa giải quyết

- `@/src/app/(auth)/actions.ts:60-61` — duplicate `// Manual Profile Creation (Critical requirement)`.
- TODO `multi-role` ở 6 vị trí: `@/src/utils/supabase/middleware.ts:86,115`, `@/src/config/navigation.ts:12,260,275`, `@/src/components/shared/headerModel.ts:204`, `@/src/lib/viewer.ts:11`. Đang dùng "1 user = 1 role" đơn giản; cần kế hoạch chuyển sang membership.
- TODO trong `@/src/components/editor/WordEditor.tsx:78` (chưa destroy editor instance) — có thể leak khi unmount.
- TODO trong `@/src/lib/editor/metadata.ts:230,379` (config OnlyOffice + bucket cho file đã edit).

### 🟡 Bug #10 — File rác / typo trong root

- `@/postcss.config.mj` (0 bytes) — typo, file thật là `@/postcss.config.mjs`. Nên xóa để tránh tool nhầm lẫn.
- 2 file Markdown CV chương sách (`chapter-1-...md`, `chapter-2-...md`) + `database-table-description.md` (~50KB) nằm root — không phải bug, nhưng gây ồn cho repo.

### � Bug #13 — Apryse / PDFTron WebViewer có nhiều rủi ro vận hành

- **File chính**: `@/src/components/editor/pdfEditorRuntime.ts:1-1768`, `@/src/components/editor/PdfEditor.tsx:80-95`, `@/src/lib/editor/metadata.ts:208-224`.
- **Quan ngại**:
  1. **License**: `APRYSE_LICENSE_KEY` lấy từ env, **không validate**. Nếu deploy thiếu key → Apryse chạy ở demo mode đóng watermark lên mọi PDF user save → CV của user **bị nhiễm watermark** vĩnh viễn (vì save ghi đè blob). Không có cảnh báo cho user.
  2. **Self-hosted assets quá nặng**: `public/webviewer/` ~**181MB**. Mỗi lần build Docker image / deploy lên Vercel, toàn bộ thư mục này phải được serve. Nếu thư mục bị sai version (mismatch với npm package `^11.11.0`) → WebViewer load partial → lỗi runtime mơ hồ kiểu "document got closed".
  3. **DOM hack fragile**: `pdfEditorRuntime.ts` sửa thẳng style `_iceni_galleyEdit_*` (selector private của Apryse). Bất kỳ minor update Apryse nào cũng có thể đổi class name → toàn bộ ContentEdit gãy. Không có version pin chặt.
  4. **Telemetry guard nhưng không tắt được fully**: Block 2 host (`pws-collect.apryse.com`, `pws-collect.pdftron.com`) qua `installApryseNetworkGuards`. Apryse có thể đổi endpoint hoặc dùng host khác → telemetry rò → vi phạm GDPR/PDPL nếu chưa khai báo trong privacy policy.
  5. **Race condition init**: dùng `initSequenceRef` + `cancelled` flag để chống double-init (`PdfEditor.tsx:60-67`). Logic phức tạp; trong dev mode (Strict Mode double-mount) chưa chắc cleanup hoàn toàn → có thể còn instance Apryse zombie giữ WASM memory.
  6. **Kích thước bundle**: lazy `import('@pdftron/webviewer')` chỉ tải WebViewer khi vào trang edit, OK. Nhưng nếu user vào nhầm trang non-PDF → WebViewer vẫn lazy-load? Cần verify chunk split.
  7. **`SaveOptions.LINEARIZED`** không kèm `REMOVE_UNUSED` → file PDF save lại có thể phình to (giữ object cũ).
  8. **Editability classify**: `analyzePdfEditability` chỉ sample 5 trang đầu (`MAX_SAMPLED_PAGES=5`). PDF 50 trang với 4 trang đầu là cover + TOC text rõ → bị classify `fully_editable` nhầm; phần thân là scan ảnh thì user edit không được mà UI vẫn báo OK.
  9. **`fetchPdfSourceBlob` (PdfEditor.tsx:386-397)** dùng `credentials: "omit"` → nếu `metadata.fileUrl` là Supabase Storage **private** (signed URL), OK. Nhưng nếu sau này đổi sang same-origin private bucket → tải file fail vì thiếu cookie.
  10. **OnlyOffice fallback** (`@/src/lib/editor/metadata.ts:228-275`): hai backend PDF (Apryse) + DOCX (OnlyOffice) song song, JWT/config OnlyOffice còn TODO → file DOCX có thể edit được mà không kiểm thực JWT → ai có URL document đều edit được.

- **Đề xuất ưu tiên**: validate `APRYSE_LICENSE_KEY` lúc startup (throw nếu missing trong production); pin version `@pdftron/webviewer` chặt (không `^`); thêm e2e test 1 lần render PDF mẫu mỗi lần deploy; tăng `MAX_SAMPLED_PAGES` hoặc sample ngẫu nhiên cả file thay vì 5 trang đầu; bỏ self-hosted asset → dùng CDN Apryse nếu license cho phép.

### �🟡 Bug #11 — Kiểm tra môi trường lúc runtime

- `@/src/utils/supabase/middleware.ts:49-50`, `@/src/utils/supabase/client.ts:5-6`, `@/src/utils/supabase/server.ts:8-9` đều dùng `process.env.NEXT_PUBLIC_SUPABASE_URL!` (non-null assert). Nếu thiếu env, app crash 500 thay vì báo rõ ràng. Nên throw có message giống `admin.ts:8-10`.

### 🟡 Bug #12 — Form search trang chủ không submit được

- `@/src/app/(public)/page.tsx:185-208`: 2 ô input + 1 button trong `div`, **không nằm trong `<form>`**, button không gắn `onClick`/`action`. Nhấn nút "Tìm kiếm ngay" không làm gì. Trong khi quick tag bên dưới (line 212-220) lại điều hướng đúng `/jobs?q=...`. Cần wrap thành `<form action="/jobs" method="get">` với `name="q"` & `name="location"`.

---

## 8. Khuyến nghị hành động (theo thứ tự ưu tiên)

1. **Quyết định 1 callback Supabase duy nhất** (Bug #1) + tạo trang lỗi tương ứng.
2. **Thêm rollback / dedup khi signup** (Bug #2) để tránh tài khoản treo.
3. **Đổi `.single()` → `.maybeSingle()`** ở 3 vị trí auth (Bug #3).
4. **Xác nhận quyền HR** trong server actions HR (Bug #8) — security critical.
5. **Wrap form search trang chủ** (Bug #12) — UX critical, dễ fix.
6. **Pin Next 16 và rà lại proxy.ts vs middleware.ts** (Bug #5).
7. **Refactor hook realtime** chống leak (Bug #7).
8. **Dọn file rác**: `postcss.config.mj`, comment lặp (Bug #9, #10).
9. **Validate env tập trung** (Bug #11): tạo `lib/env.ts` zod-schema.
10. **Lập kế hoạch multi-role** thay cho path-prefix guard hiện tại (TODO trong middleware).

---

## 9. Chưa đọc kỹ (cần thêm thời gian nếu muốn audit sâu)

- `@/src/lib/applications.ts` (1837 dòng) — mới đọc 120 dòng đầu.
- `@/src/lib/recruitment.ts` (~41KB), `@/src/lib/editable-cvs.ts` (~44KB), `@/src/lib/jobs.ts`, `@/src/lib/cv-imports.ts`.
- `@/src/app/candidate/cv-builder/page.tsx` (~49KB) và `store.ts` (~27KB) — quy tụ phần lớn UX phức tạp nhất.
- `@/src/features/cv-import/normalize-parsed-json.ts` (~22KB).
- Toàn bộ test files để xem độ phủ và khả năng chạy CI.
- `@/src/app/actions/ai-actions.ts` (~35KB).
- `@/src/components/editor/pdfEditorRuntime.ts` (1768 dòng) — mới đọc ~1000 dòng đầu, phần image replacement / ContentReplacer / repair text bbox cần đọc kỹ thêm.

> Nếu cần, tôi có thể đào sâu từng module trên (ví dụ: "audit `lib/applications.ts` toàn diện", "fix Bug #1 + #3 + #12") trong các phiên kế tiếp.
