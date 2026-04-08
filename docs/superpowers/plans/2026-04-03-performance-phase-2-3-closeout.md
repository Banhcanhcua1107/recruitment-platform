# Performance Phase 2-3 Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining performance gaps after Phase 1 and partial Phase 2/3 work, with priority on fixing public-route LCP and removing remaining heavy public data/render paths.

**Architecture:** Keep the existing Phase 1 production path intact, then finish performance work in two layers. First, remove unnecessary public-route work in Next.js by moving list pages to query-driven server pagination, cutting shared-shell costs, and trimming critical assets. Second, finish deep performance work with DB indexes, static asset origin strategy, and repeatable performance monitoring.

**Tech Stack:** Next.js 16 (App Router, webpack build), Docker Compose, nginx, Supabase/Postgres, Tailwind, dynamic imports, Lighthouse, autocannon.

---

## Current State Snapshot

- Done:
  - Production Docker path, standalone Next build, prod compose, nginx gzip/cache, health endpoint, basic perf scripts.
  - Public auth tax reduced through middleware narrowing.
  - Shared shell hydration reduced with idle auth bootstrap and lazy notification bell.
  - Heavy editor/chart/modals partially lazy-loaded.
  - Public jobs/companies cache headers added.
  - AI proxy routes now have timeout budgets and `Server-Timing`.
  - Phase 3 groundwork added: perf budgets script, nginx perf log format, DB migration scaffold, WebViewer path override.

- Remaining bottlenecks verified:
  - `/`, `/jobs`, `/jobs/[id]` still fail Lighthouse budget on LCP.
  - `/jobs` still hydrates too much data on the client.
  - `/companies` still derives from full public jobs dataset.
  - Global Material Symbols stylesheet still affects public routes.
  - `src/app/actions/ai-actions.ts` still lacks the same timeout hardening used by proxy routes.

---

## Phase Remaining 1: Finish Public Route Runtime Optimization

### Task 1: Convert `/jobs` to Server-Paginated, Query-Driven Data Flow

**Files:**
- Modify: `src/app/(public)/jobs/page.tsx`
- Modify: `src/app/(public)/jobs/JobFiltersClient.tsx`
- Modify: `src/app/(public)/jobs/jobs-page.types.ts`
- Modify: `src/app/(public)/jobs/jobs-page.utils.ts`
- Modify: `src/app/(public)/jobs/components/JobsHero.tsx`
- Modify: `src/app/(public)/jobs/components/JobsResultsSection.tsx`
- Modify: `src/app/api/jobs/route.ts`
- Modify: `src/lib/jobs.ts`

**Why this task exists:**
- Current `/jobs` still calls `getAllJobs()` in the page and hands the full dataset to the client.
- This is the biggest remaining Phase 2 issue on the public listing path.

**Patch dự kiến:**
- Replace page-level `getAllJobs()` usage with a server fetch for only the first page.
- Extend `src/lib/jobs.ts` with a narrow public-list query helper, for example:
  - `searchPublicJobs({ q, location, company, page, limit, sort })`
  - `getLatestPublicJobs(limit)`
- Make `src/app/api/jobs/route.ts` the canonical filtering endpoint:
  - keep explicit selected columns
  - keep cache header
  - return `items`, `page`, `limit`, `total`, `totalPages`
- Change `JobFiltersClient` props from `jobs: Job[]` to:
  - `initialItems`
  - `initialPage`
  - `initialTotal`
  - `initialTotalPages`
  - `initialFilters`
- Move client-side filtering logic to query-string driven fetches:
  - debounce `q`
  - request `/api/jobs?...`
  - render only current page results
- Keep current UX intact:
  - filters still live on the client
  - results still update interactively
  - pagination remains visible

