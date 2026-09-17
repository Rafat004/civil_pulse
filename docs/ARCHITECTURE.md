# Civic Pulse — System Architecture

**File:** `docs/ARCHITECTURE.md`
**Purpose:** Technical architecture source of truth
**Project scope:** Local university course project

---

# 1. Purpose

This document defines **how Civic Pulse is built**.

It establishes:

* system boundaries;
* responsibility ownership;
* frontend organization;
* data flow;
* authentication and authorization rules;
* Spring Boot responsibilities;
* realtime, storage, and map architecture;
* implementation constraints.

Related documents:

* `PRODUCT_SPEC.md` — what the product should do;
* `DATABASE.md` — schema, relationships, constraints, and RLS;
* `ROADMAP.md` — implementation order.

Do not duplicate those documents here.

---

# 2. Architecture Overview

Civic Pulse uses three primary layers:

```text
┌─────────────────────────────┐
│          NEXT.JS            │
│                             │
│ UI                          │
│ Routing                     │
│ Forms                       │
│ Maps                        │
│ Auth state                  │
│ Realtime UI                 │
└──────────────┬──────────────┘
               │
               │ Supabase SDK
               ▼
┌─────────────────────────────┐
│          SUPABASE           │
│                             │
│ PostgreSQL                  │
│ Authentication              │
│ Storage                     │
│ Realtime                    │
│ Row Level Security          │
└─────────────────────────────┘

               ▲
               │ analysis / data access
               │
┌──────────────┴──────────────┐
│        SPRING BOOT          │
│                             │
│ Duplicate detection         │
│ Classification              │
│ Recommendations             │
│ Civic intelligence          │
└─────────────────────────────┘
```

Primary responsibility rule:

```text
Next.js     → presentation and interaction
Supabase    → persistent state and authorization
Spring Boot → analysis and intelligence
```

---

# 3. Core Architectural Decision

Normal application CRUD goes directly between Next.js and Supabase.

Examples:

* create reports;
* read reports;
* add comments;
* add/remove reactions;
* follow/unfollow issues;
* read notifications;
* update notification state.

Preferred flow:

```text
Next.js
   ↓
Supabase
   ↓
PostgreSQL
```

Spring Boot must **not** become a duplicate CRUD backend.

Avoid this architecture:

```text
Next.js
   ↓
Spring Boot CRUD API
   ↓
Supabase
```

for ordinary application operations.

Spring exists only where a dedicated computation layer adds clear value.

---

# 4. Technology Stack

## Frontend

* Next.js 16
* React 19
* TypeScript
* Tailwind CSS
* shadcn/ui where useful
* Leaflet / React Leaflet
* Recharts

## Platform

* Supabase PostgreSQL
* Supabase Auth
* Supabase Storage
* Supabase Realtime
* Supabase RLS

## Intelligence Backend

* Java
* Spring Boot 3
* Maven

Do not introduce competing core technologies without a strong project need.

Avoid unnecessary additions such as:

* another database;
* another authentication system;
* another general backend framework;
* another mapping framework;
* another global state framework.

---

# 5. Local Development Scope

Expected services:

```text
Frontend:
http://localhost:3000

Spring Boot:
http://localhost:8082

Supabase:
configured development project
```

The project does not require production deployment.

Do not spend project time on:

* Kubernetes;
* autoscaling;
* production monitoring platforms;
* complex Docker orchestration;
* CDN architecture;
* enterprise infrastructure;
* CI/CD unless explicitly required.

Local reliability and demo quality are the priority.

---

# 6. Next.js Responsibilities

Next.js owns:

* page rendering;
* routing;
* forms;
* user interaction;
* map UI;
* authentication state;
* loading/error states;
* Supabase calls;
* realtime subscriptions;
* Spring API calls;
* displaying suggestions;
* administrative UI.

Next.js does **not** own authoritative security rules.

Client-side checks improve UX but do not replace database authorization.

---

# 7. Supabase Responsibilities

Supabase owns:

* persistent application data;
* authentication;
* authorization through RLS;
* relationships;
* uploaded files;
* realtime data events.

PostgreSQL is the source of truth.

Persistent state must survive:

* refresh;
* logout/login;
* browser restart.

Examples include:

* reports;
* comments;
* reactions;
* followers;
* status;
* history;
* notifications;
* department assignments;
* resolution data.

---

# 8. Spring Boot Responsibilities

Spring Boot handles specialized computation.

Target responsibilities:

* duplicate detection;
* similarity scoring;
* category suggestion;
* department recommendation;
* optional title suggestion;
* civic analytics;
* other smart/intelligence features.

