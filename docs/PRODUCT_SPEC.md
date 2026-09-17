# Civic Pulse — Product Specification

**File:** `docs/PRODUCT_SPEC.md`
**Project:** Civic Pulse
**Type:** University course project
**Environment:** Local demonstration
**Purpose:** Product source of truth

---

## 1. Product Summary

Civic Pulse is a community-driven platform for reporting, discovering, discussing, tracking, and resolving local civic issues.

Citizens can report problems such as potholes, damaged roads, broken streetlights, garbage accumulation, drainage problems, water leaks, and damaged public infrastructure.

Each issue is tied to a real-world location and may contain photographic evidence.

Other citizens can discover the issue, confirm that it exists, indicate that they are affected, comment on it, follow its progress, and see how authorities respond.

Administrators review incoming reports, verify valid issues, identify duplicates, assign issues to departments, update their status, communicate progress, and document their resolution.

The core Civic Pulse workflow is:

**REPORT → VERIFY → DISCUSS → ACT → RESOLVE**

---

## 2. Product Vision

Civic Pulse should make local civic problems:

* easy to report;
* easy to discover;
* difficult to duplicate unnecessarily;
* open to useful community participation;
* transparent throughout their lifecycle;
* visibly connected to administrative action;
* publicly trackable through resolution.

The product should feel like an **issue-tracking community**, not a generic social network.

The central object is the **Civic Issue**, not the user.

Community features exist to improve civic reporting and accountability.

---

## 3. Product Principles

### 3.1 Issues over popularity

Civic Pulse should prioritize useful civic information rather than generic engagement.

Prefer:

* people affected;
* citizen confirmations;
* comments;
* status;
* department;
* resolution progress;

over generic social-media metrics such as likes.

### 3.2 Public progress

A user should be able to understand what happened to an issue after it was reported.

Important changes should remain visible in the issue history.

### 3.3 Community verification

Citizens should help establish whether a reported issue is genuine, widespread, or already known.

### 3.4 Resolution matters

Reporting a problem is only the beginning.

The product should make resolution and evidence of resolution highly visible.

### 3.5 Simple before complex

Features should support the core civic workflow.

Features that add complexity without improving reporting, collaboration, administration, or accountability should remain optional.

---

# 4. User Roles

Civic Pulse initially supports two roles:

* Citizen
* Administrator

Additional roles should not be introduced unless the product later requires them.

---

## 4.1 Citizen

A Citizen can:

* register and log in;
* browse public civic issues;
* report a new issue;
* choose an issue category;
* write a description;
* choose the issue location on a map;
* upload image evidence;
* open an issue's detail page;
* indicate that they are affected;
* confirm an observed issue;
* comment on issues;
* follow and unfollow issues;
* receive notifications;
* view their own reports;
* track report progress;
* edit their own report while it is still eligible for editing.

Citizens cannot perform administrative workflow actions.

---

## 4.2 Administrator

An Administrator can:

* view all submitted issues;
* review new reports;
* verify reports;
* reject invalid reports;
* identify and mark duplicate reports;
* assign issues to departments;
* change issue status;
* publish official updates;
* record resolution information;
* upload resolution evidence;
* reopen issues when appropriate;
* perform basic moderation;
* view administrative statistics.

Administrator accounts are controlled accounts and are not obtained through normal public signup.

---

# 5. Civic Issue

The Civic Issue is the main domain object in Civic Pulse.

An issue should contain enough information to answer:

* What is wrong?
* Where is it?
* What type of problem is it?
* Who reported it?
* When was it reported?
* What evidence exists?
* How many people are affected?
* Has the community confirmed it?
* What is its current status?
* Which department is responsible?
* What has happened since it was reported?
* Has it been resolved?

Major application surfaces should ultimately lead back to an issue.

Examples:

```text
Home Feed ───────┐
Map ─────────────┤
My Reports ──────┼──► Issue Detail
Notifications ──┤
Admin Workspace ─┘
```

---

# 6. Issue Categories

Initial categories:

1. **Roads & Infrastructure**

   * potholes;
   * damaged roads;
   * broken sidewalks;
   * damaged signs;
   * damaged public infrastructure.

2. **Waste & Sanitation**

   * garbage accumulation;
   * illegal dumping;
   * missed waste collection;
   * sanitation problems.

3. **Water & Drainage**

   * blocked drains;
   * waterlogging;
   * flooding;
   * water leaks;
   * sewer problems.

4. **Electricity & Lighting**

   * broken streetlights;
   * damaged public electrical infrastructure.

5. **Public Safety**

   * dangerous public infrastructure;
   * hazardous road conditions;
   * other civic safety hazards.

