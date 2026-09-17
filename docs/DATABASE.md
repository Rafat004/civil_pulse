# Civic Pulse — Database Design

**File:** `docs/DATABASE.md`
**Database:** Supabase PostgreSQL
**Purpose:** Database schema, integrity, and authorization source of truth

---

# 1. Purpose

This document defines the target data model for Civic Pulse.

It is the source of truth for:

* tables;
* columns;
* relationships;
* canonical values;
* constraints;
* ownership rules;
* Row Level Security expectations;
* status/history behavior;
* migration direction from the current schema.

Related documents:

* `PRODUCT_SPEC.md` — product behavior;
* `ARCHITECTURE.md` — system responsibilities;
* `ROADMAP.md` — implementation order.

---

# 2. Database Principles

The database is responsible for persistent application truth.

Important rules:

1. Supabase PostgreSQL is the primary datastore.
2. Supabase Auth manages authentication.
3. RLS is the authoritative permission layer.
4. Relationships should use foreign keys.
5. Important state must survive refresh and logout/login.
6. Client-side counters must not be authoritative.
7. Important workflow changes should create history.
8. Normal users must never be able to assign themselves admin privileges.
9. Database changes should be implemented through explicit migrations.

---

# 3. Target Core Tables

The target schema contains:

```text
profiles
departments
reports
report_status_history
report_reactions
comments
report_followers
notifications
```

Current `upvotes` functionality should eventually be replaced by `report_reactions`.

---

# 4. Relationship Overview

```text
auth.users
   │
   ▼
profiles
   │
   ├──────────────┐
   │              │
   ▼              ▼
reports         comments
   │
   ├── report_status_history
   ├── report_reactions
   ├── report_followers
   └── notifications
   │
   ▼
departments
```

More precisely:

```text
auth.users
   │
   ├── profiles
   ├── reports
   ├── comments
   ├── report_reactions
   ├── report_followers
   └── notifications

reports
   ├── department
   ├── duplicate_of → reports
   ├── status history
   ├── reactions
   ├── comments
   ├── followers
   └── notifications
```

---

# 5. Canonical Values

## Roles

```text
civic
admin
```

## Report statuses

```text
Reported
Verified
Assigned
In Progress
Resolved
Rejected
Duplicate
Reopened
```

## Report reactions

```text
affected
confirmed
```

## Notification types

Initial values:

```text
STATUS_CHANGED
NEW_COMMENT
OFFICIAL_UPDATE
REPORT_RESOLVED
REPORT_REOPENED
```

These values must remain consistent across database and frontend code.

---

# 6. `profiles`

Purpose:

Store Civic Pulse-specific user information linked to Supabase Auth.

## Schema

| Column       | Type        | Rules                     |
| ------------ | ----------- | ------------------------- |
| `id`         | UUID        | PK, FK → `auth.users.id`  |
| `full_name`  | TEXT        | nullable                  |
| `role`       | TEXT        | not null, default `civic` |
| `avatar_url` | TEXT        | nullable                  |
| `created_at` | TIMESTAMPTZ | not null, default `now()` |
| `updated_at` | TIMESTAMPTZ | not null, default `now()` |

Recommended relationship:

```text
profiles.id
    → auth.users.id
    ON DELETE CASCADE
```

## Role constraint

```sql
CHECK (role IN ('civic', 'admin'))
```

## Signup behavior

New authenticated users should automatically receive a profile.

Normal signup must always create:

```text
role = 'civic'
```

User-controlled signup metadata must not be trusted to assign admin privileges.

Safe metadata such as `full_name` may be copied during profile creation.

---

# 7. `departments`

Purpose:

Represent the department responsible for handling an issue.

## Schema

| Column        | Type        | Rules                     |
| ------------- | ----------- | ------------------------- |
| `id`          | UUID        | PK                        |
| `name`        | TEXT        | not null, unique          |
| `description` | TEXT        | nullable                  |
| `created_at`  | TIMESTAMPTZ | not null, default `now()` |

