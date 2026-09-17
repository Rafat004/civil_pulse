# Civic Pulse — Agent Instructions

This file contains repository-wide instructions for AI coding agents.

## 1. Read Before Coding

Before substantial work, read:

* `docs/PRODUCT_SPEC.md` — product behavior and scope
* `docs/ARCHITECTURE.md` — technical architecture and responsibility boundaries
* `docs/DATABASE.md` — schema, relationships, RLS, and data rules
* `docs/ROADMAP.md` — implementation phases and current progress

When working inside `frontend/`, also follow `frontend/AGENTS.md`.

Do not guess project behavior when it is already defined in these documents.

---

## 2. Architecture

Civic Pulse uses:

* Next.js + React + TypeScript for the frontend
* Supabase for PostgreSQL, Auth, Storage, Realtime, and RLS
* Spring Boot for intelligence and specialized computation

Responsibility rule:

* Next.js → presentation and interaction
* Supabase → persistent state, relationships, storage, and authorization
* Spring Boot → analysis, similarity, classification, and recommendations

Do not create duplicate CRUD APIs in Spring for operations already handled safely through Supabase.

---

## 3. Project Scope

This is a local university course project.

Prioritize:

1. correct behavior
2. data integrity
3. authorization correctness
4. simplicity
5. maintainability
6. demo quality

Do not introduce production-scale infrastructure unless explicitly requested.

---

## 4. Implementation Workflow

Implementation is phase-based.

When asked to implement a phase:

1. read the relevant docs;
2. inspect the existing implementation;
3. identify what already works;
4. implement only the requested phase;
5. preserve unrelated working functionality;
6. run relevant validation;
7. verify the phase acceptance criteria;
8. update `docs/ROADMAP.md` only when the phase is actually complete.

Do not implement future roadmap phases unless explicitly requested.

---

## 5. Existing Code

Civic Pulse is not a greenfield project.

Prefer extending or correcting existing functionality over rewriting it.

Do not:

* replace working features unnecessarily;
* perform unrelated large refactors;
* rename/reorganize the project solely for stylistic preference;
* replace the existing stack because external example code uses another stack.

Refactor when it directly supports the current task.

---

## 6. Frontend Rules

Prefer:

* reusable feature components;
* centralized domain types;
* centralized constants;
* service modules for substantial Supabase operations;
* explicit loading/error/empty states.

Avoid:

* giant page components containing all business logic;
* duplicate domain interfaces;
* raw status/category strings scattered through components;
* client-only persistence.

Frontend permission checks are for UX only.

Supabase RLS remains authoritative.

---

## 7. Database Rules

Before modifying the schema, read `docs/DATABASE.md`.

Important rules:

* normal signup creates `civic` users only;
* clients cannot grant themselves admin privileges;
* ownership must be enforced by RLS;
* important relationships use foreign keys;
* persistent state must be database-backed;
* lifecycle changes must create real history;
* client-side counters are not authoritative;
* schema changes should use explicit migrations.

Do not invent new statuses, roles, categories, or reaction types without updating the project contract.

---

## 8. Spring Boot Rules

Spring Boot is for specialized intelligence such as:

* duplicate detection;
* similarity scoring;
* category recommendation;
* department recommendation;
* analytics.

Prefer typed request/response models and structured JSON.

Do not make Spring the primary CRUD layer.

Smart features should provide recommendations; users or administrators make final decisions.

---

## 9. External Code

External repositories and libraries may be used when helpful.

Before integrating external code:

* understand what it does;
* verify licensing;
* adapt it to Civic Pulse;
* preserve the existing architecture.

Do not import another project's architecture wholesale.

---

## 10. Dependencies

Prefer existing dependencies.

Add a new dependency only when it clearly reduces implementation complexity or provides substantial value.

Avoid packages for trivial functionality.

---

## 11. Configuration and Secrets

Do not hardcode environment-specific values throughout components.

Use project environment configuration where appropriate.

Never expose privileged server credentials in frontend code.

Public Supabase client credentials may be used as intended with correct RLS.

---

## 12. Validation

After substantial frontend changes, run from `frontend/`:

```bash
npm run build
```

After substantial backend changes, run from `backend/`:

```bash
./mvnw test
```

Run additional relevant checks when available.

Do not claim a phase is complete if required validation fails.

---

## 13. Documentation

Keep documentation aligned with implementation.

Update `docs/ROADMAP.md` when a phase becomes complete.

If an implementation intentionally changes an architectural or database decision, update the corresponding documentation.

Do not silently let code and documentation diverge.

---

## 14. Scope Discipline

Avoid solving problems that were not requested.

When working on one feature, do not use it as an excuse to rewrite unrelated parts of the project.

Prefer the smallest coherent change that satisfies the requested phase while remaining compatible with the documented future architecture.

---

## 15. Final Rule

Understand the full Civic Pulse vision.

Implement only the current requested phase.

Preserve this responsibility boundary:

**Next.js → UI**

**Supabase → application truth**

**Spring Boot → intelligence**

And preserve the product flow:

**REPORT → VERIFY → DISCUSS → ACT → RESOLVE**