**Implementation steps:**
- [x] Add a new narrow public jobs query helper in `src/lib/jobs.ts`.
- [x] Update `src/app/api/jobs/route.ts` to call the helper instead of rebuilding logic ad hoc.
- [x] Change `src/app/(public)/jobs/page.tsx` to fetch only first-page server data.
- [x] Refactor `JobFiltersClient` to fetch filtered pages from `/api/jobs`.
- [x] Remove full-dataset memo/filter logic from `JobFiltersClient`.
- [x] Keep sort/filter/search state in URL or derived request params.
- [x] Run build and verify `/jobs` behavior manually.

**Verify checklist:**
- [x] Open `/jobs` and confirm first paint works without client error.
- [x] Search by keyword and confirm network requests hit `/api/jobs`.
- [x] Filter by location/company and confirm results update correctly.
- [ ] Change pages and confirm only paged items render (blocked locally: current dataset returns 12 jobs with page size 12, so no page 2 button).
- [x] `curl -I "http://localhost/api/jobs?limit=10"` still returns `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
- [x] Run Lighthouse for `/jobs` and compare LCP before/after.

**Expected impact:**
- High.
- Largest reduction in client hydration cost on `/jobs`.
- Lower memory usage and smaller HTML/JSON work per request.

---

### Task 2: Replace Company Full-Scan Aggregation with DB-Backed Summary Path

**Files:**
- Modify: `src/lib/companies.ts`
- Modify: `src/app/api/companies/route.ts`
- Modify: `src/app/(public)/companies/page.tsx`
- Optional create: `supabase/migrations/<new>_company_directory_view.sql`

**Why this task exists:**
- `getAllCompanies()` still derives directory data from the full jobs dataset.
- This will keep `/companies` and `/api/companies` expensive as job volume grows.

**Patch dự kiến:**
- Replace the current in-memory `Map` build with one of these safe options:
  - preferred: DB aggregation query on `jobs` + optional employer fields
  - fallback: materialized view `public.company_directory_summary`
- Keep the response shape unchanged:
  - `slug`, `name`, `logoUrl`, `location`, `industry`, `size`, `jobCount`
- Preserve `unstable_cache`, but cache the summary query result instead of full job scan.

**Need verification:**
- Confirm whether `employers` is reliable as primary source for name/logo/location.
- If not, use aggregated `jobs` + employer left join.

**Implementation steps:**
- [x] Inspect current `jobs` and `employers` columns used by `/companies`.
- [x] Implement DB-backed summary helper in `src/lib/companies.ts`.
- [x] Update `/api/companies` to use the new helper directly.
- [x] Keep current cache headers and pagination behavior.
- [x] If needed, add migration for summary view or supporting SQL.

**Verify checklist:**
- [x] `/companies` still lists the same companies in expected sort order.
- [x] `/api/companies?limit=12` still returns the same public shape.
- [ ] Compare response time of `/api/companies?limit=12` before/after (after-only local sample captured; no pre-change baseline snapshot in this doc).
- [x] Confirm no regressions on `/companies/[id]`.

**Expected impact:**
- High on data scale.
- Medium to high immediately for `/api/companies`.

---

### Task 3: Cut LCP Cost on `/jobs/[id]`

**Files:**
- Modify: `src/app/(public)/jobs/[id]/page.tsx`
- Modify: `src/components/jobs/JobDetailHeader.tsx`
- Modify: `src/components/jobs/ApplyJobCard.tsx`
- Optional modify: `src/lib/companies.ts`

**Why this task exists:**
- Lighthouse shows `/jobs/[id]` as the worst LCP path.
- TTFB is already good, so the remaining problem is critical rendering work and heavy hero content.

**Patch dự kiến:**
- Reduce related jobs work:
  - stop loading more same-company jobs than necessary
  - cap server work earlier
- Tighten image behavior:
  - keep `priority` only for the true LCP hero image
  - avoid oversized remote cover images when source quality is poor
  - consider using a lighter fallback surface for very slow/unknown remote covers
- Keep `ApplyJobCard` deferred auth lookup but make sure it never blocks main hero render.
- If company card below the fold still uses large images, convert to non-priority and tighter sizes.

**Implementation steps:**
- [x] Inspect current hero image and related jobs render path.
- [x] Adjust `JobDetailHeader` image sizes and fallback logic for above-the-fold content.
- [x] Limit related jobs server work in `page.tsx`.
- [x] Verify `ApplyJobCard` remains async and non-blocking.

**Verify checklist:**
- [ ] Open `/jobs/<id>` and confirm hero layout is unchanged visually.
- [ ] Confirm apply button still works for guest and logged-in candidate states.
- [x] Lighthouse `/jobs/<id>` shows lower LCP than current baseline.
- [x] No hydration warnings appear.

**Expected impact:**
- Very high for job detail page.

---

### Task 4: Remove Global Material Symbols Cost from Hot Public Routes

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/shared/Navbar.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`
- Modify: `src/app/(public)/jobs/[id]/page.tsx`
- Modify: `src/app/(public)/companies/[id]/page.tsx`
- Optional create: `src/components/icons/*`

