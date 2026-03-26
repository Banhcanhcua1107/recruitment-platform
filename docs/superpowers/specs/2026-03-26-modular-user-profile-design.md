# Candidate Profile Preview and CV Empty State Design

**Date:** 2026-03-26  
**Status:** Scoped rollout approved

## Decision

This rollout is intentionally phased and narrow in scope:

1. Keep the current `/candidate/profile` builder and edit workflow
2. Add an `Edit / Preview` toggle so candidates can preview the same profile layout recruiters see
3. Then polish the no-CV empty state in `/candidate/cv-builder`

This is not a full profile-builder rebuild.

## Goal

Reduce the gap between:

- what candidates edit in their profile builder
- what recruiters see in the public profile

and make the CV workspace feel more actionable when the user has not created any CV yet.

## Scope

This design covers:

- `/candidate/profile` edit and preview mode switching
- candidate preview rendering that reuses the public/recruiter profile layout
- `/candidate/cv-builder` empty state when the candidate has no saved CV

This design does not cover:

- replacing the existing builder with a new builder system
- introducing a new profile data model
- changing recruiter search behavior
- new database tables or migrations for this phase

## Product Direction

The current builder remains the editing surface for candidates.

Candidates must still be able to:

- add sections
- edit sections
- delete sections
- reorder sections
- control public visibility

The new work adds a preview experience on top of the existing builder, not instead of it.

## Phase 1: Edit / Preview in `/candidate/profile`

### Behavior

Add a top-level mode toggle on `/candidate/profile`:

- `Edit`
- `Preview`

#### Edit mode

Edit mode keeps the current builder behavior:

- all existing editing controls remain available
- enabled sections continue to render in the builder
- empty enabled sections can still show CTA guidance such as `Them thong tin`
- add-section and section-management workflows remain unchanged

#### Preview mode

Preview mode is read-only and should feel like the recruiter/public profile:

- reuse the same layout structure as the public/recruiter profile
- show no edit controls
- show no builder placeholders
- show no empty section shells

Only render sections that satisfy all of the following:

- `enabled = true`
- `publicVisible = true`
- `hasData = true`

### UX Goal

Candidates should be able to answer this question instantly:

> "Is this what a recruiter will actually see?"

Preview should make visibility and completeness obvious without requiring users to leave their editing workflow.

### Rendering Principle

Preview should reuse the public/recruiter profile layout rather than creating a second visual language.

That means:

- same hero structure
- same card and section rhythm
- same filtering rules
- same ordering logic

Small context-specific differences are acceptable only where necessary, such as local page chrome or action buttons, but the profile body should remain visually aligned.

### Data Contract

This phase assumes the current builder already works with section-based profile data.

Preview and public rendering should rely on shared helpers that:

- resolve the current profile document
- order sections
- determine whether a section is public-visible
- determine whether a section has meaningful data
- return the final renderable section list

If a temporary compatibility layer for legacy flat profile fields still exists, it remains unchanged in this phase.

## Phase 2: CV Workspace Empty State Polish

### Trigger

Apply this redesign only when the user has no saved CV in `/candidate/cv-builder`.

If CVs already exist, keep the current populated-state structure.

### Behavior

Replace the current large empty-state box with a more action-driven empty state.

Primary action:

- `Tao CV moi`

Secondary action:

- `Tai CV len`

### UX Goal

The screen should guide the user toward creating or uploading their first CV quickly.

It should feel:

- lighter
- less empty
- less technical
- more obviously actionable

### Content Rules

Keep the empty state short:

- one short title
- one short helper line
- one strong primary CTA
- one lighter secondary CTA

Remove technical language from the main empty-state message, including:

- OCR wording
- pipeline wording
- queue or artifact details

Those concepts can remain elsewhere in the product, but not as the main empty-state guidance.

### Layout Rules

For the no-CV state:

- center the content more clearly
- reduce the sense of a giant empty box
- use icon or illustration plus concise copy
- make the primary action visually dominant
- keep the secondary action visible but lighter

## Database and Backend Impact

No new database schema is required for this rollout.

No API or business-logic changes are required by the design itself.

The scope is presentation and rendering alignment:

- edit mode remains current builder behavior
- preview mode reuses current public rendering patterns
- CV workspace empty state changes only affect the no-CV UI path

## Risks

### Preview drift

Risk:

- candidate preview and recruiter/public profile could diverge later

Mitigation:

- reuse shared section filtering helpers
- reuse the same layout building blocks for preview and public display

### Builder regression

Risk:

- adding preview mode accidentally changes edit behavior

Mitigation:

- keep preview additive only
- avoid modifying section-management logic unless required for rendering

### Empty-state regression

Risk:

- making the empty state cleaner could accidentally bury upload/import access

Mitigation:

- keep existing actions and handlers intact
- change only hierarchy, layout, and messaging

## Success Criteria

The rollout is successful when:

- `/candidate/profile` has a working `Edit / Preview` toggle
- preview uses the public/recruiter profile layout
- preview only renders sections that are enabled, public-visible, and non-empty
- edit mode remains unchanged in behavior
- `/candidate/cv-builder` feels action-driven when there is no CV
- `Tao CV moi` is the clear primary action in the empty state
- `Tai CV len` remains easy to find as a secondary action

## Recommendation

Implement this as a phased UX alignment rollout:

1. Add profile preview first
2. Validate visual consistency between candidate preview and recruiter/public view
3. Then polish the no-CV empty state in the CV workspace