6. **Parks & Public Spaces**

   * damaged park facilities;
   * damaged public amenities;
   * maintenance problems.

7. **Other**

   * valid civic issues that do not fit an existing category.

Subcategories are optional and may be added later if useful.

---

# 7. Issue Lifecycle

The primary issue lifecycle is:

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

Additional outcomes:

```text
Rejected
Duplicate
Reopened
```

---

## 7.1 Reported

The citizen has submitted the issue.

It has not yet been formally reviewed by an administrator.

---

## 7.2 Verified

An administrator has reviewed the report and accepted it as a valid civic issue.

---

## 7.3 Assigned

The issue has been assigned to an appropriate department.

---

## 7.4 In Progress

Action on the issue has started.

---

## 7.5 Resolved

The issue has been addressed.

A resolved issue should include a resolution explanation and may include visual evidence.

---

## 7.6 Rejected

The report was determined to be invalid, inappropriate, or outside the intended civic-reporting scope.

A reason should be recorded when practical.

---

## 7.7 Duplicate

The report describes an issue already represented by another Civic Pulse issue.

The duplicate should point users toward the original issue.

---

## 7.8 Reopened

A previously resolved issue has returned or was not actually resolved.

---

# 8. Issue History

Important lifecycle events should remain visible.

Example:

```text
17 Sep — Issue reported
17 Sep — Verified
18 Sep — Assigned to Roads & Infrastructure
19 Sep — Work started
22 Sep — Resolution evidence added
22 Sep — Resolved
```

The Issue Detail page should provide a clear chronological history.

The current status tells users **where the issue is now**.

The history tells users **how it got there**.

---

# 9. Reporting an Issue

A logged-in Citizen should be able to submit a civic issue.

Required information:

* title;
* category;
* description;
* location.

Optional evidence:

* image.

The submission experience should be simple enough to complete quickly.

---

## 9.1 Location Selection

The report form should provide an interactive map.

The Citizen should be able to:

* search for a location;
* navigate the map;
* click the map to place a marker;
* clearly see the selected location.

The geographic coordinates represent the issue location.

---

## 9.2 Image Evidence

Citizens may attach a photo of the issue.

Image evidence should be shown on the Issue Detail page.

For the core project, one primary issue image is sufficient.

Multiple-image galleries are optional.

---

# 10. Duplicate Prevention

Civic Pulse should reduce unnecessary duplicate reports.

Before a new report is finalized, the system should search for potentially similar nearby issues.

Similarity may consider:

* location;
* category;
* title;
* description.

Possible matches should be presented to the Citizen.

Example:

```text
Possible existing issue

Large pothole beside University Gate
42 meters away
31 people affected

[This is the same issue]
[This is a different issue]
```

If it is the same issue, the Citizen should be encouraged to interact with the existing issue rather than create another one.

Duplicate detection should provide recommendations, not make irreversible decisions automatically.

Administrators may also mark reports as duplicates.

---

# 11. Civic Reactions

Civic Pulse should use civic-specific reactions.

Initial reaction types:

### I'm Affected

The Citizen indicates that the issue affects them or their local area.

### I Can Confirm

The Citizen confirms that they have personally observed the problem.

An issue may display:

```text
42 affected
27 confirmed
```

A Citizen may use both reaction types on the same issue, but may not repeatedly add the same reaction.

Generic likes are not required.

---

# 12. Comments

Citizens should be able to discuss an issue.

Useful comments may include:

* additional evidence;
* local context;
* updates;
* questions;
* confirmation;
* clarification.

Administrators may also comment.

Administrator comments should be visually distinguishable as official communication.

For the core version:

* comments are flat;
* nested replies are not required;
* comment likes/reactions are not required.

---

# 13. Following Issues

Citizens should be able to follow issues they care about.

Following an issue means the Citizen wants updates about its progress.

A Citizen should be able to:

* follow an issue;
* unfollow an issue;
* see relevant notifications.

Following is separate from being affected by or confirming an issue.

---

# 14. Notifications

Civic Pulse should provide persistent in-app notifications.

The interface should support:

* notification bell;
* unread count;
* notification list;
* read/unread state;
* opening the related issue.

Important notification events may include:

* status changes;
* issue verification;
* department assignment;
* official updates;
* new comments on followed issues;
* resolution;
* reopening.

Notifications are primarily relevant to:

* the original reporter;
* users following the issue.

---

# 15. Issue Detail Page

The Issue Detail page is the central screen for an issue.

Route concept:

```text
/issues/[id]
```

It should contain the following sections.

### Issue Header

* title;
* category;
* current status;
* report date.

### Evidence

* original image when available.

