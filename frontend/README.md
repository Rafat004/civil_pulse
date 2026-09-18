# Civic Pulse frontend

The frontend is a Next.js App Router application. It uses Supabase directly for authentication, persistent application data, storage, realtime updates, and RLS-enforced authorization. The Spring Boot service supplies advisory intelligence and analytics only.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_BASE_URL` in `.env.local`. Never put a Supabase service-role key in frontend configuration.

The app is available at [http://localhost:3000](http://localhost:3000). The Spring service defaults to `http://localhost:8082`.

## Validation

```bash
npm run lint
npm run build
```

For the reproducible two-account demo, database fixture, and presentation path, follow [the demo runbook](../docs/DEMO_RUNBOOK.md).
