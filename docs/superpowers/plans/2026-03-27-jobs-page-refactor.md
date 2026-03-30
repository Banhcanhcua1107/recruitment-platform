# Jobs Page Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `/jobs` to match the new HTML-inspired layout, add an always-visible recommendation layer, and preserve all current listing logic.

**Architecture:** Keep `getAllJobs()` and the current client-side jobs state model. Extract pure helpers and presentational components out of `JobFiltersClient`, then add a dedicated recommendation hook that auto-loads existing cached/API recommendation data without affecting the all-jobs flow.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase client auth, Tailwind CSS

---

## File Structure

**Modify:**

- `src/app/(public)/jobs/JobFiltersClient.tsx`
- `src/app/(public)/jobs/loading.tsx`

**Create:**

- `src/app/(public)/jobs/jobs-page.types.ts`
- `src/app/(public)/jobs/jobs-page.utils.ts`
- `src/app/(public)/jobs/jobs-page.utils.test.ts`
- `src/app/(public)/jobs/useRecommendedJobs.ts`
- `src/app/(public)/jobs/components/JobsHero.tsx`
- `src/app/(public)/jobs/components/JobsRecommendationSection.tsx`
- `src/app/(public)/jobs/components/JobsFilterSidebar.tsx`
- `src/app/(public)/jobs/components/JobsResultsSection.tsx`

---

### Task 1: Lock current jobs-page behavior with tests

**Files:**

- Create: `src/app/(public)/jobs/jobs-page.utils.test.ts`
- Create: `src/app/(public)/jobs/jobs-page.utils.ts`

- [ ] **Step 1: Write the failing test**

Cover:

- keyword filtering
- company / location / industry filtering
- salary filtering and hide-unknown-salary behavior
- salary sorting
- pagination slicing
- recommendation source resolution from API vs local cache

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx .\src\app\(public)\jobs\jobs-page.utils.test.ts`

- [ ] **Step 3: Write minimal implementation**

Extract pure helpers from the current `JobFiltersClient` logic so the container refactor reuses the same behavior.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx .\src\app\(public)\jobs\jobs-page.utils.test.ts`

---

### Task 2: Add recommendation hook for `/jobs`

**Files:**

- Create: `src/app/(public)/jobs/useRecommendedJobs.ts`
- Modify if needed: `src/app/(public)/jobs/jobs-page.utils.ts`

- [ ] **Step 1: Define hook behavior**

Support:

- auto-load on mount
- API cache first
- dashboard local cache fallback
- three UI states: loading, ready, empty
- analyze action for CTA fallback

- [ ] **Step 2: Write minimal implementation**

Reuse `/api/recommend-jobs` and local cache key `rec_jobs_cache` without changing backend business logic.

- [ ] **Step 3: Run focused verification**

Run: `npx tsx .\src\app\(public)\jobs\jobs-page.utils.test.ts`

---

### Task 3: Refactor `JobFiltersClient` into container + components

**Files:**

- Modify: `src/app/(public)/jobs/JobFiltersClient.tsx`
- Create: jobs components listed above

- [ ] **Step 1: Keep the current state contract**

Do not change the meaning or interactions of existing filter/search/sort/pagination state.

- [ ] **Step 2: Move presentation into component files**

Split:

- hero
- recommendation section
- filter sidebar
- results area

- [ ] **Step 3: Bind the new layout to live data**

Use real jobs and recommendation data. No static cards should replace working logic.

- [ ] **Step 4: Run verification**

Run:

```bash
npx eslint .\src\app\(public)\jobs\JobFiltersClient.tsx .\src\app\(public)\jobs\useRecommendedJobs.ts .\src\app\(public)\jobs\jobs-page.utils.ts .\src\app\(public)\jobs\components\*.tsx
```

---

### Task 4: Refresh loading shell and complete verification

**Files:**

- Modify: `src/app/(public)/jobs/loading.tsx`

- [ ] **Step 1: Align loading shell with new two-layer page**

- [ ] **Step 2: Run full verification**

Run:

```bash
npx tsx .\src\app\(public)\jobs\jobs-page.utils.test.ts
npx eslint .\src\app\(public)\jobs\page.tsx .\src\app\(public)\jobs\JobFiltersClient.tsx .\src\app\(public)\jobs\loading.tsx .\src\app\(public)\jobs\useRecommendedJobs.ts .\src\app\(public)\jobs\jobs-page.utils.ts .\src\app\(public)\jobs\components\*.tsx
```
