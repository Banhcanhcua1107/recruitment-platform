# Candidate Profile Preview and CV Empty State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the current `/candidate/profile` builder intact, add an `Edit / Preview` toggle that reuses the public/recruiter profile layout, then polish the no-CV empty state in `/candidate/cv-builder`.

**Architecture:** This is a phased UX rollout, not a full modular profile-builder rewrite. The current builder remains the edit surface. Preview mode is added on top of it and should reuse the same public-facing layout and filtered section logic already used by recruiter/public profile rendering.

**Tech Stack:** Next.js App Router, React, TypeScript, Zustand, Supabase, Tailwind CSS

---

## File Structure

**Likely modify:**

- `src/app/candidate/profile/page.tsx`
- `src/app/candidate/profile/CandidateProfileBuilderPage.tsx`
- `src/app/candidate/profile/stores/profileBuilderStore.ts`
- `src/components/recruitment/PublicCandidateProfileView.tsx`
- `src/lib/candidate-profile-document.ts`
- `src/lib/candidate-profile-document.test.ts`
- `src/app/candidate/cv-builder/page.tsx`
- `src/app/candidate/cv-builder/components/cv/CreateCard.tsx`
- `src/app/candidate/cv-builder/components/cv/UploadCard.tsx`

**Optional create:**

- `src/components/candidate/CandidateProfilePreview.tsx`
- `src/components/candidate/cv-builder/CvWorkspaceEmptyState.tsx`

---

## Phase 1: Profile Preview

### Task 1: Lock shared preview/public filtering rules

**Files:**

- Modify: `src/lib/candidate-profile-document.test.ts`
- Modify if needed: `src/lib/candidate-profile-document.ts`

- [ ] **Step 1: Write the failing test**

Add or extend tests for:

- visible section renders only when enabled and non-empty
- public-hidden section is excluded
- ordering is preserved
- the same filtered result can be used by both candidate preview and recruiter/public view

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx .\src\lib\candidate-profile-document.test.ts`  
Expected: fail if filtering behavior is incomplete or not reusable

- [ ] **Step 3: Write minimal implementation**

Refine shared helpers so one filtering path can drive:

- candidate preview
- recruiter/public profile rendering

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx .\src\lib\candidate-profile-document.test.ts`  
Expected: `candidate profile document tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/lib/candidate-profile-document.ts src/lib/candidate-profile-document.test.ts
git commit -m "test: lock shared profile preview filtering rules"
```

---

### Task 2: Add `Edit / Preview` toggle to `/candidate/profile`

**Files:**

- Modify: `src/app/candidate/profile/page.tsx`
- Modify: `src/app/candidate/profile/CandidateProfileBuilderPage.tsx`
- Optional create: `src/components/candidate/CandidateProfilePreview.tsx`

- [ ] **Step 1: Define pre-change verification**

Manual checklist:

- current builder loads normally
- add/edit/delete/reorder section behavior works before the change
- no preview toggle exists yet

- [ ] **Step 2: Run pre-change verification**

Open: `http://localhost:3000/candidate/profile`

- [ ] **Step 3: Write minimal implementation**

Add a top-level mode switch:

- `Edit`
- `Preview`

Rules:

- `Edit` keeps the current builder path unchanged
- `Preview` renders a read-only profile preview
- switching modes does not discard current builder state

- [ ] **Step 4: Run verification**

Run:

```bash
npx eslint .\src\app\candidate\profile\page.tsx .\src\app\candidate\profile\CandidateProfileBuilderPage.tsx
```

Manual check:

- toggle is visible
- edit mode still works
- preview mode loads without builder controls

- [ ] **Step 5: Commit**

```bash
git add src/app/candidate/profile/page.tsx src/app/candidate/profile/CandidateProfileBuilderPage.tsx
git commit -m "feat: add edit and preview toggle to candidate profile"
```

---

### Task 3: Reuse public/recruiter layout for candidate preview

**Files:**

- Modify: `src/components/recruitment/PublicCandidateProfileView.tsx`
- Modify or create: candidate preview wrapper component
- Modify if needed: `src/lib/candidate-profile-document.ts`

- [ ] **Step 1: Define the expected result**

Preview should:

- use the same profile body layout as recruiter/public view
- render only sections that are enabled, public-visible, and non-empty
- hide edit chrome and placeholders

- [ ] **Step 2: Run pre-change comparison**

Compare:

- `/candidate/profile`
- recruiter/public profile page

Expected before implementation: the candidate editing experience and public profile layout still feel mismatched

- [ ] **Step 3: Write minimal implementation**

Refactor rendering so candidate preview reuses the same layout building blocks as public/recruiter view.

Allow only small context differences where needed, such as:

- local page shell
- candidate-side mode toggle
- recruiter-only action buttons being omitted from preview

- [ ] **Step 4: Run verification**

Run:

```bash
npx eslint .\src\components\recruitment\PublicCandidateProfileView.tsx
npx tsx .\src\lib\candidate-profile-document.test.ts
```

Manual check:

- candidate preview visually matches public/recruiter profile body
- preview hides empty sections and edit controls

- [ ] **Step 5: Commit**