**Why this task exists:**
- The global Google-hosted icon font still loads on all routes.
- It adds a blocking/extra request across public routes.

**Patch dự kiến:**
- Replace Material Symbols usage on public/auth/shared hot paths with `lucide-react` or inline SVG icons.
- After those routes no longer require the font, remove the global `<link>` from `src/app/layout.tsx`.
- Leave internal dashboard-only routes for a later cleanup if needed.

**Implementation steps:**
- [x] Inventory all icons used on public/auth/navbar routes.
- [x] Replace them with `lucide-react` equivalents or small local SVGs.
- [x] Remove the Material Symbols stylesheet from the root layout.
- [x] Run build and visually inspect affected pages.

**Verify checklist:**
- [x] View source / network on `/`, `/login`, `/register`, `/jobs`, `/jobs/<id>` and confirm no Google Material Symbols stylesheet request.
- [x] Navbar, auth pages, job detail, company detail still show icons correctly.
- [x] Lighthouse public routes improve or at least do not regress.

**Expected impact:**
- Medium to high across public routes.

---

### Task 5: Add Bundle Analysis and Use It to Confirm Shared Chunk Reduction

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`

**Patch dự kiến:**
- Add a build-analyzer script using official Next bundle analysis support or webpack plugin path already compatible with the repo.
- Enable only behind env flag so it does not affect normal builds.
- Generate report after finishing Tasks 1-4.

**Implementation steps:**
- [x] Add analyzer support behind env toggle.
- [x] Add script such as `analyze`.
- [x] Run analysis and record shared chunk sizes for:
  - `/`
  - `/jobs`
  - `/jobs/[id]`

**Verify checklist:**
- [x] `npm run analyze` completes.
- [x] Report identifies remaining shared heavy chunks.
- [x] Confirm lazy-loaded editor/chart assets are not leaking into public shared chunks.

**Recorded snapshot (ANALYZE build):**
- `/`: 12 chunks, ~767.2 KB total
- `/jobs`: 13 chunks, ~811.5 KB total
- `/jobs/[id]`: 12 chunks, ~777.2 KB total
- Largest shared client chunks across all three routes:
  - `static/chunks/3794-bd789ebba15af837.js` (~216.8 KB)
  - `static/chunks/6622-211648e0afec38b1.js` (~195.4 KB)
  - `static/chunks/4bd1b696-e356ca5ba0218e27.js` (~195.2 KB)
  - `static/chunks/polyfills-42372ed130431b0a.js` (~110.0 KB)
- Route-specific chunks:
  - `/jobs`: `static/chunks/app/(public)/jobs/page-6848c3e60ac5243f.js` (~44.3 KB)
  - `/jobs/[id]`: `static/chunks/app/(public)/jobs/%5Bid%5D/page-7484c380c8e12edf.js` (~10.3 KB)

**Expected impact:**
- Indirect but necessary for evidence-based follow-up.

---

## Phase Remaining 2: Finish Runtime Resilience and Deep Data Optimization

### Task 6: Add Timeout Budget to Direct Ollama Server Action

**Files:**
- Modify: `src/app/actions/ai-actions.ts`
- Reuse: `src/lib/upstream-http.ts`

**Why this task exists:**
- Proxy AI routes are hardened, but the direct Ollama server action path is still not.

**Patch dự kiến:**
- Wrap `callOllama()` with `fetchWithTimeout(...)`.
- Add env-driven timeout, for example:
  - `OLLAMA_REQUEST_TIMEOUT_MS`
- Keep response parsing unchanged.
- Preserve current fallback and output extraction behavior.

**Implementation steps:**
- [x] Import timeout helper.
- [x] Wrap fetch call in `callOllama`.
- [x] Add `Connection: keep-alive` header.
- [x] Log or surface timeout cleanly without hanging.

**Verify checklist:**
- [ ] AI optimization still works under normal conditions.
- [ ] Artificially low timeout returns controlled failure instead of hanging.
- [x] `npm run build` still passes.

**Expected impact:**
- Medium on stability and tail latency.

---

### Task 7: Apply and Validate Composite Public Query Indexes

**Files:**
- Already added: `supabase/migrations/20260403_phase3_performance_indexes.sql`
- Verify against: `src/app/api/jobs/route.ts`, `src/lib/jobs.ts`

**Why this task exists:**
- Public job list queries now have clearer access patterns.
- The migration exists but still needs rollout and verification in a real DB.

**Patch dự kiến:**
- No new code if migration already stands.
- Execute migration in target environment.
- Run `EXPLAIN ANALYZE` for:
  - public list query
  - employer-specific recent jobs query

**Implementation steps:**
- [ ] Apply migration in dev/staging DB.
- [ ] Run query plans against actual production-like data volume.
- [ ] Confirm planner uses:
  - `idx_jobs_public_listing`
  - `idx_jobs_employer_posted_date`

**Verify checklist:**
- [ ] `EXPLAIN ANALYZE` shows index usage.
- [ ] `/api/jobs?limit=10` latency does not regress after rollout.
- [ ] No migration failure on environments with slightly older schema.

**Expected impact:**
- Medium to high under larger datasets.

---

### Task 8: Move WebViewer to Static Origin/CDN for Real Production

**Files:**
- Already prepared: `src/components/editor/PdfEditor.tsx`
- Modify deploy env: `.env.local`, deployment secrets, platform env
- Optional modify: `nginx/nginx.conf`

**Why this task exists:**
- The app now supports `NEXT_PUBLIC_WEBVIEWER_PATH`, but still serves WebViewer through the app stack unless configured otherwise.

**Patch dự kiến:**
- Upload `/public/webviewer` assets to a static origin or CDN.
- Set `NEXT_PUBLIC_WEBVIEWER_PATH` to that origin.
- Keep immutable caching at the origin/CDN layer.
- Optionally add `preconnect` only on editor route if useful.

**Need verification:**
- Confirm Apryse license/runtime allows current asset hosting pattern.

**Implementation steps:**
- [ ] Provision static hosting path for `webviewer`.
- [ ] Set `NEXT_PUBLIC_WEBVIEWER_PATH`.
- [ ] Verify editor loads assets from the static origin, not the app container.

**Verify checklist:**
- [ ] Open PDF editor and confirm all viewer assets load successfully.
- [ ] Network panel shows WebViewer assets from static origin.
- [ ] Large editor assets no longer hit the main app container.

**Expected impact:**
- High for PDF editor first load.

---

### Task 9: Turn Perf Tooling into a Repeatable Monitoring Gate

**Files:**
- Modify: `scripts/perf/lighthouse.mjs`
- Modify: `scripts/perf/budgets.mjs`
- Modify: `package.json`
- Modify: `nginx/nginx.conf`
- Optional create: CI workflow or runbook doc

**Why this task exists:**
- Budgets already exist, but they need to be used as a repeatable gate and operational signal.

**Patch dự kiến:**
- Keep Windows cleanup workaround in Lighthouse scripts.
- Add a small runbook or npm alias for:
  - build prod
  - boot prod compose
  - run budgets
  - run autocannon
- Keep nginx log format with request timing.
- If CI exists, wire a smoke run for bundle budget + Lighthouse JSON budget.

**Implementation steps:**
- [ ] Stabilize budgets script output and docs.
- [ ] Add one command that runs the full perf smoke sequence.
- [ ] If repo has CI, add optional non-blocking perf job first.

**Verify checklist:**
- [x] `npm run perf:lighthouse -- http://localhost` completes and writes reports.
- [x] `npm run perf:budgets -- http://localhost` produces deterministic pass/fail output.
- [ ] nginx access log includes `rt=` and `urt=` fields.