Typical flow:

```text
Next.js
   ↓
Spring Boot
   ↓
analysis
   ↓
structured result
   ↓
Next.js
   ↓
Supabase if persistence is required
```

Spring generally returns a recommendation or analysis.

The user or administrator remains responsible for final decisions.

---

# 9. Spring Boot Non-Responsibilities

Do not add Spring endpoints solely to duplicate Supabase CRUD.

Avoid:

```text
POST /reports
GET /reports
PUT /reports/{id}
POST /comments
POST /followers
GET /notifications
```

unless a future architectural decision explicitly changes this rule.

Spring should not become the application's primary persistence API.

---

# 10. Frontend Routes

Target routes:

```text
/
├── auth/
│   ├── login/
│   └── register/
│
├── map/
│
├── issues/
│   └── [id]/
│
├── my-reports/
│
├── notifications/
│
└── approvals/
```

The current `/approvals` route may remain the administrator area.

Do not rename existing routes solely for cosmetic architectural consistency.

---

# 11. Issue Detail as Canonical View

The route:

```text
/issues/[id]
```

is the canonical detailed representation of a civic issue.

These surfaces should navigate to it:

```text
Home Feed
Map
My Reports
Notifications
Admin Workspace
```

Avoid creating several incompatible issue-detail experiences.

---

# 12. Frontend Organization

Target organization:

```text
frontend/src/

app/
components/
services/
hooks/
lib/
```

Responsibilities:

```text
app/
    routes and page composition

components/
    reusable feature and UI components

services/
    Supabase operations

hooks/
    reusable React behavior

lib/
    shared clients, types, constants, utilities
```

This is a gradual target.

Do not perform a large folder refactor simply to match this structure.

---

# 13. Component Organization

Components may be grouped by feature:

```text
components/
├── layout/
├── reports/
├── comments/
├── map/
├── notifications/
├── admin/
└── ui/
```

Keep features understandable.

Do not over-fragment components into tiny files without a clear reuse or readability benefit.

---

# 14. Service Layer

Substantial Supabase operations should preferably live outside large page components.

Prefer:

```text
Component
   ↓
Service
   ↓
Supabase
```

Example service modules:

```text
services/
├── reports.ts
├── comments.ts
├── reactions.ts
├── follows.ts
├── notifications.ts
└── admin.ts
```

Typical functions:

```text
getReports()
getReportById()
createReport()
updateOwnReport()
addComment()
toggleReaction()
followReport()
```

Small one-off queries may remain local if extracting them would add unnecessary complexity.

---

# 15. Shared Domain Types

Common domain types should be centralized.

Examples:

```text
Report
ReportStatus
ReportCategory
UserRole
Comment
ReactionType
Notification
Department
StatusHistoryEntry
```

Avoid defining incompatible versions of the same model in multiple components.

---

# 16. Shared Constants

Canonical values should have one frontend definition.

Examples:

```text
REPORT_STATUSES
REPORT_CATEGORIES
USER_ROLES
REACTION_TYPES
NOTIFICATION_TYPES
```

Avoid raw strings scattered across components.

This prevents inconsistencies such as:

```text
"In Progress"
"in progress"
"in-progress"
```

representing the same state.

---

# 17. Authentication

Supabase Auth remains the only authentication system.

Initial authentication:

* email;
* password.

The frontend may expose auth state through the existing provider pattern.

Typical values:

```text
user
role
loading
signOut
```

Do not add another auth provider unless a project requirement demands it.

---

# 18. Authorization

Supabase RLS is the security boundary.

Frontend role checks control what users see.

RLS controls what users can actually do.

Core rule:

```text
Frontend → visibility and UX
Database → permission
```

Hiding an admin button is not sufficient authorization.

---

# 19. Roles

Initial roles:

```text
civic
admin
```

Normal signup creates only:

```text
civic
```

A user must not be able to grant themselves administrator access from client-controlled signup data.

Because this is a local course project, admin accounts may be created through:

* seed/setup scripts;
* manual trusted database updates.

---

# 20. Data Ownership

The database owns persistent application truth.

React state may mirror database state for interaction.

It must not replace persistence.

Bad:

```text
User clicks upvote
→ React counter increases
→ no database write
```

Good:

```text
User reacts
→ UI may update optimistically
→ database mutation occurs
→ database remains authoritative
```

---

# 21. Optimistic UI

Optimistic updates are allowed.

If a mutation fails:

* revert the local update; or
* reload authoritative state.

Use optimistic UI only when failure handling remains clear.

---

# 22. Counts

Counts such as:

* affected users;
* confirmations;
* comments;

must come from database-backed data.

Preferred approaches:

1. count related rows;
2. maintain cached counters through trusted database logic.

Do not rely on client-side counters as authoritative state.

---

# 23. Report Lifecycle Architecture

The report stores its current status.

Status history stores transitions.

```text
reports.status
    → current state

report_status_history
    → historical state changes
```

The UI timeline should use stored history.

It should not infer the entire timeline from current status alone.

---

# 24. Trusted Workflow Operations

Operations that must update several related records should preferably use a trusted database operation.

Example status change:

```text
Admin changes status
        ↓
trusted DB operation
        ↓
update report
        ↓
create history
        ↓
create notifications
```

This prevents partial updates.

Exact function/RPC details belong in `DATABASE.md`.

---

# 25. Community Architecture

Community behavior attaches directly to reports.

```text
Report
├── reactions
├── comments
├── followers
└── notifications
```

Do not create a separate generic social-post system.

Civic Pulse does not need:

* user walls;
* friends;
* generic posts;
* following other users.

---

# 26. Reactions

Initial civic reactions:

```text
affected
confirmed
```

They are independent.

A user may use both.

A user must not repeatedly add the same reaction to the same report.

Generic likes/upvotes should not remain as a parallel long-term interaction model.

---

# 27. Comments

Comments attach directly to reports.

Initial architecture is flat.

Nested replies are not required.

Administrator comments may display an official badge based on trusted user role information.

---

# 28. Following

Following is separate from reactions.

A user may:

* follow without being affected;
* be affected without following;
* confirm without following.

Following represents interest in future updates.

---

# 29. Notifications

Notifications are persistent records.

Conceptual flow:

```text
Important event
      ↓
notification stored
      ↓
Realtime event
      ↓
frontend updates
```

Users should still see notifications created while they were offline.

---

# 30. Realtime

Supabase Realtime should be used where it improves the experience.

Good candidates:

* new reports;
* status changes;
* comments;
* reactions;
* notifications.

Realtime does not replace persistence.

Refreshing the page must restore the correct state.

Subscriptions must be cleaned up when no longer needed.

---

# 31. Storage

Supabase Storage owns uploaded media.

Primary uses:

* issue images;
* resolution images;
* optional profile avatars.

PostgreSQL stores the relevant storage path or URL.

Do not store image binary data directly inside normal database rows.

---

# 32. Upload Validation

Perform basic validation for:

* allowed image type;
* reasonable file size;
* failed uploads.

Advanced image-processing infrastructure is unnecessary for this project.

---

# 33. Map Architecture

Leaflet / React Leaflet remains the mapping framework.

The map supports two main use cases:

### Report creation

* choose location;
* search location;
* place marker.

### Public discovery

* display issue markers;
* show previews;
* filter issues;
* navigate to Issue Detail.

Reuse map components/utilities where practical.

Do not introduce another map framework without a strong reason.

---

# 34. Location Data

Latitude and longitude are the authoritative issue location.

A readable location label may also be stored/displayed.

Legacy zone data may remain temporarily while existing features depend on it.

New features should not deepen dependence on the legacy zone model.

---

# 35. Geocoding

The existing geocoding solution may continue if suitable.

Geocoding provides convenience.

Stored coordinates remain authoritative.

Do not introduce additional location infrastructure unless needed.

---

# 36. Duplicate Detection

Duplicate detection belongs in Spring Boot.

Input may include:

```text
latitude
longitude
title
description
category
```

Spring should return candidate matches rather than only a boolean.

Useful output:

```text
report ID
title
distance
similarity
reason
```

The algorithm recommends.

The user or administrator decides whether two reports are actually duplicates.

---

# 37. Smart Features

Other smart features follow the same principle:

```text
Input
 ↓
Spring analysis
 ↓
Suggestion
 ↓
User/Admin decision
```

Examples:

* category recommendation;
* department recommendation;
* title suggestion;
* discussion summary.

Smart services must not silently perform irreversible administrative actions.

---

# 38. Departments

Departments are application entities.

They are not authentication roles.

Reports may reference departments.

Do not build department-user accounts unless future product requirements explicitly require them.

---

# 39. Admin Workspace

The existing admin area should evolve incrementally.

It may contain:

```text
Overview
Reports
Workflow
Departments
Analytics
```

There is no need for a separate admin application.

---

# 40. Analytics

Use the simplest appropriate method.

Possible sources:

* Supabase queries;
* SQL views/functions;
* Spring analysis.

Examples:

* reports by status;
* reports by category;
* unresolved reports;
* resolved reports;
* simple resolution statistics.