Initial seed values:

```text
Roads & Infrastructure
Waste Management
Water & Drainage
Electricity & Lighting
Public Safety
Parks & Public Spaces
```

Departments are application entities, not authentication roles.

---

# 8. `reports`

`reports` is the central Civic Pulse table.

## Target schema

| Column                 | Type             | Rules                           |
| ---------------------- | ---------------- | ------------------------------- |
| `id`                   | UUID             | PK                              |
| `user_id`              | UUID             | not null, FK → `auth.users.id`  |
| `title`                | TEXT             | not null                        |
| `description`          | TEXT             | not null                        |
| `category`             | TEXT             | not null                        |
| `status`               | TEXT             | not null, default `Reported`    |
| `lat`                  | DOUBLE PRECISION | not null                        |
| `lng`                  | DOUBLE PRECISION | not null                        |
| `location_label`       | TEXT             | nullable                        |
| `department_id`        | UUID             | nullable, FK → `departments.id` |
| `duplicate_of`         | UUID             | nullable, FK → `reports.id`     |
| `image_url`            | TEXT             | nullable                        |
| `resolution_note`      | TEXT             | nullable                        |
| `resolution_image_url` | TEXT             | nullable                        |
| `resolved_at`          | TIMESTAMPTZ      | nullable                        |
| `created_at`           | TIMESTAMPTZ      | not null, default `now()`       |
| `updated_at`           | TIMESTAMPTZ      | not null, default `now()`       |

---

# 9. Report Foreign Keys

## Reporter

```text
reports.user_id
    → auth.users.id
```

Recommended:

```text
ON DELETE CASCADE
```

## Department

```text
reports.department_id
    → departments.id
```

Recommended:

```text
ON DELETE SET NULL
```

## Duplicate relation

```text
reports.duplicate_of
    → reports.id
```

Recommended:

```text
ON DELETE SET NULL
```

A report should not point to itself as a duplicate.

---

# 10. Report Categories

Canonical categories:

```text
Roads & Infrastructure
Waste & Sanitation
Water & Drainage
Electricity & Lighting
Public Safety
Parks & Public Spaces
Other
```

Frontend code should define these centrally.

Database check constraints may be added once the list is considered stable.

Do not create slightly different category strings for the same concept.

---

# 11. Report Statuses

Canonical statuses:

```text
Reported
Verified
Assigned
In Progress
Resolved
Rejected
Duplicate
Reopened
```

The primary flow is:

```text
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

Special transitions include:

```text
Reported → Rejected
Reported → Duplicate
Verified → Duplicate
Resolved → Reopened
Reopened → In Progress
```

Do not introduce new status values without updating the project documentation and shared frontend constants.

---

# 12. Report Editing Rules

Citizens may edit their own report only while:

```text
status = 'Reported'
```

Citizen-editable content may include:

* title;
* description;
* category;
* location;
* issue image.

Citizens must not directly change:

* status;
* department;
* duplicate relationship;
* resolution data;
* administrative workflow fields.

Admins may update administrative fields according to workflow rules.

---

# 13. Resolution Rules

When a report becomes `Resolved`:

```text
resolution_note
```

should normally be present.

The system should also set:

```text
resolved_at
```

The resolution image is optional but recommended for the Before/After experience.

If a resolved report becomes `Reopened`, the previous resolution history should remain intact.

---

# 14. Duplicate Rules

A report marked:

```text
status = 'Duplicate'
```

should normally contain:

```text
duplicate_of
```

pointing to the canonical report.

Avoid duplicate chains where possible.

Prefer:

```text
Report B → Report A
Report C → Report A
```

instead of:

```text
Report C → Report B → Report A
```

---

# 15. `report_status_history`

Purpose:

Store the lifecycle history of a report.

## Schema

| Column        | Type        | Rules                          |
| ------------- | ----------- | ------------------------------ |
| `id`          | UUID        | PK                             |
| `report_id`   | UUID        | not null, FK → `reports.id`    |
| `from_status` | TEXT        | nullable                       |
| `to_status`   | TEXT        | not null                       |
| `changed_by`  | UUID        | nullable, FK → `auth.users.id` |
| `note`        | TEXT        | nullable                       |
| `created_at`  | TIMESTAMPTZ | not null, default `now()`      |

Relationships:

```text
report_id
    → reports.id
    ON DELETE CASCADE