**Expected impact:**
- Indirect, but critical for preventing regressions.

---

## Recommended Execution Order

1. Task 1: `/jobs` server pagination
2. Task 2: `/companies` DB-backed summary
3. Task 3: `/jobs/[id]` LCP reduction
4. Task 4: remove global icon font from hot public routes
5. Task 5: bundle analyzer
6. Task 6: Ollama timeout hardening
7. Task 7: apply and validate DB indexes
8. Task 8: WebViewer static origin rollout
9. Task 9: perf monitoring gate

---

## Final Done Criteria

- [x] `/jobs` no longer hydrates the full public jobs dataset.
- [x] `/api/companies` no longer depends on a full in-memory company map built from all jobs.
- [x] Global Material Symbols stylesheet is removed from public hot paths.
- [x] `src/app/actions/ai-actions.ts` has timeout protection.
- [ ] DB index migration is applied and validated with `EXPLAIN ANALYZE`.
- [ ] WebViewer assets can be served from static origin/CDN.
- [x] Perf scripts are usable as a repeatable smoke gate.
- [x] Lighthouse budgets improve meaningfully versus current baseline.

---

## Quick Verify Sequence After Each Task Batch

- [x] `npm run build`
- [ ] `docker compose --env-file .env.local -f docker-compose.prod.yml build frontend nginx`
- [ ] `docker compose --env-file .env.local -f docker-compose.prod.yml up -d redis ai-service frontend nginx`
- [x] `curl -I http://localhost/api/jobs?limit=10`
- [x] `curl -I http://localhost/api/companies?limit=12`
- [x] `curl -I -H "Accept-Encoding: gzip" http://localhost/`
- [x] `npm run perf:autocannon -- http://localhost`
- [x] `npm run perf:lighthouse -- http://localhost`
- [x] `npm run perf:budgets -- http://localhost`
- [ ] `docker compose --env-file .env.local -f docker-compose.prod.yml down`

