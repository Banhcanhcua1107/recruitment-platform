# Jobs Page Refactor Design

**Date:** 2026-03-27  
**Status:** Approved for implementation

## Decision

Refactor the public `/jobs` page to follow the rendered HTML layout in `docs/jobs.txt` while preserving all existing jobs-page behavior:

- job fetching via `getAllJobs()`
- search, filters, sorting, pagination / load-more style page stepping
- routing to job detail pages
- current state management and event flows

The new page body is split into two visible layers:

1. `Việc làm đề xuất cho bạn`
2. `Tất cả việc làm`

## Goal

Make recommendation content visible immediately when users open `/jobs`, without breaking the current all-jobs browsing flow.

## Product Rules

- Recommendation must never replace the existing jobs listing
- Recommendation must never alter filter, sort, search, pagination, or routing behavior for the all-jobs section
- Recommendation should auto-load from the existing dashboard/API recommendation flow when cached or available
- If recommendation data is unavailable or unusable, the page still keeps the section shell and shows a clear CTA
- The UI stays in Vietnamese and keeps the blue / white / gray visual identity

## Recommendation Behavior

### Auto-load priority

On initial page load, the recommendation layer should try the same data flow already used by candidate recommendation UX:

- cached response from `GET /api/recommend-jobs`
- local cache created by the candidate dashboard flow

### Three visible states

The recommendation section must always render in the layout and support:

1. `Loading`
   - render skeleton cards
2. `Ready`
   - render recommendation cards bound to real job data
   - optionally show candidate-summary context and suggested tags when available
3. `Empty / Not usable`
   - keep the section visible
   - show CTA to analyze from profile and a secondary path to update profile / CV

### Manual trigger

If auto-load cannot produce usable recommendations, the user can trigger recommendation analysis from the section CTA. This should reuse the existing `/api/recommend-jobs` POST flow rather than introducing new business logic.

## Page Architecture

Keep `src/app/(public)/jobs/page.tsx` as the server entry that fetches `jobs` with `getAllJobs()`.

Refactor `JobFiltersClient` into a client container that coordinates:

- existing jobs-page state
- extracted pure filtering helpers
- recommendation hook
- presentational subcomponents for hero, recommendation, filters, listing, and pagination

## Component Direction

Recommended sub-areas:

- hero search area
- recommendation section
- filter sidebar / mobile drawer
- all-jobs results area
- job cards and pagination controls

The HTML from `docs/jobs.txt` is a layout and styling reference only. It must be converted into maintainable React components wired to existing logic and live data.

## Logic Preservation

The refactor must preserve current behavior for:

- keyword search
- location filter
- level filter
- employment type filter
- industry filter
- salary filter
- employer test mode
- active filter chips
- clear-all actions
- sorting
- pagination
- mobile filter drawer

## Testing Direction

Lock the refactor with tests for extracted pure helpers:

- filter / sort behavior
- pagination slicing
- recommendation source resolution

This keeps the refactor from silently changing business behavior while the UI structure is rewritten.