```

```text
changed_by
    → auth.users.id
    ON DELETE SET NULL
```

---

# 16. Status History Behavior

A history entry should be created for meaningful workflow changes.

Examples:

* report created;
* report verified;
* report assigned;
* work started;
* report rejected;
* report marked duplicate;
* report resolved;
* report reopened.

Initial report creation may create:

```text
from_status = NULL
to_status   = 'Reported'
```

The Issue Detail timeline should read from this table.

---

# 17. Status Change Operation

Status changes should preferably happen through one trusted database operation.

Conceptually:

```text
change_report_status(
    report_id,
    new_status,
    note
)
```

Responsibilities may include:

1. verify permission;
2. validate transition;
3. update `reports.status`;
4. create status history;
5. update `resolved_at` where applicable;
6. create relevant notifications.

These actions should occur atomically where practical.

---

# 18. `report_reactions`

Purpose:

Store meaningful civic reactions.

## Schema

| Column       | Type        | Rules                          |
| ------------ | ----------- | ------------------------------ |
| `id`         | UUID        | PK                             |
| `report_id`  | UUID        | not null, FK → `reports.id`    |
| `user_id`    | UUID        | not null, FK → `auth.users.id` |
| `type`       | TEXT        | not null                       |
| `created_at` | TIMESTAMPTZ | not null, default `now()`      |

Allowed reaction types:

```text
affected
confirmed
```

Recommended constraint:

```sql
CHECK (type IN ('affected', 'confirmed'))
```

---

# 19. Reaction Uniqueness

A user may have both:

```text
affected
confirmed
```

on the same report.

The same reaction may not be added twice.

Required uniqueness:

```text
UNIQUE(report_id, user_id, type)
```

Deleting a user's reaction should remove only that relationship.

---

# 20. Reaction Counts

For the initial implementation, reaction totals should be calculated from `report_reactions`.

Examples:

```text
affected count
confirmed count
```

Do not depend on frontend-only counters.

If cached counters are introduced later, they must be maintained through trusted database logic.

---

# 21. Existing `upvotes`

The current schema includes:

```text
upvotes
```

and:

```text
reports.upvotes_count
```

Target direction:

```text
upvotes
   ↓
report_reactions
```

For the local project, old development upvote data may be:

* migrated to `affected`; or
* discarded during a clean development reset.

Do not maintain both systems permanently.

---

# 22. `comments`

Purpose:

Store discussion attached to civic issues.

## Schema

| Column       | Type        | Rules                          |
| ------------ | ----------- | ------------------------------ |
| `id`         | UUID        | PK                             |
| `report_id`  | UUID        | not null, FK → `reports.id`    |
| `user_id`    | UUID        | not null, FK → `auth.users.id` |
| `body`       | TEXT        | not null                       |
| `created_at` | TIMESTAMPTZ | not null, default `now()`      |
| `updated_at` | TIMESTAMPTZ | not null, default `now()`      |

Relationships:

```text
comments.report_id
    → reports.id
    ON DELETE CASCADE
```

```text
comments.user_id
    → auth.users.id