### Description

* complete issue description.

### Location

* readable location when available;
* map showing the issue position.

### Community Activity

* affected count;
* confirmed count;
* follow control;
* comments.

### Responsibility

* assigned department when available.

### Progress

* status history;
* official updates.

### Resolution

When resolved:

* resolution note;
* resolution date;
* resolution image when available.

A resolved issue should clearly communicate the transition:

**Before → After**

---

# 16. Public Feed

The application should provide a public feed for discovering civic issues.

Initial sorting options:

* Latest;
* Most Affected;
* Recently Updated.

Possible later options:

* Nearby;
* Following;
* Recently Resolved.

A feed card should contain:

* title;
* category;
* short description;
* image when available;
* location;
* status;
* affected count;
* comment count;
* relative time/date.

Selecting a feed item should open the Issue Detail page.

---

# 17. Public Map

The Civic Pulse map serves two purposes:

### Reporting

Choose the location of a new civic issue.

### Discovery

Browse existing civic issues geographically.

The public map should support:

* issue markers;
* useful marker popups;
* category filtering;
* status filtering;
* map search;
* navigation to Issue Detail pages.

Useful enhancements include:

* marker clustering;
* current location;
* nearby issues.

Heatmaps are optional.

---

# 18. My Reports

Citizens should have a dedicated page for reports they created.

The page should show:

* total reports;
* report status;
* recent activity;
* resolution state.

Each report should link to its Issue Detail page.

A Citizen may edit their own report while it is still in the initial `Reported` state.

After administrative processing begins, normal Citizen editing should stop.

---

# 19. Admin Workspace

The administrative experience should focus on managing civic issues.

The workspace should eventually contain:

### Overview

Useful operational information such as:

* total open issues;
* reported issues;
* verified issues;
* issues in progress;
* resolved issues;
* recent activity;
* common categories;
* oldest unresolved issues.

### Report Management

Administrators should be able to:

* search;
* filter;
* inspect reports;
* verify;
* reject;
* assign;
* change status;
* mark duplicates;
* resolve;
* reopen when required.

### Resolution Workflow

Resolving an issue should support:

* resolution note;
* optional after-photo.

Resolution information becomes visible publicly.

---

# 20. Departments

Civic Pulse uses simple administrative departments to demonstrate issue routing.

Initial departments:

* Roads & Infrastructure;
* Waste Management;
* Water & Drainage;
* Electricity & Lighting;
* Public Safety;
* Parks & Public Spaces.

A report may be assigned to one department.

Departments are operational entities, not user roles.

Real government integration is outside the course-project scope.

---

# 21. Smart Features

Smart features enhance Civic Pulse but are not required for the core workflow.

They should be implemented only after the core product works reliably.

Potential smart features:

### Duplicate Detection

Suggest existing reports describing the same problem.

### Category Suggestion

Suggest an appropriate issue category from the description.

### Department Recommendation

Suggest which department should handle an issue.

### Title Suggestion

Suggest a concise title from a longer description.

### Discussion Summary

Summarize useful information from a long issue discussion.

Smart features provide **suggestions**.

Citizens or administrators make the final decisions.

---

# 22. Realtime Behavior

Where useful, Civic Pulse should update without requiring manual refresh.

Useful realtime events include:

* newly submitted issues;
* status changes;
* new comments;
* reaction changes;
* notifications.

Realtime behavior improves usability but must not be required for persistent correctness.

Refreshing the page should always restore the correct application state.

---

# 23. Local Project Scope

Civic Pulse is a local university course project.

Production deployment is not required.

The project should prioritize:

* working features;
* clean architecture;
* correct data relationships;
* logical permissions;
* good demonstration experience.

The project does not need production-level work for:

* cloud hosting;
* CI/CD;
* large-scale performance;
* autoscaling;
* enterprise monitoring;
* distributed infrastructure.

---

# 24. Demo Administration

Normal registration creates Citizen accounts.

Normal users must not be able to grant themselves Administrator privileges.

For local demonstration purposes, Administrator accounts may be prepared manually or through project setup/seed processes.

The demo should make switching between Citizen and Administrator workflows practical without weakening normal role behavior.

---

# 25. Basic Safety and Moderation

Civic Pulse should avoid exposing unnecessary personal information.

Public content should focus primarily on civic issues.

Administrators should eventually be able to moderate clearly inappropriate:

* reports;
* comments.

The application should communicate that Civic Pulse is for civic issue reporting and is not an emergency-response service.

Advanced moderation systems are not required.

---

# 26. Core User Journeys

## 26.1 Report a New Issue

