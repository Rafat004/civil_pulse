# Civic Pulse Demo Runbook

This runbook prepares a repeatable local demonstration without weakening signup authorization.

## One-time setup

1. Apply `supabase/schema.sql` (or all migrations in order) to the project.
2. In Supabase Auth, create these two email/password users:
   - Citizen: `citizen.demo@civicpulse.test`
   - Administrator: `admin.demo@civicpulse.test`
3. Choose the passwords privately. Do not commit them to the repository.
4. Run `supabase/demo_seed.sql` in the Supabase SQL editor. The fixture is safe to rerun for its fixed demo records.
5. Copy `frontend/.env.example` to `frontend/.env.local` and fill in the public Supabase values and API URL.
6. Export the backend values from `backend/.env.example` (or configure equivalent environment variables).

## Start the application

```bash
cd backend
./mvnw spring-boot:run

# in a second terminal
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Presentation flow

1. Sign in as the Citizen and open the public feed.
2. Create a report with a map location and photo evidence.
3. Show the advisory duplicate review and choose either an existing issue or a new report.
4. Open an issue, add `Affected`/`Confirmed`, post a comment, and follow it.
5. Sign out and sign in as the Administrator.
6. Open Approvals, verify a report, assign a department, and advance it to In Progress.
7. Open the issue detail page and post an official update.
8. Return to the Citizen account and show the notification.
9. Resolve the seeded in-progress issue with a resolution note and after-photo.
10. Show the lifecycle history and Before/After evidence on Issue Detail.

The fixture includes examples for Reported, Verified, Assigned, In Progress, Resolved, and Duplicate states, plus comments, reactions, followers, notifications, and history.