```

For the course project, `ON DELETE CASCADE` is acceptable.

---

# 23. Comment Rules

Initial comment behavior:

* comments are flat;
* nested replies are not required;
* comment reactions are not required;
* comments belong to one report;
* users may edit/delete their own comments if supported;
* admins may moderate inappropriate comments.

An explicit `is_official` field is unnecessary initially.

Official styling can be derived from the author's trusted role.

---

# 24. `report_followers`

Purpose:

Store report subscriptions.

## Schema

| Column       | Type        | Rules                          |
| ------------ | ----------- | ------------------------------ |
| `report_id`  | UUID        | not null, FK → `reports.id`    |
| `user_id`    | UUID        | not null, FK → `auth.users.id` |
| `created_at` | TIMESTAMPTZ | not null, default `now()`      |

Required uniqueness:

```text
UNIQUE(report_id, user_id)
```

A separate UUID `id` is not required unless implementation convenience later justifies it.

---

# 25. Following Semantics

Following is independent of civic reactions.

A user may:

```text
follow without being affected
be affected without following
confirm without following
```

Following represents interest in receiving future updates.

---

# 26. `notifications`

Purpose:

Persist in-app notifications.

## Schema

| Column       | Type        | Rules                          |
| ------------ | ----------- | ------------------------------ |
| `id`         | UUID        | PK                             |
| `user_id`    | UUID        | not null, FK → `auth.users.id` |
| `report_id`  | UUID        | nullable, FK → `reports.id`    |
| `type`       | TEXT        | not null                       |
| `message`    | TEXT        | not null                       |
| `is_read`    | BOOLEAN     | not null, default `false`      |
| `created_at` | TIMESTAMPTZ | not null, default `now()`      |

---

# 27. Notification Events

Initial events may include:

```text
STATUS_CHANGED
NEW_COMMENT
OFFICIAL_UPDATE
REPORT_RESOLVED
REPORT_REOPENED
```

Possible recipients:

* report creator;
* report followers.

Avoid sending duplicate notifications when the creator is also a follower.

---

# 28. Notification Creation

Normal frontend users should not freely insert arbitrary notification rows.

Notifications should be created through trusted application/database workflow.

Possible mechanisms:

* database functions;
* triggers;
* trusted administrative operations.

Notifications must be stored even if the recipient is offline.

Realtime may then update the UI.

---

# 29. Location Model

Authoritative location fields:

```text
lat
lng
```

Optional display field:

```text
location_label
```

The existing `zone` field is considered legacy.

Migration direction:

```text
zone dependency
      ↓
lat/lng + location_label
```

Do not remove `zone` until existing frontend/backend logic no longer depends on it.

New features should avoid increasing dependency on `zone`.

---

# 30. Images

For the initial complete system, storing one primary image and one resolution image on the report is sufficient.

Fields:

```text
image_url
resolution_image_url
```

Files themselves live in Supabase Storage.

A separate media table is unnecessary unless multiple-image support becomes an actual requirement.

---

# 31. Timestamps

Tables with editable content should use `updated_at`.

At minimum:

```text
profiles
reports
comments
```

Prefer a reusable database trigger that automatically updates:

```text
updated_at = now()
```

on updates.

Do not rely on every frontend mutation to set this manually.

---

# 32. Recommended Indexes

Recommended indexes include:

```text
reports(user_id)
reports(status)
reports(category)
reports(created_at)
reports(department_id)

comments(report_id)

report_reactions(report_id)
report_reactions(user_id)

report_followers(user_id)

notifications(user_id, is_read)