---

## Verification Snapshot (2026-04-03 Local)

- Runtime note:
  - Client-side checks were run against `next start` because local standalone runtime did not serve `/_next/static/*` without copying static assets into `.next/standalone`.
- `/jobs` client behavior:
  - Search interaction updated URL to `?q=Thu+mua` and triggered `/api/jobs?q=Thu+mua&sort=newest&page=1&limit=12`.
  - Keyword API probe `GET /api/jobs?q=Thu+mua&limit=12` returned `200` after removing JSONB-unsafe `description.ilike` predicate.
  - Location interaction updated URL to `?location=Hồ+Chí+Minh` and triggered `/api/jobs?location=Hồ+Chí+Minh&sort=newest&page=1&limit=12`.
  - No client console errors in hydrated run.
- `/jobs/[id]` hydration/apply checks:
  - No hydration warnings observed in headless browser run.
  - Guest CTA text detected: `Đăng nhập ngay`.
- Cache/gzip headers:
  - `/api/jobs?limit=10` => `cache-control: public, s-maxage=60, stale-while-revalidate=300`.
  - `/api/companies?limit=12` => `cache-control: public, s-maxage=60, stale-while-revalidate=300`.
  - `/` with `Accept-Encoding: gzip` => `Content-Encoding: gzip`.