Do not create a separate analytics platform.

---

# 41. Spring API Design

New Spring endpoints should:

* accept typed request models;
* validate inputs;
* return structured JSON;
* return useful errors.

Prefer normal Spring serialization over manually building JSON strings.

API endpoints should remain focused on intelligence responsibilities.

---

# 42. Configuration

Configuration values should not be hardcoded throughout components.

Examples:

```text
Spring API base URL
Supabase URL
Supabase client key
```

Use environment configuration where appropriate.

For example:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8082
```

Sophisticated environment management is unnecessary for the local project.

---

# 43. Secrets

Privileged server credentials must never appear in frontend code.

Public Supabase client credentials may be used as intended when RLS is correct.

Service-role or equivalent privileged credentials must remain server-side.

---

# 44. Error Handling

User-facing operations should explicitly represent:

* loading;
* success;
* failure;
* empty state.

Database/API failures should not be silently ignored.

Important operations include:

* report creation;
* image upload;
* reactions;
* comments;
* follows;
* admin workflow;
* notifications.

---

# 45. Validation

Validation belongs at appropriate layers.

Frontend:

* improve user experience.

Database:

* protect integrity and permissions.

Spring:

* protect service inputs.

Do not rely on only client-side validation for important rules.

---

# 46. Dependency Policy

Prefer existing dependencies.

Add a package only when it:

* clearly solves a required problem;
* materially reduces complexity;
* is maintained.

Avoid adding dependencies for trivial helper functionality.

---

# 47. External Repository Policy

External repositories may be used for:

* algorithms;
* component inspiration;
* UX patterns;
* implementation references.

External code must:

* respect licensing;
* fit the existing stack;
* be understood before integration;
* be adapted to Civic Pulse.

Do not import another project's architecture wholesale.

---

# 48. Refactoring Policy

Refactor only when it supports the current implementation phase.

Avoid unrelated cleanup.

Example:

```text
Task:
Implement comments

Good scope:
- comment data access
- comment UI
- required shared types
- required permission changes

Bad scope:
- redesign authentication
- replace map framework
- reorganize entire frontend
```

---

# 49. Phase-Based Implementation

Codex should understand the full architecture but implement only the requested roadmap phase.

For each phase:

1. read relevant docs;
2. inspect current implementation;
3. implement the requested phase;
4. preserve existing working behavior;
5. run appropriate validation;
6. update roadmap status only after completion.

Do not implement future phases merely because they are documented.

---

# 50. Verification

Important functionality should be tested or manually verified.

Priority areas:

* authentication;
* authorization;
* report creation;
* report editing restrictions;
* status changes;
* reactions;
* comments;
* notifications;
* duplicate detection.

Frontend validation should include:

```bash
npm run build
```

Backend validation should include the repository's Maven test/build command, for example:

```bash
./mvnw test
```

---

# 51. Anti-Patterns

Avoid the following.

### Duplicate application backend

```text
Next.js → Spring CRUD → Supabase
```

for normal application data.

### Client-only authorization

Hidden UI controls being treated as security.

### Client-only persistence

React state being treated as permanent data.

### Giant components

One component owning:

* rendering;
* queries;
* mutations;
* permissions;
* subscriptions;
* business rules.

### Competing constants

Different files defining different statuses, categories, or roles.

### Premature infrastructure

Production-scale systems with no value to the local course project.

### Architecture drift

Changing the technology stack because copied code uses a different architecture.

---

# 52. Decision Priorities

When technical choices conflict, prioritize:

1. correct behavior;
2. data integrity;
3. authorization correctness;
4. simplicity;
5. maintainability;
6. demo quality;
7. optimization.

For Civic Pulse:

> Simple, coherent, and correct is preferred over unnecessary enterprise complexity.

---

# 53. Final Responsibility Map

```text
NEXT.JS

Owns:
- UI
- routing
- interaction
- forms
- maps
- frontend state
- realtime presentation


SUPABASE

Owns:
- authentication
- PostgreSQL
- persistent state
- authorization
- relationships
- storage
- realtime events


SPRING BOOT

Owns:
- duplicate detection
- similarity analysis
- classification
- recommendations
- specialized intelligence
```

---

# 54. Architecture Rule

Before adding functionality, ask:

> Is this presentation or interaction?

Use **Next.js**.

> Is this persistent data, authorization, storage, or relationships?

Use **Supabase**.

> Is this analysis, classification, similarity, or recommendation?

Use **Spring Boot**.

Do not introduce a fourth architectural layer unless an actual requirement cannot be solved cleanly by these three.