report_status_history(report_id, created_at)
```

Advanced geospatial indexes are not required for the current project.

Duplicate detection may continue through Spring.

---

# 33. Row Level Security

RLS should be enabled on user-facing tables.

At minimum:

```text
profiles
reports
report_status_history
report_reactions
comments
report_followers
notifications
```

`departments` may be publicly readable.

---

# 34. Admin Detection

A reusable helper is recommended.

Conceptually:

```sql
EXISTS (
  SELECT 1
  FROM public.profiles
  WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
)
```

This may be wrapped in a helper such as:

```text
is_admin()
```

to simplify policies.

---

# 35. `profiles` RLS

## Read

A user must be able to read their own profile.

Limited public profile information may later be exposed if required for:

* reporter names;
* comment author names.

Sensitive authentication information must never be exposed through this table.

## Update

Users may update safe personal fields such as:

```text
full_name
avatar_url
```

Users must not be able to update:

```text
role
```

through normal client operations.

---

# 36. `reports` RLS

## Read

Reports are publicly readable.

## Insert

Authenticated users may create reports only as themselves.

The policy must enforce:

```text
user_id = auth.uid()
```

## Citizen update

A Citizen may update their own report only while:

```text
user_id = auth.uid()
AND status = 'Reported'
```

Citizens must not gain control over administrative columns.

If direct table updates cannot safely restrict columns, use a trusted RPC or another simple controlled mutation path.

## Admin update

Admins may update workflow fields.

## Delete

Citizens should not normally delete submitted reports.

Admin deletion may exist for moderation/testing, but normal workflow should prefer statuses such as:

```text
Rejected
Duplicate
```

rather than destructive deletion.

---

# 37. `report_reactions` RLS

## Read

Public read is allowed.

## Insert

Authenticated users may insert only reactions belonging to themselves:

```text
user_id = auth.uid()
```

## Delete

Users may delete only their own reactions.

Update is not required.

---

# 38. `comments` RLS

## Read

Public read is allowed.

## Insert

Authenticated users may insert only as themselves:

```text
user_id = auth.uid()
```

## Update

Users may update their own comments.

## Delete

Users may delete their own comments.

Admins may additionally moderate comments if required.

---

# 39. `report_followers` RLS

## Read

Users must be able to determine whether they personally follow a report.

A public follower list is not required.

## Insert

Authenticated users may follow only as themselves.

```text
user_id = auth.uid()
```

## Delete

Users may remove only their own follow relationship.

---

# 40. `notifications` RLS

Notifications are private.

## Read

Only:

```text
user_id = auth.uid()
```

## Update

Users may update their own notification read state.

## Insert

Normal users should not freely create arbitrary notifications.

## Delete

Not required for the core project.

---

# 41. `report_status_history` RLS

## Read

Public read is acceptable because lifecycle transparency is a core product feature.

## Insert

Normal Citizens should not manually create workflow-history entries.

History should be created through trusted status-change operations.

---

# 42. Realtime

Likely realtime-enabled tables:

```text
reports
comments
report_reactions
notifications
```

`report_status_history` may also be enabled if the issue timeline benefits from live updates.

Only enable realtime where the frontend actually uses it.

---

# 43. Database Functions

Database functions should be introduced when they preserve consistency across multiple writes.

Recommended candidate:

```text
change_report_status(...)
```

Potential responsibilities:

* validate caller;
* validate status transition;
* update report status;
* insert status history;
* set/clear resolution fields where appropriate;
* create notifications.

Optional later helper:

```text
toggle_report_reaction(...)
```

Simple direct inserts/deletes are also acceptable for reactions if they remain clean and safe.

---

# 44. Transactional Operations

Operations that modify several related records should be atomic where practical.

Example:

```text
BEGIN

update report status
insert history
create notifications

COMMIT
```

Avoid multiple unrelated browser mutations that can leave partial workflow state.

---

# 45. Storage Buckets

Supabase Storage should contain civic media.

Required use cases:

```text
report images
resolution images
```

Optional:

```text
profile avatars
```

Storage access rules should align with application permissions.

The frontend should not require privileged storage credentials.

---

# 46. Current Schema

The existing project currently includes:

```text
profiles
reports
upvotes
```

The existing `reports` table already contains core fields such as:

```text
id
title
description
category
status
zone
lat
lng
user_id
upvotes_count
image_url
created_at
```

The target schema should evolve from this existing structure rather than treating the project as greenfield.

---

# 47. Migration Direction

The main schema evolution is:

```text
profiles
    → secure role assignment
    → add profile fields as needed

