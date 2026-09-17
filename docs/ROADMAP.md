# Civic Pulse — Implementation Roadmap

**File:** `docs/ROADMAP.md`
**Purpose:** Phase-by-phase implementation plan
**Project scope:** Local university course project

---

# 1. Purpose

This document defines the order in which Civic Pulse should be implemented.

It does not redefine product behavior, architecture, or database design.

Refer to:

* `PRODUCT_SPEC.md` — what Civic Pulse should do;
* `ARCHITECTURE.md` — how the system is structured;
* `DATABASE.md` — target schema, relationships, and permissions.

This roadmap answers:

> What should we build next, and when is each phase complete?

---

# 2. Development Strategy

Civic Pulse will be implemented **one phase at a time**.

Codex should understand the full product and architecture before starting, but should implement only the requested phase.

For every phase:

1. read `AGENTS.md`;
2. read relevant project docs;
3. inspect the current implementation;
4. preserve working functionality;
5. implement the complete requested phase;
6. run relevant frontend/backend validation;
7. verify the phase acceptance criteria;
8. update this roadmap only after the phase is complete.

Do not implement future phases merely because they are described below.

---

# 3. Phase Status

Use:

```text id="0zj93c"
[ ] Not started
[~] In progress
[x] Complete
```

Current roadmap:

```text id="06yc84"
[x] Phase 0 — Foundation & Stabilization
[x] Phase 1 — Issue Lifecycle
[ ] Phase 2 — Community & Feed
[ ] Phase 3 — Following & Notifications
[ ] Phase 4 — Admin Operations
[ ] Phase 5 — Map & Discovery
[ ] Phase 6 — Smart Features
[ ] Phase 7 — Polish & Demo Readiness
```

---

# 4. Existing Project Baseline

Civic Pulse is not a greenfield project.

The repository already contains the foundation for:

* Next.js frontend;
* Supabase authentication;
* Supabase reports;
* image uploads;
* report creation;
* map location selection;
* public map;
* My Reports;
* basic admin approvals;
* report statuses;
* realtime report updates;
* Spring Boot;
* prototype duplicate detection.

The roadmap should evolve this implementation rather than unnecessarily rewriting it.

Existing working UI and behavior should be reused wherever reasonable.

---

# 5. Phase 0 — Foundation & Stabilization

**Status:** `[x]`

## Goal

Make the existing application internally correct and reliable before adding major new features.

This phase fixes architectural and data-integrity problems already present in the project.

---

## Scope

### Authentication and Roles

Ensure normal registration always creates a Citizen.

Remove the ability for public signup to grant Administrator privileges.

Maintain a simple trusted method for preparing demo admin accounts.

---

### Authorization

Align frontend behavior with Supabase RLS.

Citizens should be able to edit their own reports only while the report is still:

```text id="mdfwnd"
Reported
```

Administrative operations must remain admin-only.

Remove or fix UI actions that cannot succeed because of current RLS policies.

---

### Persistent Reactions

Replace the current frontend-only upvote behavior with database-backed civic interaction.

Begin migration toward:

```text id="00zuhp"
affected
confirmed
```

The state must survive page refresh.

The old upvote system should not remain as a permanent parallel interaction model.

---

### Shared Domain Definitions

Create centralized frontend definitions for:

* report statuses;
* categories;
* roles;
* reaction types;
* core TypeScript models.

Remove obvious duplicate/inconsistent definitions when touching related code.

---

### Configuration

Remove hardcoded Spring API addresses from feature components.

Use appropriate local environment configuration.

Example:

```text id="fwuxcz"
NEXT_PUBLIC_API_BASE_URL=http://localhost:8082
```

---

### Upload Reliability

Add basic image validation:

* supported type;
* reasonable size;
* useful upload errors.

Do not build unnecessary media infrastructure.

---

### Current Feature Reliability

Verify that these existing workflows work correctly:

* register;
* login;
* logout;
* create report;
* upload image;
* select map location;
* view map reports;
* view My Reports;
* citizen edit where permitted;
* admin status update;
* civic reaction persistence.

---

## Phase 0 Acceptance Criteria

Phase 0 is complete when:

* normal signup cannot create an admin;
* Citizen/Admin permissions agree with RLS;
* eligible Citizen report editing works;
* unauthorized editing fails;
* civic reactions persist after refresh;
* existing report creation still works;
* image uploads work with basic validation;
* API URLs are not scattered/hardcoded in components;
* shared statuses/categories/types are consistent;
* frontend builds successfully;
* Spring backend verification succeeds.