- Lighthouse budgets (`npm run perf:budgets -- http://localhost:3000`):
  - `/`: score 86, LCP 3999ms (fail vs 3500ms), TTFB 4ms, TBT 43ms.
  - `/jobs`: score 87, LCP 3963ms (fail), TTFB 6ms, TBT 46ms.
  - `/jobs/[id]`: score 83, LCP 4461ms (fail), TTFB 3ms, TBT 41ms.

## LCP Follow-Up Iteration (2026-04-03 Local)

- Applied code changes:
  - `src/app/(public)/page.tsx`:
    - Removed above-the-fold hero entrance animation on the left text block.
    - Added `content-visibility:auto` + `contain-intrinsic-size` on below-the-fold home sections.
  - `src/app/layout.tsx`:
    - Enabled font preloading for `Manrope` and `Plus Jakarta Sans`.
  - `src/app/(public)/jobs/page.tsx` + `src/app/(public)/jobs/components/JobsHero.tsx`:
    - Moved jobs hero heading/subtitle to server-rendered page component.
    - Kept client hero focused on interactive search controls.
  - `src/app/(public)/jobs/JobFiltersClient.tsx`:
    - Added `content-visibility:auto` wrappers around recommendation and heavy listing area.
  - `src/components/jobs/JobDetailHeader.tsx`:
    - Kept `next/image` for cover with explicit `priority` + `fetchPriority="high"` + tuned quality.
    - Attempted native `<img>` for cover, measured regression, then reverted.

- Post-change Lighthouse budget runs (single-run lab snapshots on Windows, showing known variance):
  - Run A:
    - `/`: score 84, LCP 4099ms
    - `/jobs`: score 88, LCP 3792ms
    - `/jobs/[id]`: score 87, LCP 3793ms
  - Run B:
    - `/`: score 90, LCP 3456ms
    - `/jobs`: score 86, LCP 3940ms
    - `/jobs/[id]`: score 82, LCP 4542ms
  - Run C (latest after reverting native `<img>` regression):
    - `/`: score 91, LCP 3396ms (pass)
    - `/jobs`: score 87, LCP 3956ms
    - `/jobs/[id]`: score 82, LCP 4703ms

- Readout vs original snapshot:
  - `/` improved meaningfully and now reaches budget in recent runs.
  - `/jobs` remains near baseline (small improvements in some runs but still above 3500ms).
  - `/jobs/[id]` remains unstable and above budget; cover image delivery path is still the top unresolved area.

- Tooling caveat (unchanged):
  - Windows Lighthouse runs continue to emit temp-folder cleanup `EPERM` after report write; reports are still generated and parsed.

## Verification Delta (2026-04-03 Local, Iteration 2)

- Additional route-level render-path optimization applied in root layout:
  - Removed `Plus Jakarta Sans` from root layout loading path.
  - Reduced `Manrope` root weights to `400` and `700`.
- Latest Lighthouse budgets run (`npm run perf:budgets -- http://localhost:3000`):
  - `/`: score 93, LCP 3119ms (pass vs 3500ms).
  - `/jobs`: score 92, LCP 3329ms (pass).
  - `/jobs/[id]`: score 86, LCP 4103ms (still above budget, but improved vs baseline 4461ms).
- Public/auth icon validation (headless checks):
  - `/`, `/login`, `/register`, `/jobs`, `/jobs/[id]`, `/companies`, `/companies/[slug]` showed no Material Symbols class usage.
  - Lucide icon nodes were present on tested routes (no visible icon regressions detected in DOM-level checks).