```text
Citizen logs in
      ↓
Chooses Report Issue
      ↓
Adds title/category/description
      ↓
Selects location
      ↓
Adds optional image
      ↓
System checks possible duplicates
      ↓
Citizen confirms submission
      ↓
Issue created as Reported
```

---

## 26.2 Join an Existing Issue

```text
Citizen discovers issue
      ↓
Opens Issue Detail
      ↓
Reads evidence and status
      ↓
Marks Affected / Confirms
      ↓
Optionally comments
      ↓
Follows issue
```

---

## 26.3 Administrative Workflow

```text
Admin reviews Reported issue
      ↓
Verifies or rejects
      ↓
Assigns department
      ↓
Marks In Progress
      ↓
Posts updates if needed
      ↓
Adds resolution information
      ↓
Marks Resolved
```

---

## 26.4 Duplicate Workflow

```text
Citizen begins new report
      ↓
Similar nearby issue found
      ↓
Citizen reviews existing issue
      ↓
Same issue?
   ┌──┴──┐
  Yes    No
   │      │
   ▼      ▼
Interact  Continue
with      new
existing  report
issue
```

---

## 26.5 Reopening

```text
Issue resolved
      ↓
Problem still exists / returns
      ↓
Administrator reviews evidence
      ↓
Issue becomes Reopened
      ↓
Work continues
```

---

# 27. Feature Priorities

## Must Have

* authentication;
* Citizen/Admin distinction;
* issue creation;
* categories;
* map location selection;
* image evidence;
* public issue discovery;
* Issue Detail page;
* issue lifecycle;
* status history;
* admin workflow;
* comments;
* affected reaction;
* confirmation reaction;
* resolution information.

## Should Have

* following;
* notifications;
* departments;
* duplicate detection;
* map filters;
* realtime updates;
* basic admin analytics.

## Wow Features

* Before/After resolution;
* improved duplicate suggestions;
* smart category suggestion;
* department recommendation;
* map clustering;
* discussion summaries.

## Lowest Priority

* news scanning;
* heatmaps;
* advanced analytics;
* complex reputation systems;
* nested comments;
* additional administrative roles.

---

# 28. Explicitly Out of Scope

Civic Pulse is not intended to become a general-purpose social network.

The following are outside the core scope:

* private messaging;
* friends;
* following other users;
* user timelines/walls;
* stories;
* social groups;
* hashtags as a major system;
* competitive leaderboards;
* complex reputation scoring;
* deeply nested comment threads;
* reactions to comments;
* payments;
* native mobile applications;
* real municipal/government integrations;
* production deployment infrastructure.

These features should not be added merely because another project contains them.

---

# 29. Demo Scenario

The finished application should be able to demonstrate this complete story:

```text
A citizen notices a pothole.
        ↓
They open Civic Pulse and report it.
        ↓
They choose Roads & Infrastructure.
        ↓
They select the map location.
        ↓
They upload a photo.
        ↓
Civic Pulse checks for nearby duplicates.
        ↓
The issue is submitted.
        ↓
Other citizens find it.
        ↓
Citizens confirm it and mark themselves affected.
        ↓
Citizens discuss the problem.
        ↓
An administrator verifies it.
        ↓
It is assigned to Roads & Infrastructure.
        ↓
The status becomes In Progress.
        ↓
Followers receive updates.
        ↓
The administrator records the resolution.
        ↓
An after-photo is uploaded.
        ↓
The issue becomes Resolved.
        ↓
Anyone can see the full history and Before/After result.
```

This scenario represents the intended end-to-end Civic Pulse experience.

---

# 30. Product Completion Criteria

The core product is considered successful when:

1. Citizens can register and authenticate.
2. Citizens can create geographically located issues.
3. Image evidence can be attached.
4. Reports persist correctly.
5. Reports can be discovered through the feed and map.
6. Every report has a dedicated Issue Detail page.
7. Citizens can indicate that they are affected.
8. Citizens can confirm issues.
9. Citizens can comment.
10. Citizens can follow issues.
11. Administrators can manage the issue lifecycle.
12. Administrative actions create visible issue history.
13. Departments can be assigned.
14. Duplicate issues can be identified or managed.
15. Resolution information can be recorded.
16. Resolved issues can show Before/After evidence.
17. Notifications communicate important progress.
18. The complete demo scenario can be performed reliably.

---

# 31. Product Decision Rule

When considering a new feature, ask:

> Does this meaningfully improve reporting, verification, community understanding, administrative action, or transparent resolution?

If yes, it may belong in Civic Pulse.

If not, it should remain optional or out of scope.

The product should remain centered on:

**REPORT → VERIFY → DISCUSS → ACT → RESOLVE**