No major new product feature is required during this phase.

---

# 6. Phase 1 — Issue Lifecycle

**Status:** `[x]`

## Goal

Turn each report into a complete Civic Issue with a real lifecycle and dedicated detail page.

This phase establishes the central product experience.

---

## Scope

### Issue Detail Page

Create:

```text id="t7pr0a"
/issues/[id]
```

The page should show:

* title;
* category;
* status;
* description;
* issue image;
* reporter information where appropriate;
* report date;
* location;
* mini map;
* assigned department when available;
* community counts where available.

---

### Status History

Add persistent status-history support.

The lifecycle timeline must come from stored events rather than being inferred from current status.

Display the history on the Issue Detail page.

---

### Departments

Add department data and assignment relationship.

Seed the initial departments defined in `DATABASE.md`.

---

### Workflow Statuses

Support the target lifecycle:

```text id="rvskl7"
Reported
   ↓
Verified
   ↓
Assigned
   ↓
In Progress
   ↓
Resolved
```

and special states:

```text id="1ckf68"
Rejected
Duplicate
Reopened
```

---

### Trusted Status Changes

Introduce a reliable status-change operation that keeps:

* current report status;
* history;
* relevant timestamps;

consistent.

Notification generation may be added later in Phase 3.

---

### Resolution

Support:

* resolution note;
* resolved date;
* resolution image.

Resolved issues should display a clear:

```text id="hl8dv0"
BEFORE → AFTER
```

experience when both images are available.

---

### Issue Navigation

Existing surfaces should open the Issue Detail page.

At minimum:

* My Reports;
* map markers;
* admin report views.

Feed integration may be completed in Phase 2.

---

## Phase 1 Acceptance Criteria

Phase 1 is complete when:

* every report can be opened at `/issues/[id]`;
* Issue Detail displays core report information;
* departments exist and may be assigned;
* status changes create real history;
* the timeline survives refresh;
* the full main lifecycle works;
* rejected and duplicate states are supported;
* resolved reports support resolution notes;
* resolution evidence can be displayed;
* resolved reports can show Before/After evidence;
* existing report/map functionality still works;
* frontend and backend validation succeed.

---

# 7. Phase 2 — Community & Feed

**Status:** `[ ]`

## Goal

Turn Civic Pulse from a report tracker into a community-driven civic platform.

---

## Scope

### Comments

Citizens can:

* view comments;
* add comments;
* edit/delete their own comments where supported.

Administrators can participate in discussions.

Administrator comments should display an official indicator.

Comments remain flat.

Do not add nested reply systems.

---

### Civic Reactions

Complete the target reaction model:

```text id="0ej4yn"
I'm Affected
I Can Confirm
```

Users may toggle each reaction independently.

Counts must come from persistent database data.

---

### Community Information

Issue Detail should display:

* affected count;
* confirmation count;
* comments;
* relevant community activity.

---

### Public Feed

Transform the main application experience into a useful civic issue feed.

Initial feed sorting:

```text id="bmqfl6"
Latest
Most Affected
Recently Updated
```

Each feed item should show enough information to understand the issue quickly.

Selecting it opens:

```text id="p9n8va"
/issues/[id]
```

---

### Realtime Community Updates

Where practical, use Supabase Realtime for:

* comments;
* reactions;
* newly reported issues.

The application must still remain correct after refresh.

---

## Phase 2 Acceptance Criteria

Phase 2 is complete when:

* Citizens can add comments;
* comments persist;
* admin comments are visually recognizable;
* affected reactions persist;
* confirmation reactions persist;
* duplicate reactions are prevented;
* counts remain correct after refresh;
* the homepage provides useful issue discovery;
* feed cards navigate to Issue Detail;
* community interactions update correctly;
* existing lifecycle/admin behavior remains functional.

---

# 8. Phase 3 — Following & Notifications

**Status:** `[ ]`

## Goal

Allow Citizens to subscribe to important issues and receive progress updates.

---

## Scope

### Following

Users can:

* follow an issue;
* unfollow an issue;
* see whether they currently follow it.

Following remains independent from reactions.

---

### Notification Data

Add persistent notifications.

Users should receive appropriate notifications for important events affecting:

* their own reports;
* reports they follow.

---

### Initial Notification Events

Support useful events such as:

```text id="8wkc89"
STATUS_CHANGED
NEW_COMMENT
OFFICIAL_UPDATE
REPORT_RESOLVED
REPORT_REOPENED
```

Avoid duplicate notifications for the same user/event.

---

### Notification Interface

Add:

* notification bell;
* unread count;
* notification list;
* read/unread behavior;
* `/notifications` page.

Selecting a report notification should open the relevant Issue Detail page.

---

### Realtime Notifications

Use Supabase Realtime to update unread notification state where practical.

Notifications must still persist when the user is offline.

---

## Phase 3 Acceptance Criteria

Phase 3 is complete when:

* users can follow/unfollow reports;
* follow state persists;
* relevant workflow events create notifications;
* notifications are private to their recipient;
* unread count works;
* notifications may be marked read;
* notification links open the correct issue;
* offline notifications remain visible later;
* realtime updates work where implemented.

---

# 9. Phase 4 — Admin Operations

**Status:** `[ ]`

## Goal

Turn the existing approvals screen into a convincing civic operations workspace.

---

## Scope

### Admin Overview

Provide useful summary information such as:

* open reports;
* reported reports;
* verified reports;
* in-progress reports;
* resolved reports;
* recent activity;
* common categories;
* oldest unresolved issues.

---

### Report Management

Improve administrative report management with:

* search;
* status filters;
* category filters;
* report detail access;
* verification;
* rejection;
* assignment;
* status changes;
* duplicate marking;
* resolution;
* reopening.

---

### Department Workflow

Administrators should be able to assign and change departments appropriately.

---

### Official Communication

Allow admins to provide useful public updates through the chosen community/workflow mechanism.

Avoid creating redundant communication systems unnecessarily.

---

### Resolution Workflow

Make resolution easy and deliberate.

Admin should be able to provide:

* resolution note;
* optional after-photo;
* final status update.

---

### Basic Moderation

Support only necessary moderation such as removing clearly inappropriate:

* comments;
* reports where destructive removal is genuinely appropriate.

Prefer workflow statuses over deletion for legitimate civic reports.

---

## Phase 4 Acceptance Criteria

Phase 4 is complete when:

* the admin workspace summarizes civic activity;
* admins can efficiently filter reports;
* the complete administrative lifecycle can be managed;
* department assignment works;
* duplicate handling works;
* rejection works;
* resolution workflow works;
* reopening works;
* normal Citizens cannot access admin mutations;
* analytics reflect real database data.

---

# 10. Phase 5 — Map & Discovery

**Status:** `[ ]`

## Goal

Make geographic discovery one of Civic Pulse's strongest visual features.

---

## Scope

Improve the existing map rather than replacing it.

### Public Map

Add:

* category-based visual distinction;
* status-based visual distinction;
* category filtering;
* status filtering;
* useful issue previews;
* direct Issue Detail navigation.

---

### Marker Management

Add marker clustering if the library/integration remains simple and reliable.

---

### Location Experience

Improve location interaction with useful features such as:

* current location where browser permission allows;
* clearer selected-location behavior;
* better report-location labels.

---

### Nearby Issues

Where practical, show nearby issues during discovery or reporting.

This may also support duplicate detection UX.

---

### Optional Heatmap

Heatmaps are a stretch feature.

Implement only if the rest of Phase 5 is complete and the feature adds clear demonstration value.

---

## Phase 5 Acceptance Criteria

Phase 5 is complete when:

* map markers clearly communicate issue differences;
* users can filter the public map;
* map previews provide useful report information;
* markers link to Issue Detail;
* dense markers remain usable;
* report location selection remains stable;
* map improvements do not introduce a second mapping framework.

---

# 11. Phase 6 — Smart Features

**Status:** `[ ]`

## Goal

Make the Spring Boot intelligence layer meaningfully enhance Civic Pulse.

Core functionality must already work before this phase begins.

---

## Scope

### Duplicate Detection V2

Improve the existing prototype.

Evaluate candidates using appropriate combinations of:

* geographic distance;
* category;
* title similarity;
* description similarity.

Return useful candidate reports rather than only:

```text id="0ah9hl"
true / false
```

---

### Duplicate UX

Before creating a report, present likely existing issues.

Allow the Citizen to choose:

```text id="jgnfmx"
This is the same issue
```

or:

```text id="w1uxfd"
This is a different issue
```

Selecting the same issue should direct the Citizen toward the existing issue and appropriate community interaction.

---

### Category Suggestion

Given report text, suggest an appropriate category.

The Citizen remains responsible for confirmation.

---

### Department Recommendation

Suggest a department to the Administrator.

The Administrator remains responsible for final assignment.

---

### Optional Smart Features

If time remains:

* title suggestion;
* discussion summary.

These are lower priority than duplicate detection and classification.

---

## AI/Intelligence Rule