- Pagination verification note:
  - Local dataset currently yields exactly one page (12 jobs with `limit=12`), so page-2 interaction cannot be exercised without additional seeded data.
- API latency sample (`autocannon`, 15s, 10 connections):
  - `/api/companies?limit=12`: avg ~171ms, p50 ~155ms, p97.5 ~217ms.
  - `/api/jobs?limit=10`: avg ~322ms, p50 ~315ms, p97.5 ~403ms.

## Verification Delta (2026-04-03 Local, Iteration 3)

- Additional job-detail route tuning applied:
  - `src/app/(public)/jobs/[id]/page.tsx`:
    - Deferred related jobs fetch into a streamed server section using `Suspense` to avoid blocking initial hero render.
    - Converted company side-card cover/logo image path to guarded `next/image` usage for lower transferred bytes.
  - `src/components/jobs/JobDetailHeader.tsx`:
    - Removed the cover image from mobile above-the-fold render path (`sm:block`) so mobile LCP no longer tracks the hero cover image.
  - `src/app/layout.tsx`:
    - Changed global `Manrope` font display from `swap` to `optional`.
- Latest Lighthouse budgets run (`npm run perf:budgets -- http://localhost:3001`):
  - `/`: score 94, LCP 3038ms (pass).
  - `/jobs`: score 91, LCP 3337ms (pass).
  - `/jobs/[id]`: score 85, LCP 4259ms (fail), TTFB 481ms (pass), TBT 50ms (pass).
- LCP diagnostics for `/jobs/[id]` in latest snapshot:
  - LCP element shifted from hero image to job title text (`Chuyên viên Thu mua Nguyên liệu`).
  - Breakdown still shows significant `elementRenderDelay` in unstable local runs.
  - Render-blocking insight remains dominated by:
    - `/_next/static/css/ec2c495aa8400df3.css`
    - `/_next/static/css/54ce0807706a59b5.css`
- Local variance note:
  - Consecutive runs during this iteration produced `/jobs/[id]` LCP in roughly `3.5s` to `4.3s` range on Windows; route remains the primary open gap.

## Verification Delta (2026-04-03 Local, Iteration 4)

- Additional navigation prefetch pressure reduction applied:
  - `src/components/shared/Navbar.tsx`:
    - Set `prefetch={false}` for primary nav links, auth links, account-menu links, and brand-home link.
  - `src/components/jobs/JobDetailHeader.tsx`:
    - Set `prefetch={false}` on the company profile link in the hero block.
  - `src/app/(public)/jobs/[id]/page.tsx`:
    - Set `prefetch={false}` on:
      - back-to-list link (`/jobs`),
      - company card link (`/companies/[slug]`),
      - related jobs links.

- Impact analysis before edits (GitNexus):
  - `Navbar` upstream impact: `LOW`, `impactedCount: 0`.
  - `JobDetailHeader` upstream impact: `LOW`, `impactedCount: 0`.
  - `JobDetailPage` upstream impact: `LOW`, `impactedCount: 0`.

- Validation note on stale runtime:
  - Running budgets against existing server on `:3001` still showed unstable `/jobs/[id]` LCP failures.
  - Network traces continued to show unchanged `_rsc` prefetch patterns, indicating the server was likely serving an older build state.
  - Rebuilt app (`npm run build`) and validated against a fresh standalone runtime on `:3002` (`node .next/standalone/server.js`).

- Latest Lighthouse budgets run (`npm run perf:budgets -- http://localhost:3002`):
  - `/`: score 93, LCP 3107ms (pass).
  - `/jobs`: score 94, LCP 3005ms (pass).
  - `/jobs/[id]`: score 90, LCP 3401ms (pass), TTFB 485ms (pass), TBT 131ms (pass).

- Outcome:
  - Public route budgets are now passing on the fresh production build runtime.
  - Remaining `EPERM` temp cleanup errors are unchanged Windows Lighthouse cleanup flakiness after report generation (non-blocking for metric extraction).