reports
    → add location_label
    → add department
    → add duplicate relation
    → add resolution fields
    → add updated_at

upvotes
    → replace with report_reactions

new:
    departments
    report_status_history
    comments
    report_followers
    notifications
```

Do not add all changes at once unless the roadmap phase requires them.

---

# 48. Migration Files

Preferred structure:

```text
supabase/
├── schema.sql
├── migrations/
└── seed.sql
```

Possible migration naming:

```text
001_foundation.sql
002_issue_workflow.sql
003_community.sql
004_notifications.sql
```

Exact names are flexible.

The important rule is that meaningful database changes should be explicit and repeatable.

---

# 49. Development Resets

Because this is a local university project, preserving early test data is not always necessary.

During early development, a clean database reset is acceptable when it substantially simplifies schema changes.

Once useful demo data exists, prefer incremental migrations.

Do not repeatedly destroy demo data late in development.

---

# 50. Seed Data

`seed.sql` should eventually prepare useful reference/demo data.

At minimum:

* departments.

Before the final presentation, demo data should cover multiple workflow states, for example:

```text
Reported
Verified
Assigned
In Progress
Resolved
Duplicate
```

Useful demo relationships should also exist:

* comments;
* reactions;
* followers;
* history;
* notifications;
* resolution evidence.

---

# 51. Data Deletion

Civic Pulse values issue history and accountability.

Prefer state changes over deletion where practical.

Examples:

```text
Rejected
Duplicate
```

Deletion remains appropriate for:

* spam;
* inappropriate content;
* accidental development data.

---

# 52. Database Naming

Use:

```text
snake_case
```

for tables and columns.

Tables should normally use plural names.

Examples:

```text
report_reactions
report_followers
report_status_history
```

Foreign-key columns should use:

```text
<entity>_id
```

Examples:

```text
user_id
report_id
department_id
```

---

# 53. Shared Database/Frontend Contract

The frontend must use canonical values matching the database.

At minimum, centrally define:

```text
USER_ROLES
REPORT_STATUSES
REPORT_CATEGORIES
REACTION_TYPES
NOTIFICATION_TYPES
```

Do not allow separate components to invent their own variants.

---

# 54. Database Anti-Patterns

Avoid:

### User-controlled admin role

```text
signup metadata → admin
```

### Missing ownership checks

Authenticated users inserting another user's `user_id`.

### Client-only counters

React state acting as permanent reaction/upvote totals.

### Fake lifecycle history

Generating timeline events solely from the current status.

### Parallel reaction models

Maintaining:

```text
likes
upvotes
affected
confirmed
```

as separate overlapping concepts.

### Text relationships

Storing department names repeatedly instead of using `department_id`.

### Partial workflow updates

Updating status but failing to create history or notifications.

---

# 55. Phase Alignment

Database implementation should follow the roadmap.

## Foundation

* secure profile creation;
* role protection;
* report ownership rules;
* citizen editing rules;
* persistent reactions.

## Issue Workflow

* report extensions;
* departments;
* status history;
* status-change operation;
* resolution fields.

## Community

* comments;
* final reaction model;
* followers.

## Notifications

* notifications table;
* notification-generation logic.

Later phases should require minimal structural changes.

---

# 56. Target Schema Summary

```text
profiles
    user identity + role

departments
    civic department reference data

reports
    central civic issue

report_status_history
    lifecycle audit trail

report_reactions
    affected + confirmed

comments
    community discussion

report_followers
    subscriptions

notifications
    persistent user alerts
```

---

# 57. Database Decision Rule

Before adding a field or table, ask:

> Is this persistent information the system must remember?

If yes, it belongs in the database.

Before adding a table, ask:

> Does this represent a real entity or relationship with its own lifecycle?

If not, prefer the existing model.

Before allowing a client mutation, ask:

> Could a user manually call this operation outside the UI?

If yes, enforce the rule with RLS or trusted database logic.

The database should remain the authoritative source of truth for Civic Pulse.