Smart features must remain advisory.

The system should not automatically:

* reject reports;
* delete reports;
* resolve reports;
* assign irreversible administrative decisions;

without user/admin confirmation.

---

## Phase 6 Acceptance Criteria

Phase 6 is complete when:

* duplicate detection returns useful candidate reports;
* duplicate suggestions are presented through proper UI;
* Citizens can choose existing vs new issue;
* category suggestion works if implemented;
* department recommendation works if implemented;
* smart features fail gracefully if Spring is unavailable;
* core report creation still works reliably.

---

# 12. Phase 7 — Polish & Demo Readiness

**Status:** `[ ]`

## Goal

Prepare Civic Pulse for a smooth, convincing university demonstration.

No major architecture should be introduced in this phase.

---

## Scope

### UX Polish

Review:

* loading states;
* error states;
* empty states;
* disabled actions;
* confirmation dialogs;
* responsive layouts;
* navigation;
* consistent status/category styling.

---

### Accessibility

Perform reasonable improvements such as:

* form labels;
* keyboard accessibility;
* button semantics;
* image alt text;
* readable contrast.

---

### Demo Data

Prepare realistic demonstration data.

The final demo should include examples of:

* Reported;
* Verified;
* Assigned;
* In Progress;
* Resolved;
* Duplicate.

Also prepare:

* comments;
* reactions;
* followers;
* notifications;
* status history;
* resolution evidence.

---

### Demo Accounts

Prepare at least:

```text id="s9ss94"
Citizen account
Administrator account
```

Ensure login details/setup are easy for the project team to reproduce.

Do not weaken normal signup authorization for demonstration convenience.

---

### Documentation

Update:

* README;
* setup instructions;
* environment examples;
* project architecture overview;
* final feature list.

Documentation should describe what was actually implemented, not merely planned.

---

### Cleanup

Remove or clearly isolate obsolete functionality that could confuse the demonstration.

Examples may include:

* abandoned upvote behavior;
* unused components;
* obsolete status logic;
* experimental features no longer used.

Do not perform risky large refactors immediately before presentation.

---

### Final Verification

Test the complete demonstration workflow.

---

# 13. Final Demo Flow

The final project should reliably demonstrate:

```text id="kj0xgw"
Citizen logs in
      ↓
Creates civic report
      ↓
Selects category
      ↓
Selects map location
      ↓
Uploads evidence
      ↓
System checks duplicates
      ↓
Report is submitted
      ↓
Other Citizens discover it
      ↓
Affected / Confirmed reactions
      ↓
Community comments
      ↓
Citizen follows issue
      ↓
Admin verifies issue
      ↓
Admin assigns department
      ↓
Issue enters In Progress
      ↓
Followers receive updates
      ↓
Admin adds resolution
      ↓
Admin uploads after-photo
      ↓
Issue becomes Resolved
      ↓
Full history + Before/After visible
```

This is the primary success scenario for Civic Pulse.

---

# 14. Final Completion Criteria

Civic Pulse is considered project-complete when:

* the main demo flow works reliably;
* authorization behaves correctly;
* persistent data survives refresh;
* Issue Detail is the central report view;
* community interactions work;
* status history is real;
* notifications work;
* admin workflow is complete;
* map discovery is useful;
* duplicate detection is integrated;
* resolution evidence works;
* frontend builds successfully;
* backend verification succeeds;
* setup can be reproduced by the project team.

---

# 15. Scope Control

When time becomes limited, prioritize in this order:

```text id="62dg25"
Phase 0 — Foundation
Phase 1 — Issue Lifecycle
Phase 2 — Community
Phase 4 — Admin Operations
Phase 3 — Notifications
Phase 5 — Map improvements
Phase 6 — Smart features
Phase 7 — optional polish
```

However, basic Phase 7 demo preparation must always be performed before presentation.

If necessary, cut optional features before weakening core functionality.

First features to cut:

* heatmap;
* discussion summaries;
* title suggestions;
* advanced analytics;
* advanced moderation;
* news scanning.

Do not cut:

* secure roles;
* report creation;
* Issue Detail;
* status history;
* admin lifecycle;
* civic reactions;
* resolution workflow.

---

# 16. Roadmap Rule

Codex should always know the entire roadmap.

Codex should only implement **one requested phase at a time**.

A phase is complete only when its acceptance criteria are satisfied.

Do not mark a phase complete merely because code was written.

The implementation order exists to protect the core Civic Pulse flow:

**REPORT → VERIFY → DISCUSS → ACT → RESOLVE**