```bash
git add src/components/recruitment/PublicCandidateProfileView.tsx src/lib/candidate-profile-document.ts src/lib/candidate-profile-document.test.ts
git commit -m "feat: reuse public profile layout for candidate preview"
```

---

### Task 4: Preserve the current builder experience

**Files:**

- Modify if needed: `src/app/candidate/profile/CandidateProfileBuilderPage.tsx`
- Modify if needed: `src/app/candidate/profile/stores/profileBuilderStore.ts`

- [ ] **Step 1: Define builder regression checks**

Manual checklist:

- add section still works
- edit section still works
- delete section still works
- reorder still works
- public visibility control still works
- empty enabled section still shows CTA in edit mode

- [ ] **Step 2: Run pre-final verification**

Confirm the builder still behaves the same after preview integration.

- [ ] **Step 3: Write minimal implementation**

Only adjust edit-mode code if needed to keep behavior stable while the preview mode is added.

- [ ] **Step 4: Run verification**

Run:

```bash
npx eslint .\src\app\candidate\profile\stores\profileBuilderStore.ts .\src\app\candidate\profile\CandidateProfileBuilderPage.tsx
```

Manual check all existing builder actions again.

- [ ] **Step 5: Commit**

```bash
git add src/app/candidate/profile/CandidateProfileBuilderPage.tsx src/app/candidate/profile/stores/profileBuilderStore.ts
git commit -m "fix: preserve profile builder behavior with preview mode"
```

---

## Phase 2: CV Workspace Empty State Polish

### Task 5: Redesign the no-CV empty state in `/candidate/cv-builder`

**Files:**

- Modify: `src/app/candidate/cv-builder/page.tsx`
- Modify: `src/app/candidate/cv-builder/components/cv/CreateCard.tsx`
- Modify: `src/app/candidate/cv-builder/components/cv/UploadCard.tsx`
- Optional create: `src/components/candidate/cv-builder/CvWorkspaceEmptyState.tsx`

- [ ] **Step 1: Define expected no-CV behavior**

The empty state should:

- avoid a giant empty bordered box
- clearly emphasize `Tao CV moi` as the primary CTA
- keep `Tai CV len` as the secondary CTA
- reduce technical wording
- feel more centered and action-driven

- [ ] **Step 2: Run pre-change verification**

Open: `http://localhost:3000/candidate/cv-builder` with no saved CV  
Expected before implementation: the current empty state still feels large and passive

- [ ] **Step 3: Write minimal implementation**

When `resumes.length === 0`:

- replace the current large empty block with a compact, centered empty state
- make `Tao CV moi` visually dominant
- keep upload/import accessible but lighter
- shorten the copy
- remove pipeline-heavy wording from the main message

Do not change behavior when CVs already exist.

- [ ] **Step 4: Run verification**

Run:

```bash
npx eslint .\src\app\candidate\cv-builder\page.tsx .\src\app\candidate\cv-builder\components\cv\CreateCard.tsx .\src\app\candidate\cv-builder\components\cv\UploadCard.tsx
```

Manual check:

- empty state feels more actionable
- primary and secondary CTA hierarchy is clear
- existing upload/create handlers still work

- [ ] **Step 5: Commit**

```bash
git add src/app/candidate/cv-builder/page.tsx src/app/candidate/cv-builder/components/cv/CreateCard.tsx src/app/candidate/cv-builder/components/cv/UploadCard.tsx
git commit -m "feat: polish cv workspace empty state"
```

---

## Final Verification

### Task 6: Verify the phased rollout end to end

**Files:**

- Verify all files touched in this plan

- [ ] **Step 1: Run automated verification**

Run:

```bash
npx tsx .\src\lib\candidate-profile-document.test.ts
npx eslint .\src\lib\candidate-profile-document.ts .\src\lib\candidate-profile-document.test.ts .\src\app\candidate\profile\page.tsx .\src\app\candidate\profile\CandidateProfileBuilderPage.tsx .\src\app\candidate\profile\stores\profileBuilderStore.ts .\src\components\recruitment\PublicCandidateProfileView.tsx .\src\app\candidate\cv-builder\page.tsx .\src\app\candidate\cv-builder\components\cv\CreateCard.tsx .\src\app\candidate\cv-builder\components\cv\UploadCard.tsx
```

Expected:

- helper test passes
- eslint returns exit code `0`

- [ ] **Step 2: Run manual product verification**

Check:

1. `/candidate/profile`
2. switch between `Edit` and `Preview`
3. confirm preview matches the public/recruiter profile body layout
4. confirm preview hides empty sections and edit controls
5. confirm edit mode still behaves like the current builder
6. `/candidate/cv-builder` with no CV
7. confirm `Tao CV moi` is the dominant action
8. confirm `Tai CV len` is still easy to find and works

- [ ] **Step 3: Commit final integration**

```bash
git add .
git commit -m "feat: add candidate profile preview and polish cv empty state"
```

---

## Notes

- This plan is intentionally scoped. It does not replace `/candidate/profile` with a new builder.
- The current builder remains the edit mode.
- Preview should reuse public/recruiter rendering as much as possible instead of inventing a second display system.
- No database migration is expected for this phase unless the target environment is missing existing profile document support.
